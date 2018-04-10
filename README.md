# node-sakuraio

SAKURA Internet IoT Communication Module Library for NodeJS abstraction layer.
Should work on most Linux board like the Raspberry Pi, C.H.I.P., BeagleBone
or Intel Edison. All methods have asynchronous and synchronous forms.

Currently only Node 7 or more are supported (it may work on Node 6).
This library cannot be used on its own! You need to use the adapter library
that implements the communication protocol that you like.

Currently only I2c is supported. See: [node-sakuraio-i2c](https://github.com/malikolivier/node-sakuraio-i2c).

# Disclaimer

This project is not affiliated with sakura.io and is licensed under the very
permissive ISC license. Use it at your own risk.

# API specification

### bus.getConnectionStatus(cb)

* cb: function(err, status)

Where `status` is an object as follows:

```js
{
    // `true` if there is no issue. `false` otherwise.
    ok: true,
    // This attribute is set if any error
    // 01h 圏外
    // 02h 接続エラー
    // 03h 意図しない切断
    errorCode: ERROR_CODE,
}
```

### getSignalQuality(cb)

* cb: function(err, quality)

Where `quality` is an integer from 0 (no connection) to 5 (very strong).

### getDateTime(cb)

* cb: function(err, date)

Where `date` is a Date instance.

### echoBack(input, cb)

* input: `Buffer`
* cb: function(err, echo)

Where `echo` should be the same buffer as provided in input.

## Send

### enqueueTx(channel, value[, options], cb)

* channel: Channel number (`number`)
* value: A value to be put into the send queue.
Any `number`, `string` or `Buffer` can be put into the queue. The type will be
checked and the appropriate buffer will be sent to the SakuraIO peripheral.
* options: Allow to set the timestamp offset
    ```js
    { offset: 0 /* Default value is 0 */ }
    ```
* cb: function(err)

### sendImmediately(array[, options], cb)

* array: Array of data to send immediately
```js
[
    {
        channel: 1,      // Expect channel number
        value: "Hello!", // As for `enqueueTx`, any type can be sent
    },
    // ...
]
```
* options: Allow to set the timestamp offset for all the data in `array`
    ```js
    { offset: 0 /* Default value is 0 */ }
    ```
* cb: function(err)

Order the peripheral to send immediately as many data as is provided in the
input array.

### getTxQueueLength(cb)

* cb: function(err, response)

Where `response` is an object as follows:

```js
{
    available: 10, // Number of items that can still be put into the queue
    queued: 20,    // Number of items currently queued
}
```

### clearTx(cb)

* cb: function(err)

Clear the send queue, effectively discarding all data that was inside the queue.

### getTxStatus(cb)

* cb: function(err, status)

Where `response` is an object as follows:

```js
{
    queue: 0,     // Get status of the queue that was just sent
                  // (0: nothing, 1: sending, 2: failure)
    immediate: 0, // Get status of previous `sendImmediately` command
                  // (0: nothing, 1: sending, 2: failure)
}
```
### send(cb)

* cb: function(err)

Send all the content of the send queue.

## Receive

### dequeueRx(cb)

* cb: function(err, item)

Where item is as:

```js
{
    channel: 0,      // Channel number
    value: "Hello!", // Value of the message
    offset: 0,       // Timestamp offset
}
```

Pop one object out of the receive queue.

### peekRx(cb)

Same as `dequeueRx`, but does not pop the object out of the queue, only
returns it.

### getRxQueueLength(cb)

* cb: function(err, response)

Where `response` is an object as follows:

```js
{
    available: 10, // Number of items that can still be put into the queue
    queued: 20,    // Number of items currently queued
}
```

### clearRx(cb)

* cb: function(err)

Clear the receive queue, effectively discarding all data that was inside the
queue.

## File download

### startFileDownload(fileId, cb)

* fileId: ID of the file to download (integer)
* cb: function(err)

Start downloading the file identified by `fileId`.

### cancelFileDownload(cb)

* cb: function(err)

Cancel the download of the file currently being downloaded.

### getFileMetaData(cb)

* cb: function(err, metadata)

Where `metadata` is an object describing the file being downloaded as follows:

```js
{
    status: 0,       // File downdload status (refer to datasheet)
    totalSize: 120,  // size in bytes
    timestamp: Date, // A date object
    crc: 12,         // Integer to check whether file is corrupted
}
```

### getFileDownloadStatus(cb)

* cb: function(err, status)

Where `status` is an object as follows:

```js
{
    status: 0,         // File download status (refer to datasheet)
    receivedSize: 124, // received size as of now in bytes
}
```

### getFileData(size, cb)

* size: Length of file to get in bytes
* cb: function(err, data)

Read `size` bytes of received file. Returns the result as a buffer in `data`.

## Operation

### getProductId(cb)

* cb: function(err, productId)

Where `productId` is a string.

### getUniqueId(cb)

* cb: function(err, uniqueId)

Where `uniqueId` is a string.

### getFirmwareVersion(cb)

* cb: function(err, firmwareVersion)

Where `firmwareVersion` is a string.

### unlock(cb)

* cb: function(err)

Unlock the SakuraIO firmware.

### updateFirmware()

* cb: function(err)

Update the SakuraIO firmware.

### getFirmwareUpdateStatus()

* cb: function(err, status)

Where `status` is as:

```js
{
    updating: true,     // Indicate SakuraIO is updating or not
    anyError: false,    // Set to `true` if an error occurrec
    essage: "No error", // An explanatory error message
}
```

Update the SakuraIO firmware.

### reset()

* cb: function(err)

Reset the SakuraIO firmware.
