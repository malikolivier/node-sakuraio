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

function createBus () {
  var queueLength = 0
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
