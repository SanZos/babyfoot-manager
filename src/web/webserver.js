const http = require('http')

/**
 * Serveur Web
 * @prop {(Database|null)} database gestionnaire de la base
 * @prop {(WebRouter|null)} webRouter routeur web
 * @prop {(WebSocketServer|null)} webSocketServer serveur de WebSockets
 * @prop {(WebSocketRouter|null)} webSocketRouter routeur de WebSockets
 * @prop {http.Server} server serveur HTTP
 */
class WebServer {
  /**
   * Initialisation des attributs du serveur web
   */
  constructor () {
    this.database = null
    this.webRouter = null
    this.webSocketServer = null
    this.webSocketRouter = null
    this.server = http.createServer()
    return this
  }

  /**
   * Ajout de la liaison avec le routeur http
   * @param {WebRouter} WebRouter instance du routeur http
   */
  registerRouter (WebRouter) {
    this.webRouter = WebRouter
    this.server.on('request', (req, res) => { this.webRouter.handle(req, res) })
    return this
  }

  /**
   * Ajout de la liaison avec le module d'accès à la base
   * @param {Database} Database instance du module d'accès à la base
   */
  registerDatabase (Database) {
    this.database = Database
    return this
  }

  /**
   * Ajout de la liaison avec le routeur pour les websockets
   * @param {WebSocketRouter} WebSocketRouter instance du routeur de websockets
   */
  registerWebSocketRouter (WebSocketRouter) {
    this.webSocketRouter = WebSocketRouter
    this.webSocketRouter.registerDatabase(this.database)
    return this
  }

  /**
   * Ajout de la liaison avec le serveur de websockets
   * @param {WebSocketServer} WebSocketServer instance serveur de websockets
   */
  registerWebSocket (WebSocketServer) {
    this.webSocketServer = WebSocketServer
    this.webSocketServer.registerRouter(this.webSocketRouter)
    this.server.on('upgrade', (req, socket, head) => {
      if (req.headers.upgrade !== 'websocket') {
        socket.end('HTTP/1.1 400 Bad Request')
        return
      }
      this.webSocketServer.handshake(req, socket)
    })
    return this
  }

  /**
   * Lancement du serveur
   */
  start (configuration) {
    this.server.listen(configuration.port)
  }
}

module.exports = WebServer
