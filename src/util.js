const C = require('./commands')

function unsignedInt64BufferToNumber (buf, offset = 0) {
  // As JS numbers are all 64-bit floating points, some precision will be lost!
  var number = 0
  var factor = 1
  for (var i = offset; i < offset + 8; i++) {
    number += buf[i] * factor
    factor *= 0x100
  }
  return number
}

function signedInt64BufferToNumber (buf, offset = 0) {
  // As JS numbers are all 64-bit floating points, some precision will be lost!
  var sign = buf[offset + 7] & 0b00000001
  if (sign === 1) {
    // Take the complement! I would like to use ~, but JS will do it on 32 bits...
    // So I write this ugly piece of code
    for (var i = offset; i < offset + 8; i++) {
      var val = 0
      var binaryFactor = 1
      for (var j = 0; j < 8; j++) {
        if (buf[i] & (1 << j) === 0) {
          val += binaryFactor
        }
        binaryFactor *= 2
      }
      buf[i] = val
    }
  }
  var number = unsignedInt64BufferToNumber(buf, offset)
  if (sign === 1) {
    number = -(number + 1)
  }
  return number
}

module.exports = {
  bufferToDate (buf, offset = 0) {
    return new Date(unsignedInt64BufferToNumber(buf, offset))
  },
  numberToFloat64Buffer (number) {
    // Encode as 64-bit double floating point number
    var buffer = Buffer.alloc(8)
    buffer.writeDoubleLE(number, 0)
    return buffer
  },
  numberToFloat32Buffer (number) {
    throw new Error('Not implemented!')
  },
  numberToSignedInt64Buffer (number) {
    throw new Error('Not implemented!')
  },
  numberToUnsignedInt64Buffer (number) {
    var buffer = Buffer.alloc(8)
    var i = 0
    while (number > 0xFF && i < 7) {
      buffer[i] = number % 0x100
      number = Math.floor(number / 0x100)
      i += 1
    }
    buffer[i] = number
    return buffer
  },
  numberToSignedInt32Buffer (number) {
    throw new Error('Not implemented!')
  },
  numberToUnsignedInt32Buffer (number) {
    throw new Error('Not implemented!')
  },
  stringTo64BitBuffer (string) {
    var buffer = Buffer.alloc(8)
    for (var i = 0; i < string.length; i++) {
      buffer[i] = string.charCodeAt(i)
    }
    return buffer
  },
  bufferTo64BitBuffer (inBuffer) {
    var buffer = Buffer.alloc(8)
    for (var i = 0; i < inBuffer.length; i++) {
      buffer[i] = inBuffer[i]
    }
    return buffer
  },

  decodeValue (responseBuffer) {
    switch (responseBuffer[1]) {
      case C.TYPE_32BIT_SIGNED_INT:
        return responseBuffer.readInt32LE(2)
      case C.TYPE_32BIT_UNSIGNED_INT:
        return responseBuffer.readUInt32LE(2)
      case C.TYPE_64BIT_SIGNED_INT:
        return signedInt64BufferToNumber(responseBuffer, 2)
      case C.TYPE_64BIT_UNSIGNED_INT:
        return unsignedInt64BufferToNumber(responseBuffer, 2)
      case C.TYPE_32BIT_FLOAT:
        return responseBuffer.readFloatLE(2)
      case C.TYPE_64BIT_FLOAT:
        return responseBuffer.readDoubleLE(2)
      case C.TYPE_8BYTE_ARRAY:
        return responseBuffer.slice(2, 10)
    }
  },
  decodeOffset (responseBuffer) {
    return unsignedInt64BufferToNumber(responseBuffer, 10)
  },
  unsignedInt64BufferToNumber,

  bufferToProductId (buffer) {
    if (buffer[0] === 0x01 && buffer[1] === 0x00) {
      return 'SCM-LTE-Beta'
    } else if (buffer[0] === 0x02 && buffer[1] === 0x00) {
      return 'SCM-LTE-01'
    } else {
      return buffer.toString('hex')
    }
  },

  bufferToFirmwareUpdateStatus (buffer) {
    var errCode = buffer[0] & 0x3f
    var message
    switch (errCode) {
      case 0x00:
        message = 'No error'
        break
      case 0x01:
        message = 'Up to date'
        break
      case 0x02:
        message = 'Failed to get latest version'
        break
      case 0x03:
        message = 'Failed to dowload'
        break
      case 0x04:
        message = 'Verification of downloaded package failed'
    }
    return {
      updating: (buffer[0] & 0b10000000) >> 7 === 1,
      anyError: (buffer[0] & 0b01111111) !== 0,
      message
    }
  }
}
