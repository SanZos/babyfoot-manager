/**
   * Création de la trame de réponse du websocket
   * @param {any} data donnée a envoyer au client du websocket
   */
exports.constructReply = (data) => {
  const json = JSON.stringify(data)
  const jsonByteLength = Buffer.byteLength(json)
  const lengthByteCount = jsonByteLength < 126 ? 0 : 2
  const payloadLength = lengthByteCount === 0 ? jsonByteLength : 126
  const buffer = Buffer.alloc(2 + lengthByteCount + jsonByteLength)
  buffer.writeUInt8(0b10000001, 0)
  buffer.writeUInt8(payloadLength, 1)
  let payloadOffset = 2
  if (lengthByteCount > 0) {
    buffer.writeUInt16BE(jsonByteLength, 2); payloadOffset += lengthByteCount
  }
  buffer.write(json, payloadOffset)
  return buffer
}
