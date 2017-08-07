module.exports = {
  // Common
  CMD_GET_CONNECTION_STATUS: 0x01,
  CMD_GET_SIGNAL_QUALITY: 0x02,
  CMD_GET_DATETIME: 0x03,
  CMD_ECHO_BACK: 0x0f,

  // IO
  CMD_READ_ADC: 0x10,

  // Transmit
  CMD_TX_ENQUEUE: 0x20,
  CMD_TX_SENDIMMED: 0x21,
  CMD_TX_LENGTH: 0x22,
  CMD_TX_CLEAR: 0x23,
  CMD_TX_SEND: 0x24,
  CMD_TX_STAT: 0x25,

  // Receive
  CMD_RX_DEQUEUE: 0x30,
  CMD_RX_PEEK: 0x31,
  CMD_RX_LENGTH: 0x32,
  CMD_RX_CLEAR: 0x33,

  // File Download
  CMD_START_FILE_DOWNLOAD: 0x40,
  CMD_GET_FILE_METADATA: 0x41,
  CMD_GET_FILE_DOWNLOAD_STATUS: 0x42,
  CMD_CANCEL_FILE_DOWNLOAD: 0x43,
  CMD_GET_FILE_DATA: 0x44,

  // Operation
  CMD_GET_PRODUCT_ID: 0xA0,
  CMD_GET_UNIQUE_ID: 0xA1,
  CMD_GET_FIRMWARE_VERSION: 0xA2,
  CMD_UNLOCK: 0xA8,
  CMD_UPDATE_FIRMWARE: 0xA9,
  CMD_GET_UPDATE_FIRMWARE_STATUS: 0xAA,
  CMD_SOFTWARE_RESET: 0xAF,

  // Response
  CMD_ERROR_NONE: 0x01,
  CMD_ERROR_PARITY: 0x02,
  CMD_ERROR_MISSING: 0x03,
  CMD_ERROR_INVALID_SYNTAX: 0x04,
  CMD_ERROR_RUNTIME: 0x05,
  CMD_ERROR_LOCKED: 0x06,
  CMD_ERROR_BUSY: 0x07,

  // Connection status
  CONNECTION_STATUS_ERROR_NONE: 0x00,
  CONNECTION_STATUS_ERROR_NO_NETWORK: 0x01,
  CONNECTION_STATUS_ERROR_CONNECTION: 0x02,
  CONNECTION_STATUS_ERROR_UNEXPECTED_DISCONNECTION: 0x03,

  // Signal quality
  SIGNAL_QUALITY_NO_NETWORK: 0x00,
  SIGNAL_QUALITY_VERY_WEAK: 0x01,
  SIGNAL_QUALITY_WEAK: 0x02,
  SIGNAL_QUALITY_MEDIUM: 0x03,
  SIGNAL_QUALITY_STRONG: 0x04,
  SIGNAL_QUALITY_VERY_STRONG: 0x05,

  // Types
  TYPE_32BIT_SIGNED_INT: 'i'.charCodeAt(0),
  TYPE_32BIT_UNSIGNED_INT: 'I'.charCodeAt(0),
  TYPE_64BIT_SIGNED_INT: 'l'.charCodeAt(0),
  TYPE_64BIT_UNSIGNED_INT: 'L'.charCodeAt(0),
  TYPE_32BIT_FLOAT: 'f'.charCodeAt(0),
  TYPE_64BIT_FLOAT: 'd'.charCodeAt(0),
  TYPE_8BYTE_ARRAY: 'b'.charCodeAt(0),

  // Tx status
  TX_STAT_NONE: 0x00,
  TX_STAT_SENDING: 0x01,
  TX_STAT_FAILURE: 0x02,

  // File status (metadata)
  FILE_STATUS_ERROR: 0x01,
  FILE_STATUS_INVALID_REQUEST: 0x02,
  FILE_STATUS_NOTFOUND: 0x81,
  FILE_STATUS_SERVER_ERROR: 0x82,
  FILE_STATUS_INVALID_DATA: 0x83,

  // File download status
  FILE_DOWNLOAD_STATUS_UNKNOWN: 0x00,
  FILE_DOWNLOAD_STATUS_SENDING_REQUEST: 0x01,
  FILE_DOWNLOAD_STATUS_RECEIVING: 0x02,
  FILE_DOWNLOAD_STATUS_ERROR: 0x81
}
