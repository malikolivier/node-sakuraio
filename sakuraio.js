const C = require('./src/commands')

module.exports = {
  use (bus) {
    var idle = true
    var parity
    // function __writeBuffer (i, requestBuf, cb) {
    //
    // }
    // function _writeBuffer (requestBuf, cb) {
    //
    // }
    // function executeCommand (cmd, requestBuf, cb) {
    //   bus.sendByte(cmd, function (err) {
    //     if (err) {
    //       cb(err)
    //     } else {
    //       bus.sendByte(requestBuf.length, function (err) {
    //         if (err) {
    //           cb(err)
    //         } else {
    //           parity = cmd ^ requestBuf.length
    //           _writeBuffer(requestBuf, function (err) {
    //             if (err) {
    //               cb(err)
    //             } else {
    //
    //             }
    //           })
    //         }
    //       })
    //     }
    //   })
    // }
    function executeCommandSync (cmd, requestBuf = Buffer.alloc(0)) {
      if (!idle) {
        throw new Error('Busy!')
      } else {
        bus.sendByteSync(cmd)
        bus.sendByteSync(requestBuf.length)
        parity = cmd ^ requestBuf.length
        for (var i = 0; i < requestBuf.length; i++) {
          parity ^= requestBuf[i]
          bus.sendByteSync(requestBuf[i])
        }
        bus.sendByteSync(parity)

        var result = bus.receiveByteSync()
        if (result !== C.CMD_ERROR_NONE) {
          return result
        }
        var receivedResponseLength = bus.receiveByteSync()
        parity = result ^ receivedResponseLength
        var response = Buffer.alloc(receivedResponseLength)
        for (i = 0; i < receivedResponseLength; i++) {
          response[i] = bus.receiveByteSync()
        }
        var p = bus.receiveByteSync()
        parity ^= p
        if (parity !== 0x00) {
          result = C.CMD_ERROR_PARITY
        }
        return { result, response }
      }
    }

    return {
      getConnectionStatusSync () {
        var r = executeCommandSync(C.CMD_GET_CONNECTION_STATUS)
        if (r.result !== C.CMD_ERROR_NONE) {
          throw new Error('Error!')
        } else {
          return r.response[0]
        }
      }
    }
  }
}
