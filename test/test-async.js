/* eslint-env mocha */
const assert = require('assert')
const SakuraIOSim = require('./sakuraio-sim')

describe('Async and sync', function () {
  it('should return the same result', function (done) {
    var bus = SakuraIOSim.openSync()
    var syncResult = bus.getConnectionStatusSync()
    SakuraIOSim.open(function (err, bus) {
      if (err) throw err
      bus.getConnectionStatus(function (err, asyncResult) {
        if (err) throw err
        assert.equal(syncResult, asyncResult)
        done()
      })
    })
  })
})

describe('Async', function () {
  it('should wait for first command to complete before starting second', function (done) {
    SakuraIOSim.open(function (err, bus) {
      if (err) throw err
      var status1, status2
      bus.getConnectionStatus(function (err, status) {
        if (err) throw err
        status1 = status
        if (status2 !== undefined) {
          throw new Error('Second command finished first!')
        }
      })
      bus.getConnectionStatus(function (err, status) {
        if (err) throw err
        status2 = status
        if (status1 !== undefined) {
          done()
        }
      })
    })
  })
})
