/* eslint-env mocha */
const assert = require('assert')
const SakuraIOSim = require('./sakuraio-sim')
const C = require('../src/commands')

before(function () {
  this.bus = SakuraIOSim.openSync()
})

describe('getConnectionStatus', function () {
  it('should return 0 for no error', function (done) {
    this.bus.getConnectionStatus(function (err, status) {
      if (err) throw err
      assert.equal(status, C.CONNECTION_STATUS_ERROR_NONE)
      done()
    })
  })
})

describe('getSignalQuality', function () {
  it('should return VERY_STRONG', function () {
    assert.equal(this.bus.getSignalQualitySync(), C.SIGNAL_QUALITY_VERY_STRONG)
  })
})

describe('getDateTime', function () {
  it('should return current time', function (done) {
    this.bus.getDateTime(function (err, now1) {
      if (err) throw err
      var now2 = Date.now()
      assert(now2 - now1 < 1000) // Allow for 1s of delay at most
      done()
    })
  })
})

describe('echoBack', function () {
  it('should return input as is', function (done) {
    var input = Buffer.from('HelloWorld!')
    this.bus.echoBack(input, function (err, echo) {
      if (err) throw err
      assert.deepEqual(input, echo)
      done()
    })
  })
})
