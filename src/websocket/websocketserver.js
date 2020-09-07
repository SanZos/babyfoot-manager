/**
 * Gestion des WebSockets coté serveur
 */
const crypto = require('crypto')
const WebSocketFrame = require('./websocketframe')
const { constructReply } = require('./websocketutils')

class WebSocketServer {
  constructor () {
    this.router = null
  }

  registerRouter (router) {
    this.router = router
  }

  /**
   * Gestion de l'upgrade en websocket
   * @param {IncomingMessage} req requête HTTP
   * @param {Socket} socket websocket
   */
  handshake (req, socket) {
    const acceptKey = req.headers['sec-websocket-key']
    const hash = this.generateAcceptValue(acceptKey)
    socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
      'Upgrade: WebSocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${hash} \r\n` +
      '\r\n')

    this.registerSocket(socket, acceptKey)

    return socket
  }

  /**
   * Génération de la valeur d'acceptation en signant la clé Sec-WebSocket-Key
   * @see : https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-WebSocket-Accept
   */
  generateAcceptValue (acceptKey) {
    return crypto
      .createHash('sha1')
      .update(acceptKey + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
      .digest('base64')
  }

  /**
   * On enregistre les websockets pour garder une trace
   * @param {Socket} socket websocket
   * @param {String} acceptKey clé d'acceptation envoyée par le client
   */
  registerSocket (socket, acceptKey) {
    WebSocketServer.registeredWebsocket[acceptKey] = socket
    socket.on('timeout', data => {
      console.log(`Timeout WebSocket ${acceptKey} connection closed.`)
      socket.destroy()
      delete WebSocketServer.registeredWebsocket[acceptKey]
    })
    socket.on('data', data => {
      const response = new WebSocketFrame(data).parseFrame()
      if (response) {
        this.router.route(socket, response, acceptKey)
      } else if (response === null) {
        delete WebSocketServer.registeredWebsocket[acceptKey]
        socket.end()
        socket.destroy()
        console.log(`WebSocket ${acceptKey} connection closed.`)
      }
    })
  }

  /**
   * Envoie de donnée aux client
   * @param {UUID} from socketId du client qui envoie la demande
   * @param {UUID|string} to socketId ou text de la destination
   * @param {objet} message message a envoyer au(x) client(s)
   */
  static sendData (from, to, message) {
    let sockets = []
    if (to === 'all') {
      sockets = Object.keys(WebSocketServer.registeredWebsocket)
    } else if (to === 'other' || to !== null) {
      sockets = Object.keys(WebSocketServer.registeredWebsocket).filter(acceptKey => {
        if (to === 'other') return WebSocketServer.registeredWebsocket[acceptKey].socketId !== from
        else return WebSocketServer.registeredWebsocket[acceptKey].socketId === to
      })
    } else {
      return null
    }
    if (Array.isArray(sockets) && sockets.length > 0) {
      const sendMessage = Object.assign({ from: from }, message)
      console.log(sockets, from, to, message)
      sockets.forEach(acceptKey => {
        try {
          WebSocketServer.registeredWebsocket[acceptKey].write(constructReply(sendMessage))
        } catch (error) {
          console.error(error.name, error)
          if (error.code === 'ERR_STREAM_DESTROYED') delete WebSocketServer.registeredWebsocket[acceptKey]
        }
      })
    }
  }
}

WebSocketServer.registeredWebsocket = new Map()

exports.WebSocketServer = WebSocketServer
exports.sendData = WebSocketServer.sendData
