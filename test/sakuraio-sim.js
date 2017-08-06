const fs = require('fs')

const CRC32 = require('crc-32')

const SakuraIO = require('../sakuraio')
const C = require('../src/commands')
const Util = require('../src/util')

const SEND_STATE = {
  WAITING_COMMAND: Symbol('WAITING_COMMAND'),
  WAITING_REQUEST_LENGTH: Symbol('WAITING_REQUEST_LENGTH'),
  WAITING_NEXT_REQUEST_BYTE: Symbol('WAITING_NEXT_REQUEST_BYTE'),
  WAITING_PARITY_BYTE: Symbol('WAITING_PARITY_BYTE')
}
const RECEIVE_STATE = {
  WILL_SEND_RESULT: Symbol('WILL_SEND_RESULT'),
  WILL_SEND_RESPONSE_LENGTH: Symbol('WILL_SEND_RESPONSE_LENGTH'),
  WILL_SEND_NEXT_RESPONSE_BYTE: Symbol('WILL_SEND_NEXT_RESPONSE_BYTE'),
  WILL_SEND_PARITY_BYTE: Symbol('WILL_SEND_PARITY_BYTE')
}

// Create a standard RxQueue with all types of elements to work with
function createRxQueue42 () {
  var int32 = Buffer.alloc(18)
  var uint32 = Buffer.alloc(18)
  var int64 = Buffer.alloc(18)
  var uint64 = Buffer.alloc(18)
  var float32 = Buffer.alloc(18)
  var float64 = Buffer.alloc(18)
  var array64 = Buffer.alloc(18)
  int32[0] = 0x00
  uint32[0] = 0x01
  int64[0] = 0x02
  uint64[0] = 0x03
  float32[0] = 0x04
  float64[0] = 0x05
  array64[0] = 0x06
  int32[1] = C.TYPE_32BIT_SIGNED_INT
  uint32[1] = C.TYPE_32BIT_UNSIGNED_INT
  int64[1] = C.TYPE_64BIT_SIGNED_INT
  uint64[1] = C.TYPE_64BIT_UNSIGNED_INT
  float32[1] = C.TYPE_32BIT_FLOAT
  float64[1] = C.TYPE_64BIT_FLOAT
  array64[1] = C.TYPE_8BYTE_ARRAY
  int32.writeInt32LE(42, 2)
  uint32.writeUInt32LE(42, 2)
  // No setInt64 available, however we get the same result as long as the number is not too big
  int64.writeInt32LE(42, 2)
  uint64.writeUInt32LE(42, 2)
  float32.writeFloatLE(42, 2)
  float64.writeDoubleLE(42, 2)
  Buffer.from('Hello42!').copy(array64, 2)
  int32[10] = 42
  uint32[10] = 42
  int64[10] = 42
  uint64[10] = 42
  float32[10] = 42
  float64[10] = 42
  array64[10] = 42
  return [int32, uint32, int64, uint64, float32, float64, array64]
}

