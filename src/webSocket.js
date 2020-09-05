/**
 * Gestion des WebSockets coté serveur
 */
const crypto = require('crypto')

class WebSocketServer {
  /**
   * Gestion de l'upgrade en websocket
   * @param {IncomingMessage} req requête HTTP
   * @param {Socket} socket websocket
   */
  static handshake (req, socket) {
    const acceptKey = req.headers['sec-websocket-key']
    const hash = WebSocketServer.generateAcceptValue(acceptKey)
    socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
      'Upgrade: WebSocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${hash} \r\n` +
      '\r\n')

    WebSocketServer.registerSocket(socket, acceptKey)

    return socket
  }

  /**
   * Génération de la valeur d'acceptation en signant la clé Sec-WebSocket-Key
   * @see : https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-WebSocket-Accept
   */
  static generateAcceptValue (acceptKey) {
    return crypto
      .createHash('sha1')
      .update(acceptKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
      .digest('base64')
  }

  /**
   * Traitement de la trame d'entrée du websocket client
   * @param {Buffer} buffer donnée d'entré du websocket
   */
  static parseFrame (buffer) {
    const firstByte = buffer.readUInt8(0)
    const opCode = firstByte & 0xF
    if (opCode === 0x8) {
      return null
    }
    if (opCode !== 0x1) {
      return
    }

    const secondByte = buffer.readUInt8(1)
    const isMasked = Boolean((secondByte >>> 7) & 0x1)
    let currentOffset = 2
    let payloadLength = secondByte & 0x7F
    if (payloadLength > 125) {
      if (payloadLength === 126) {
        payloadLength = buffer.readUInt16BE(currentOffset)
        currentOffset += 2
      } else {
        throw new Error('Large payloads not currently implemented')
      }
    }
    const data = Buffer.alloc(payloadLength)
    if (isMasked) {
      WebSocketServer.unMaskFrame(buffer, data, currentOffset, payloadLength)
    } else {
      buffer.copy(data, 0, currentOffset++)
    }
    const json = data.toString('ascii')
    try {
      return JSON.parse(json)
    } catch {
      return json
    }
  }

  /**
   * Application du XOR pour avoir les données du message
   * @param {Buffer} buffer entrée issu du websocket
   * @param {Buffer} data donnée traité
   * @param {Number} currentOffset offset de l'entrée du websocket
   * @param {Number} payloadLength taille du payload de l'entrée du websocket
   */
  static unMaskFrame (buffer, data, currentOffset, payloadLength) {
    const maskingKey = buffer.readUInt32BE(currentOffset)
    currentOffset += 4
    for (let i = 0, j = 0; i < payloadLength; ++i, j = i % 4) {
      const shift = j === 3 ? 0 : (3 - j) << 3
      const mask = (shift === 0 ? maskingKey : (maskingKey >>> shift)) & 0xFF
      const source = buffer.readUInt8(currentOffset++)
      data.writeUInt8(mask ^ source, i)
    }
  }

  /**
   * Création de la trame de réponse du websocket
   * @param {any} data donnée a envoyer au client du websocket
   */
  static constructReply (data) {
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

  /**
   * On enregistre les websockets pour garder une trace
   * @param {Socket} socket websocket
   * @param {String} acceptKey clé unique envoyer par le client
   */
  static registerSocket (socket, acceptKey) {
    WebSocketServer.registeredWebsocket[acceptKey] = socket
    socket.on('timeout', data => {
      console.log(`Timeout WebSocket ${acceptKey} connection closed.`)
      socket.destroy()
      delete WebSocketServer.registeredWebsocket[acceptKey]
    })
    socket.on('data', data => {
      const response = WebSocketServer.parseFrame(data)
      if (response) {
        socket.write(WebSocketServer.constructReply({ message: 'Réponse de ouf', detail: response.message }))
      } else if (response === null) {
        delete WebSocketServer.registeredWebsocket[acceptKey]
        socket.end()
        socket.destroy()
        console.log(`WebSocket ${acceptKey} connection closed.`)
      }
    })
  }
}

WebSocketServer.registeredWebsocket = {}

module.exports = WebSocketServer
