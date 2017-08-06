const SakuraIO = require('../sakuraio')
const C = require('../src/commands')

const CMDS = {
  [C.CMD_GET_CONNECTION_STATUS]: function () {
    return Buffer.from([C.CONNECTION_STATUS_ERROR_NONE])
  }
}

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
  var currentCmd
  var requestBuf
  var requestByteCount
  var parity
  var receivedParityByte
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
        receivedParityByte = byte
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
        } else if (receivedParityByte ^ parity !== 0x00) {
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
