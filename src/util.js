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
  bufferToDate (buf) {
    return new Date(unsignedInt64BufferToNumber(buf))
  },
  numberToFloat64Buffer (number) {
    // Encode as 64-bit double floating point number
    var buffer = Buffer.alloc(8)
    var view = new DataView(buffer.buffer)
    view.setFloat64(0, number, true)
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
        return new DataView(responseBuffer.buffer).getInt32(2, true)
      case C.TYPE_32BIT_UNSIGNED_INT:
        return new DataView(responseBuffer.buffer).getUint32(2, true)
      case C.TYPE_64BIT_SIGNED_INT:
        return signedInt64BufferToNumber(responseBuffer, 2)
      case C.TYPE_64BIT_UNSIGNED_INT:
        return unsignedInt64BufferToNumber(responseBuffer, 2)
      case C.TYPE_32BIT_FLOAT:
        return new DataView(responseBuffer.buffer).getFloat32(2, true)
      case C.TYPE_64BIT_FLOAT:
        return new DataView(responseBuffer.buffer).getFloat64(2, true)
      case C.TYPE_8BYTE_ARRAY:
        return responseBuffer.slice(2, 10)
    }
  },
  decodeOffset (responseBuffer) {
    return unsignedInt64BufferToNumber(responseBuffer, 10)
  }
}
