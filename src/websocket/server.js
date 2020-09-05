/**
 * Gestion des WebSockets coté serveur
 */
const crypto = require('crypto')
const WebSocketFrame = require('./frame')

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
      const response = new WebSocketFrame(data).parseFrame()
      if (response) {
        socket.write(WebSocketServer.constructReply({ message: 'Réponse de ouf', detail: response }))
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
