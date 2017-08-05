const SakuraIO = require('../sakuraio')
const C = require('../src/commands')

function createBus () {
  var sum = 0
  var count = 0
  var parity
  function sendByteSync (byte) {
    sum += byte
  }
  function receiveByteSync () {
    count += 1
    switch (count) {
      case 1:
        return C.CMD_ERROR_NONE
      case 2:
        var receivedResponseLength = 1
        parity = C.CMD_ERROR_NONE ^ receivedResponseLength
        return receivedResponseLength
      case 3:
        parity ^= (sum % 256)
        return sum % 256
      case 4:
        return parity
    }
  }
  return SakuraIO.use({
    sendByte (byte, cb) {
      setTimeout(function () {
        sendByteSync(byte)
        cb()
      }, 10)
    },
    sendByteSync,
    receiveByte (cb) {
      setTimeout(function () {
        cb(null, receiveByteSync())
      }, 10)
    },
    receiveByteSync
  })
}

module.exports = {
  open (cb) {
    setTimeout(function () {
      cb(null, createBus())
    }, 10)
  },
  openSync () {
    return createBus()
  }
}
