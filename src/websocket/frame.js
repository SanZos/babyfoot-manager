class WebSocketFrame {
  /**
  * @param {Buffer} buffer donnée d'entré du websocket
  */
  constructor (buffer) {
    this.buffer = buffer
    this.currentOffset = 2
    this.payloadLength = 0
    this.data = null
  }

  /**
  * Traitement de la trame d'entrée du websocket client
  */
  parseFrame () {
    const firstByte = this.buffer.readUInt8(0)
    const opCode = firstByte & 0xF
    if (opCode === 0x8) {
      return null
    }
    if (opCode !== 0x1) {
      return
    }

    const secondByte = this.buffer.readUInt8(1)
    const isMasked = Boolean((secondByte >>> 7) & 0x1)
    this.payloadLength = secondByte & 0x7F
    if (this.payloadLength > 125) {
      if (this.payloadLength === 126) {
        this.payloadLength = this.buffer.readUInt16BE(this.currentOffset)
        this.currentOffset += 2
      } else {
        throw new Error('On ne traite que les trames dont le payload est sur 7 bits')
      }
    }
    this.data = Buffer.alloc(this.payloadLength)
    if (isMasked) {
      this.unMaskFrame(this.buffer, this.data, this.currentOffset, this.payloadLength)
    } else {
      this.buffer.copy(this.data, 0, this.currentOffset++)
    }
    const dataString = this.data.toString('utf-8')
    try {
      return JSON.parse(dataString)
    } catch {
      return dataString
    }
  }

  /**
   * Application du XOR pour avoir les données du message
   */
  unMaskFrame () {
    const maskingKey = this.buffer.readUInt32BE(this.currentOffset)
    this.currentOffset += 4
    for (let i = 0, j = 0; i < this.payloadLength; ++i, j = i % 4) {
      const shift = j === 3 ? 0 : (3 - j) << 3
      const mask = (shift === 0 ? maskingKey : (maskingKey >>> shift)) & 0xFF
      const source = this.buffer.readUInt8(this.currentOffset++)
      this.data.writeUInt8(mask ^ source, i)
    }
  }
}

module.exports = WebSocketFrame
