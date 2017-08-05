const SakuraIOSim = require('./sakuraio-sim')

SakuraIOSim.open(function (err, bus) {
  if (err) throw err
  bus.getConnectionStatus(function (err, status) {
    if (err) throw err
    console.log(`ASYNC1: ${status}`)
  })
  bus.getConnectionStatus(function (err, status) {
    if (err) throw err
    console.log(`ASYNC2: ${status}`)
  })
})

var bus = SakuraIOSim.openSync()
console.log(`SYNC: ${bus.getConnectionStatusSync()}`)
