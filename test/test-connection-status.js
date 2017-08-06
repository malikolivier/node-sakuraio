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

// SakuraIOSim will throw exceptions for any syntax error
describe('enqueueTx', function () {
  it('enqueue string with success', function (done) {
    this.bus.enqueueTx(3, 'Hello!', function (err) {
      if (err) throw err
      done()
    })
  })

  it('enqueue number with success', function (done) {
    this.bus.enqueueTx(0, 124.123, function (err) {
      if (err) throw err
      done()
    })
  })

  it('enqueue number with offset with success', function (done) {
    this.bus.enqueueTx(3, 124, { offset: 15000 }, function (err) {
      if (err) throw err
      done()
    })
  })

  it('enqueue number with offset with success (sync)', function () {
    this.bus.enqueueTxSync(3, 124, { offset: 15000 })
  })
})

// SakuraIOSim will throw exceptions for any syntax error
describe('sendImmediately', function () {
  it('sendImmediately string with success', function (done) {
    this.bus.sendImmediately([{
      channel: 3,
      value: 'Hello!'
    }], function (err) {
      if (err) throw err
      done()
    })
  })

  it('sendImmediately number with success', function (done) {
    this.bus.sendImmediately([{
      channel: 0,
      value: 124.123
    }], function (err) {
      if (err) throw err
      done()
    })
  })

  it('sendImmediately number with offset with success', function (done) {
    this.bus.sendImmediately([{
      channel: 0,
      value: 124
    }], { offset: 15000 }, function (err) {
      if (err) throw err
      done()
    })
  })

  it('sendImmediately number with offset with success (sync)', function () {
    this.bus.sendImmediatelySync([{
      channel: 0,
      value: 124
    }, {
      channel: 1,
      value: 'FooBar!'
    }, {
      channel: 2,
      value: Buffer.from([0x12, 0x24, 0x01])
    }], { offset: 15000 })
  })
})
