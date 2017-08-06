const C = require('./src/commands')
const Util = require('./src/util')

const ERROR_PARITY = new Error('Parity error')
function errorNumber (errNo) {
  var desc = ''
  switch (errNo) {
    case C.CMD_ERROR_MISSING:
      desc = 'Missing or unknown command'
      break
    case C.CMD_ERROR_INVALID_SYNTAX:
      desc = 'Syntax error'
      break
    case C.CMD_ERROR_PARITY:
      desc = 'Parity error'
      break
    case C.CMD_ERROR_RUNTIME:
      desc = 'Runtime error'
      break
  }
  return new Error(`Error result: ${errNo} ${desc}`)
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
            parity ^= requestBuf[i]
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
    var stack = []
    function _executeNextCommand () {
      if (stack.length === 0 || !idle) return
      var { cmd, requestBuf, cb } = stack.shift()
      idle = false
      _executeCommand(cmd, requestBuf, function (err, response) {
        if (err) {
          cb(err, response)
        } else {
          cb(null, response)
        }
        idle = true
        _executeNextCommand()
      })
    }
    function executeCommand (cmd, requestBuf, cb) {
      if (!cb) {
        cb = requestBuf
        requestBuf = Buffer.alloc(0)
      }
      stack.push({ cmd, requestBuf, cb })
      _executeNextCommand()
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

    function _buildEnqueueTxRequest (channel, value, options) {
      var requestBuf
      if (options.offset === undefined) {
        requestBuf = Buffer.alloc(10)
      } else {
        requestBuf = Buffer.alloc(18)
      }
      requestBuf[0] = channel
      if (options.type === undefined) {
        // Guess type anf convert value to 8-byte buffer
        if (typeof value === 'number') {
          // Encode as 64-bit double, as JS uses 64-bit double
          options.type = C.TYPE_64BIT_FLOAT
          value = Util.numberToFloat64Buffer(value)
        } else if (typeof value === 'string') {
          // Convert string to buffer
          options.type = C.TYPE_8BYTE_ARRAY
          value = Util.stringTo64BitBuffer(value)
        } else if (value instanceof Buffer) {
          options.type = C.TYPE_8BYTE_ARRAY
          value = Util.bufferTo64BitBuffer(value)
        } else {
          throw new Error(`Cannot guess type to use with ${value}`)
        }
      }
      requestBuf[1] = options.type
      for (var i = 0; i < value.length; i++) {
        requestBuf[2 + i] = value[i]
      }
      if (options.offset !== undefined) {
        var offset = Util.numberToUnsignedInt64Buffer(options.offset)
        for (i = 0; i < offset.length; i++) {
          requestBuf[10 + i] = offset[i]
        }
      }
      return requestBuf
    }

    function _buildSendImmediatelyRequest (array, options) {
      var requestBuf
      if (options.offset === undefined) {
        requestBuf = Buffer.alloc(10 * array.length)
      } else {
        requestBuf = Buffer.alloc(10 * array.length + 8)
      }
      array.forEach(function (datum, i) {
        var singleDatumBuf = _buildEnqueueTxRequest(datum.channel, datum.value,
                                                    { type: datum.type })
        for (var j = 0; j < singleDatumBuf.length; j++) {
          requestBuf[10 * i + j] = singleDatumBuf[j]
        }
      })
      if (options.offset !== undefined) {
        var offset = Util.numberToUnsignedInt64Buffer(options.offset)
        for (var i = 0; i < offset.length; i++) {
          requestBuf[10 * array.length + i] = offset[i]
        }
      }
      return requestBuf
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
      },

      getSignalQualitySync () {
        var response = executeCommandSync(C.CMD_GET_SIGNAL_QUALITY)
        return response[0]
      },
      getSignalQuality (cb) {
        executeCommand(C.CMD_GET_SIGNAL_QUALITY, function (err, response) {
          if (err) cb(err)
          else cb(null, response[0])
        })
      },

      getDateTimeSync () {
        var response = executeCommandSync(C.CMD_GET_DATETIME)
        return Util.bufferToDate(response)
      },
      getDateTime (cb) {
        executeCommand(C.CMD_GET_DATETIME, function (err, response) {
          if (err) cb(err)
          else cb(null, Util.bufferToDate(response))
        })
      },

      echoBackSync (requestBuf) {
        return executeCommandSync(C.CMD_ECHO_BACK, requestBuf)
      },
      echoBack (requestBuf, cb) {
        executeCommand(C.CMD_ECHO_BACK, requestBuf, cb)
      },

      enqueueTxSync (channel, value, options = {}) {
        var requestBuf = _buildEnqueueTxRequest(channel, value, options)
        return executeCommandSync(C.CMD_TX_ENQUEUE, requestBuf)
      },
      enqueueTx (channel, value, options, cb) {
        if (!cb) {
          cb = options
          options = {}
        }
        var requestBuf = _buildEnqueueTxRequest(channel, value, options)
        executeCommand(C.CMD_TX_ENQUEUE, requestBuf, cb)
      },

      sendImmediatelySync (array, options = {}) {
        var requestBuf = _buildSendImmediatelyRequest(array, options)
        return executeCommandSync(C.CMD_TX_SENDIMMED, requestBuf)
      },
      sendImmediately (array, options, cb) {
        if (!cb) {
          cb = options
          options = {}
        }
        var requestBuf = _buildSendImmediatelyRequest(array, options)
        executeCommand(C.CMD_TX_SENDIMMED, requestBuf, cb)
      },

      getTxQueueLengthSync () {
        var response = executeCommandSync(C.CMD_TX_LENGTH)
        return { available: response[0], queued: response[1] }
      },
      getTxQueueLength (cb) {
        executeCommand(C.CMD_TX_LENGTH, function (err, response) {
          if (err) cb(err)
          else cb(null, { available: response[0], queued: response[1] })
        })
      },

      clearTxSync () {
        return executeCommandSync(C.CMD_TX_CLEAR)
      },
      clearTx (cb) {
        executeCommand(C.CMD_TX_CLEAR, cb)
      },

      sendSync () {
        return executeCommandSync(C.CMD_TX_SEND)
      },
      send (cb) {
        executeCommand(C.CMD_TX_SEND, cb)
      },

      getTxStatusSync () {
        var response = executeCommandSync(C.CMD_TX_STAT)
        return { queue: response[0], immediate: response[1] }
      },
      getTxStatus (cb) {
        executeCommand(C.CMD_TX_STAT, function (err, response) {
          if (err) cb(err)
          else cb(null, { queue: response[0], immediate: response[1] })
        })
      },

      dequeueRxSync () {
        var response = executeCommandSync(C.CMD_RX_DEQUEUE)
        return {
          channel: response[0],
          value: Util.decodeValue(response),
          offset: Util.decodeOffset(response)
        }
      },
      dequeueRx (cb) {
        executeCommand(C.CMD_RX_DEQUEUE, function (err, response) {
          if (err) cb(err)
          else {
            cb(null, {
              channel: response[0],
              value: Util.decodeValue(response),
              offset: Util.decodeOffset(response)
            })
          }
        })
      },

      peekRxSync () {
        var response = executeCommandSync(C.CMD_RX_PEEK)
        return {
          channel: response[0],
          value: Util.decodeValue(response),
          offset: Util.decodeOffset(response)
        }
      },
      peekRx (cb) {
        executeCommand(C.CMD_RX_PEEK, function (err, response) {
          if (err) cb(err)
          else {
            cb(null, {
              channel: response[0],
              value: Util.decodeValue(response),
              offset: Util.decodeOffset(response)
            })
          }
        })
      },

      getRxQueueLengthSync () {
        var response = executeCommandSync(C.CMD_RX_LENGTH)
        return { available: response[0], queued: response[1] }
      },
      getRxQueueLength (cb) {
        executeCommand(C.CMD_RX_LENGTH, function (err, response) {
          if (err) cb(err)
          else cb(null, { available: response[0], queued: response[1] })
        })
      },

      clearRxSync () {
        return executeCommandSync(C.CMD_RX_CLEAR)
      },
      clearRx (cb) {
        executeCommand(C.CMD_RX_CLEAR, cb)
      },

      startFileDownloadSync (fileId) {
        var requestBuf = Buffer.alloc(2)
        requestBuf.writeUIntLE(fileId, 0, 2)
        executeCommandSync(C.CMD_START_FILE_DOWNLOAD, requestBuf)
      },
      startFileDownload (fileId, cb) {
        var requestBuf = Buffer.alloc(2)
        requestBuf.writeUIntLE(fileId, 0, 2)
        executeCommand(C.CMD_START_FILE_DOWNLOAD, requestBuf, cb)
      },

      getFileMetaDataSync () {
        var response = executeCommandSync(C.CMD_GET_FILE_METADATA)
        return {
          status: response[0],
          totalSize: response.readIntLE(1, 4),
          timestamp: Util.unsignedInt64BufferToNumber(response, 5),
          crc: response.readIntLE(13, 4)
        }
      },
      getFileMetaData (cb) {
        executeCommand(C.CMD_GET_FILE_METADATA, function (err, response) {
          if (err) cb(err)
          else {
            cb(null, {
              status: response[0],
              totalSize: response.readIntLE(1, 4),
              timestamp: Util.unsignedInt64BufferToNumber(response, 5),
              crc: response.readIntLE(13, 4)
            })
          }
        })
      },

      getFileDownloadStatusSync () {
        var response = executeCommandSync(C.CMD_GET_FILE_DOWNLOAD_STATUS)
        return {
          status: response[0],
          receivedSize: response.readIntLE(1, 4)
        }
      },
      getFileDownloadStatus (cb) {
        executeCommand(C.CMD_GET_FILE_DOWNLOAD_STATUS, function (err, response) {
          if (err) cb(err)
          else {
            cb(null, {
              status: response[0],
              receivedSize: response.readIntLE(1, 4)
            })
          }
        })
      }
    }
  }
}
