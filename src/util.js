module.exports = {
  bufferToDate(buf) {
    var unixTimestamp = 0
    var factor = 1
    for (var i = 0; i < buf.length; i++) {
      unixTimestamp += buf[i] * factor
      factor *= 0x100
    }
    return new Date(unixTimestamp)
  }
}
