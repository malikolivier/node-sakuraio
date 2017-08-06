module.exports = {
  bufferToDate (buf) {
    var unixTimestamp = 0
    var factor = 1
    for (var i = 0; i < buf.length; i++) {
      unixTimestamp += buf[i] * factor
      factor *= 0x100
    }
    return new Date(unixTimestamp)
  },
  numberToFloat64Buffer (number) {
    // Encode as 64-bit double floating point number
    var buffer = Buffer.alloc(8)
    var view = new DataView(buffer.buffer)
    view.setFloat64(0, number)
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
    for (var i = 0; i < string.length; i++) {
      buffer[i] = inBuffer[i]
    }
    return buffer
  }
}
