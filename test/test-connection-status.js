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

describe('getTxQueueLength', function () {
  beforeEach(function () {
    this.busTxQueue = SakuraIOSim.openSync()
  })

  context('Nothing queued', function () {
    it('TxQueue is empty', function (done) {
      this.busTxQueue.getTxQueueLength(function (err, response) {
        if (err) throw err
        assert.equal(response.queued, 0)
        done()
      })
    })
  })

  context('One datum in TxQueue', function () {
    beforeEach(function () {
      this.previousResponse = this.busTxQueue.getTxQueueLengthSync()
      this.busTxQueue.enqueueTxSync(0, 0)
    })

    it('available slot decreased by one', function (done) {
      this.busTxQueue.getTxQueueLength((err, response) => {
        if (err) throw err
        assert.equal(this.previousResponse.available - response.available, 1)
        done()
      })
    })
    it('queued is one', function (done) {
      this.busTxQueue.getTxQueueLength(function (err, response) {
        if (err) throw err
        assert.equal(response.queued, 1)
        done()
      })
    })
  })
})

describe('clearTx', function () {
  beforeEach(function () {
    this.busTxQueue = SakuraIOSim.openSync()
    this.busTxQueue.enqueueTxSync(0, 0)
  })

  it('clears the queue', function (done) {
    this.busTxQueue.clearTx((err) => {
      if (err) throw err
      this.busTxQueue.getTxQueueLength((err, response) => {
        if (err) throw err
        assert.equal(response.queued, 0)
        done()
      })
    })
  })
})

describe('send', function () {
  beforeEach(function () {
    this.busTxQueue = SakuraIOSim.openSync()
    this.busTxQueue.enqueueTxSync(0, 0)
  })

  it('sends and clear all the queue', function (done) {
    this.busTxQueue.send((err) => {
      if (err) throw err
      this.busTxQueue.getTxQueueLength((err, response) => {
        if (err) throw err
        assert.equal(response.queued, 0)
        done()
      })
    })
  })
})

describe('getTxStatus', function () {
  it('contains a number "queue" attribute', function () {
    var status = this.bus.getTxStatusSync()
    assert(typeof status.queue === 'number')
  })
  it('contains a number "immediate" attribute', function () {
    var status = this.bus.getTxStatusSync()
    assert(typeof status.immediate === 'number')
  })
})

describe('dequeueRx', function () {
  context('int32', function () {
    beforeEach(function () {
      this.busRx = SakuraIOSim.openSync()
    })

    it('returned object has a "channel" property', function () {
      var response = this.busRx.dequeueRxSync()
      assert(typeof response.channel === 'number')
    })
    it('channel is 0', function () {
      var response = this.busRx.dequeueRxSync()
      assert.equal(response.channel, 0x00)
    })
    it('returned object has an "offset" property', function () {
      var response = this.busRx.dequeueRxSync()
      assert(typeof response.offset === 'number')
    })
    it('can dequeues an int32', function () {
      var response = this.busRx.dequeueRxSync()
      assert.equal(response.value, 42)
    })
    it('offset is 42', function (done) {
      this.busRx.dequeueRx(function (err, response) {
        if (err) throw err
        assert.equal(response.offset, 42)
        done()
      })
    })
  })

  context('all types', function () {
    before(function () {
      this.busRx = SakuraIOSim.openSync()
    })

    // The order of the queue is predetermined by sakuraio-sim.js!
    it('can dequeue an int32', function () {
      var response = this.busRx.dequeueRxSync()
      assert.equal(response.value, 42)
    })
    it('can dequeue a uint32', function () {
      var response = this.busRx.dequeueRxSync()
      assert.equal(response.value, 42)
    })
    it('can dequeue an int64', function () {
      var response = this.busRx.dequeueRxSync()
      assert.equal(response.value, 42)
    })
    it('can dequeue a uint64', function () {
      var response = this.busRx.dequeueRxSync()
      assert.equal(response.value, 42)
    })
    it('can dequeue a float32', function () {
      var response = this.busRx.dequeueRxSync()
      assert.equal(response.value, 42)
    })
    it('can dequeue a float64', function () {
      var response = this.busRx.dequeueRxSync()
      assert.equal(response.value, 42)
    })
    it('can dequeue an 8-byte array', function () {
      var response = this.busRx.dequeueRxSync()
      assert.deepEqual(response.value, Buffer.from('Hello42!'))
    })
    it('raises runtime error on empty queue!', function () {
      assert.throws(() => {
        this.busRx.dequeueRxSync()
      })
    })
    it('returns async runtime error on empty queue!', function (done) {
      this.busRx.dequeueRx(function (err) {
        assert(err.message.includes('Runtime'))
        done()
      })
    })
  })
})

describe('peekRx', function () {
  it('can peek on queued int32', function () {
    var response = this.bus.peekRxSync()
    assert.equal(response.value, 42)
  })
})