function createBus () {
  var queueLength = 0
  var RxQueue = createRxQueue42()
  var fileId, fileDownloadCursor
  const CMDS = {
    [C.CMD_GET_CONNECTION_STATUS]: function () {
      return Buffer.from([C.CONNECTION_STATUS_ERROR_NONE])
    },
    [C.CMD_GET_SIGNAL_QUALITY]: function () {
      return Buffer.from([C.SIGNAL_QUALITY_VERY_STRONG])
    },
    [C.CMD_GET_DATETIME]: function () {
      var now = Date.now()
      return Util.numberToUnsignedInt64Buffer(now)
    },
    [C.CMD_ECHO_BACK]: function (request) {
      return Buffer.from(request)
    },
    [C.CMD_TX_ENQUEUE]: function (request) {
      queueLength += 1
      if (request[0] > 0x7F) {
        throw new Error(`Channel cannot be set to 128 or more. Got ${request[0]}`)
      } else if ([C.TYPE_32BIT_SIGNED_INT, C.TYPE_32BIT_UNSIGNED_INT,
        C.TYPE_64BIT_SIGNED_INT, C.TYPE_64BIT_UNSIGNED_INT,
        C.TYPE_32BIT_FLOAT, C.TYPE_64BIT_FLOAT,
        C.TYPE_8BYTE_ARRAY].indexOf(request[1]) < 0) {
        throw new Error(`Incorrect type given: ${request[1]}`)
      } else if (request.length !== 10 && request.length !== 18) {
        throw new Error(`Unexpected length of request: ${request}`)
      }
      return Buffer.alloc(0)
    },
    [C.CMD_TX_SENDIMMED]: function (request) {
      for (var i = 0; i < Math.floor(request.length / 10); i++) {
        var subrequest = request.slice(10 * i, 10 * (i + 1))
        CMDS[C.CMD_TX_ENQUEUE](subrequest)
        // Decrement the queue wrongly incremented in previous function
        queueLength -= 1
      }
      subrequest = request.slice(10 * i, 10 * (i + 1))
      if (subrequest.length !== 0 && subrequest.length !== 8) {
        throw new Error(`Unexpected length of request: ${request}`)
      }
      return Buffer.alloc(0)
    },
    [C.CMD_TX_LENGTH]: function () {
      return Buffer.from([16 - queueLength, queueLength])
    },
    [C.CMD_TX_CLEAR]: function () {
      queueLength = 0
      return Buffer.alloc(0)
    },
    [C.CMD_TX_SEND]: function () {
      queueLength = 0
      return Buffer.alloc(0)
    },
    [C.CMD_TX_STAT]: function () {
      return Buffer.from([C.TX_STAT_NONE, C.TX_STAT_NONE])
    },
    [C.CMD_RX_DEQUEUE]: function () {
      return RxQueue.shift()
    },
    [C.CMD_RX_PEEK]: function () {
      return RxQueue[0]
    },
    [C.CMD_RX_LENGTH]: function () {
      return Buffer.from([0, RxQueue.length])
    },
    [C.CMD_RX_CLEAR]: function () {
      RxQueue = []
      return Buffer.alloc(0)
    },
    [C.CMD_START_FILE_DOWNLOAD]: function (request) {
      fileId = request.readIntLE(0, 2)
      fileDownloadCursor = 0
      return Buffer.alloc(0)
    },
    [C.CMD_GET_FILE_METADATA]: function () {
      var response = Buffer.alloc(0x11)
      var path = `${__dirname}/fixtures/files/${fileId}`
      try {
        var stats = fs.statSync(path)
        var content = fs.readFileSync(path)
        response[0] = 0x00 // assume 0x00 is for success
        response.writeUIntLE(content.length, 1, 4)
        var fileSizeBuf = Util.numberToUnsignedInt64Buffer(Math.floor(stats.birthtimeMs))
        fileSizeBuf.copy(response, 5)
        response.writeIntLE(CRC32.buf(content), 13, 4)
      } catch (e) {
        response[0] = C.FILE_STATUS_NOTFOUND
      }
      return response
    },
    [C.CMD_GET_FILE_DOWNLOAD_STATUS]: function () {
      var response = Buffer.alloc(5)
      if (fileId !== undefined) {
        response[0] = C.FILE_DOWNLOAD_STATUS_RECEIVING
      } else {
        response[0] = C.FILE_DOWNLOAD_STATUS_UNKNOWN
      }
      response.writeIntLE(3, 1, 4)
      return response
    },
    [C.CMD_CANCEL_FILE_DOWNLOAD]: function () {
      fileId = undefined
      return Buffer.alloc(0)
    },
    [C.CMD_GET_FILE_DATA]: function (request) {
      var content = fs.readFileSync(`${__dirname}/fixtures/files/${fileId}`)
      var response = content.slice(fileDownloadCursor,
                                   fileDownloadCursor + request[0])
      fileDownloadCursor += request[0]
      return response
    }
  }

  var currentCmd
  var requestBuf
  var requestByteCount
  var parity
  var result
  var responseBuf
  var responseByteCount
  var currentSendState = SEND_STATE.WAITING_COMMAND
  var currentReceiveState = RECEIVE_STATE.WILL_SEND_RESULT
  function sendByteSync (byte) {
    switch (currentSendState) {
      case SEND_STATE.WAITING_COMMAND:
        currentCmd = byte
        currentSendState = SEND_STATE.WAITING_REQUEST_LENGTH
        break
      case SEND_STATE.WAITING_REQUEST_LENGTH:
        requestBuf = Buffer.alloc(byte)
        parity = currentCmd ^ requestBuf.length
        if (requestBuf.length === 0x00) {
          currentSendState = SEND_STATE.WAITING_PARITY_BYTE
        } else {
          currentSendState = SEND_STATE.WAITING_NEXT_REQUEST_BYTE
        }
        requestByteCount = 0
        break
      case SEND_STATE.WAITING_NEXT_REQUEST_BYTE:
        parity ^= byte
        requestBuf[requestByteCount] = byte
        requestByteCount += 1
        if (requestByteCount === requestBuf.length) {
          currentSendState = SEND_STATE.WAITING_PARITY_BYTE
        }
        break
      case SEND_STATE.WAITING_PARITY_BYTE:
        parity ^= byte
        currentSendState = SEND_STATE.WAITING_COMMAND
        break
    }
  }
  function receiveByteSync () {
    switch (currentReceiveState) {
      case RECEIVE_STATE.WILL_SEND_RESULT:
        if (!currentCmd || !CMDS[currentCmd]) {
          result = C.CMD_ERROR_MISSING
        } else if (requestBuf.length !== requestByteCount) {
          result = C.CMD_ERROR_INVALID_SYNTAX
        } else if (parity !== 0x00) {
          result = C.CMD_ERROR_PARITY
        // Error specifics to some commands
        } else if (currentCmd === C.CMD_RX_DEQUEUE && RxQueue.length === 0) {
          result = C.CMD_ERROR_RUNTIME
        } else if (currentCmd === C.CMD_RX_PEEK && RxQueue.length === 0) {
          result = C.CMD_ERROR_RUNTIME
        } else {
          currentReceiveState = RECEIVE_STATE.WILL_SEND_RESPONSE_LENGTH
          result = C.CMD_ERROR_NONE
        }
        return result
      case RECEIVE_STATE.WILL_SEND_RESPONSE_LENGTH:
        responseBuf = CMDS[currentCmd](requestBuf)
        parity = result ^ responseBuf.length
        if (responseBuf.length === 0x00) {
          currentReceiveState = RECEIVE_STATE.WILL_SEND_PARITY_BYTE
        } else {
          currentReceiveState = RECEIVE_STATE.WILL_SEND_NEXT_RESPONSE_BYTE
        }
        responseByteCount = 0
        return responseBuf.length
      case RECEIVE_STATE.WILL_SEND_NEXT_RESPONSE_BYTE:
        var responseByte = responseBuf[responseByteCount]
        parity ^= responseByte
        responseByteCount += 1
        if (responseByteCount === responseBuf.length) {
          currentReceiveState = RECEIVE_STATE.WILL_SEND_PARITY_BYTE
        }
        return responseByte
      case RECEIVE_STATE.WILL_SEND_PARITY_BYTE:
        currentReceiveState = RECEIVE_STATE.WILL_SEND_RESULT
        return parity
    }
  }
  return SakuraIO.use({
    sendByte (byte, cb) {
      setTimeout(function () {
        sendByteSync(byte)
        cb()
      }, 1)
    },
    sendByteSync,
    receiveByte (cb) {
      setTimeout(function () {
        cb(null, receiveByteSync())
      }, 1)
    },
    receiveByteSync
  })
}

module.exports = {
  open (cb) {
    setTimeout(function () {
      cb(null, createBus())
    }, 1)
  },
  openSync () {
    return createBus()
  }
}
