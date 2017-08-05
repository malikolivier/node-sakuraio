const C = require('./src/commands')

const ERROR_PARITY = new Error('Parity error')
function errorNumber (errNo) {
  return new Error(`Error result: ${errNo}`)
}

module.exports = {
  use (bus) {
    var idle = true
    var parity
    function _writeBuffer (i, requestBuf, cb) {
      if (i >= requestBuf.length) {
        cb()
      } else {
        bus.sendByte(requestBuf[i], function (err) {
          if (err) cb(err)
          else {
            _writeBuffer(i + 1, requestBuf, cb)
          }
        })
      }
    }
    function __readBuffer (response, i, cb) {
      if (i >= response.length) {
        cb(null, response)
      } else {
        bus.receiveByte(function (err, byte) {
          if (err) {
            cb(err)
          } else {
            response[i] = byte
            parity ^= byte
            __readBuffer(response, i + 1, cb)
          }
        })
      }
    }
    function _readBuffer (receivedResponseLength, cb) {
      var response = Buffer.alloc(receivedResponseLength)
      __readBuffer(response, 0, cb)
    }
    function _writeCommand (cmd, requestBuf, cb) {
      bus.sendByte(cmd, function (err) {
        if (err) {
          cb(err)
        } else {
          bus.sendByte(requestBuf.length, function (err) {
            if (err) {
              cb(err)
            } else {
              parity = cmd ^ requestBuf.length
              _writeBuffer(0, requestBuf, function (err) {
                if (err) {
                  cb(err)
                } else {
                  bus.sendByte(parity, function (err) {
                    if (err) {
                      cb(err)
                    } else {
                      cb()
                    }
                  })
                }
              })
            }
          })
        }
      })
    }
    function _readResponse (cb) {
      bus.receiveByte(function (err, result) {
        if (err) {
          cb(err)
        } else if (result !== C.CMD_ERROR_NONE) {
          cb(errorNumber(result))
        } else {
          bus.receiveByte(function (err, receivedResponseLength) {
            if (err) {
              cb(err)
            } else {
              parity = result ^ receivedResponseLength
              _readBuffer(receivedResponseLength, function (err, response) {
                if (err) {
                  cb(err)
                } else {
                  cb(null, response)
                }
              })
            }
          })
        }
      })
    }
    function _executeCommand (cmd, requestBuf, cb) {
      _writeCommand(cmd, requestBuf, function (err) {
        if (err) {
          cb(err)
        } else {
          _readResponse(function (err, response) {
            if (err) {
              cb(err)
            } else {
              bus.receiveByte(function (err, p) {
                if (err) {
                  cb(err)
                } else {
                  parity ^= p
                  if (parity !== 0x00) {
                    cb(ERROR_PARITY, response)
                  } else {
                    cb(null, response)
                  }
                }
              })
            }
          })
        }
      })
    }
    function executeCommand (cmd, requestBuf, cb) {
      if (!cb) {
        cb = requestBuf
        requestBuf = Buffer.alloc(0)
      }
      idle = false
      _executeCommand(cmd, requestBuf, function (err, response) {
        idle = true
        if (err) {
          cb(err, response)
        } else {
          cb(null, response)
        }
      })
    }
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
          throw errorNumber(result)
        }
        var receivedResponseLength = bus.receiveByteSync()
        parity = result ^ receivedResponseLength
        var response = Buffer.alloc(receivedResponseLength)
        for (i = 0; i < receivedResponseLength; i++) {
          response[i] = bus.receiveByteSync()
          parity ^= response[i]
        }
        var p = bus.receiveByteSync()
        parity ^= p
        if (parity !== 0x00) {
          throw ERROR_PARITY
        }
        return response
      }
    }

    return {
      getConnectionStatusSync () {
        var response = executeCommandSync(C.CMD_GET_CONNECTION_STATUS)
        return response[0]
      },
      getConnectionStatus (cb) {
        executeCommand(C.CMD_GET_CONNECTION_STATUS, function (err, response) {
          if (err) cb(err)
          else cb(null, response[0])
        })
      }
    }
  }
}
