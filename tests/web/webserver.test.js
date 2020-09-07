const { runner } = require('../testUtils')
const http = require('http')

const WebServer = require('../../src/web/webserver')

class WebServerTest {
  /**
   * Test du contructeur
   * @see WebServer()
   */
  static constructorTest () {
    WebServerTest.object = new WebServer()

    // Test de la création de l'objet
    runner('ok', WebServerTest.object instanceof WebServer)

    // Vérification de l'existence des attributs
    runner('equal', WebServerTest.object.database, null)
    runner('equal', WebServerTest.object.webRouter, null)
    runner('equal', WebServerTest.object.webSocketServer, null)
    runner('equal', WebServerTest.object.webSocketRouter, null)
    runner('ok', WebServerTest.object.server instanceof http.Server)
  }

  /**
   * Test de la liaison du routeur
   * @see WebServer.registerRouter
   */
  static registerRouterTest () {
    // mockUp
    const f = () => { }

    // Vérification de la modification de l'instance et du retour
    runner('deepEqual', WebServerTest.object.registerRouter(f), WebServerTest.object)

    // Vérification de la liaison
    runner('deepEqual', WebServerTest.object.webRouter, f)

    // Vérification de la création du listener sur request
    runner('equal', WebServerTest.object.server.listeners('request')[0].toString(), ((req, res) => { this.webRouter.handle(req, res) }).toString())
  }

  /**
   * Test de la liaison avec la base
   * @see WebServer.registerDatabase
   */
  static registerDatabaseTest () {
    // mockUp
    const f = () => { }

    // Vérification de la modification de l'instance et du retour
    runner('deepEqual', WebServerTest.object.registerDatabase(f), WebServerTest.object)

    // Vérification de la liaison
    runner('deepEqual', WebServerTest.object.database, f)
  }

  /**
   * Test de la liaison avec le routeur de websocket
   * @see WebServer.registerWebSocketRouter
   */
  static registerWebSocketRouterTest () {
    // mockUp
    const f = {
      database: null,
      registerDatabase: (database) => { f.database = database }
    }

    // Vérification de la modification de l'instance et du retour
    runner('deepEqual', WebServerTest.object.registerWebSocketRouter(f), WebServerTest.object)

    // Vérification de la liaison
    runner('deepEqual', WebServerTest.object.webSocketRouter, f)

    // Vérification du fait que la base de donnée est la même
    runner('deepEqual', WebServerTest.object.webSocketRouter.database, WebServerTest.object.database)
  }

  /**
   * Test de la liaison avec le serveur de websocket
   * @see WebServer.registerWebSocket
   */
  static registerWebSocketTest () {
    // mockUp
    const f = {
      router: null,
      registerRouter: (webSocketRouter) => { f.router = webSocketRouter }
    }

    // Vérification de la modification de l'instance et du retour
    runner('deepEqual', WebServerTest.object.registerWebSocket(f), WebServerTest.object)

    // Vérification de la liaison
    runner('deepEqual', WebServerTest.object.webSocketServer, f)

    // Vérification de la création du listener sur request
    runner('equal', WebServerTest.object.server.listeners('upgrade')[0].toString(), ((req, socket, head) => {
      if (req.headers.upgrade !== 'websocket') {
        socket.end('HTTP/1.1 400 Bad Request')
        return
      }
      this.webSocketServer.handshake(req, socket)
    }).toString())

    // Vérification du fait que le router de webservice est le même
    runner('deepEqual', WebServerTest.object.webSocketServer.router, WebServerTest.object.webSocketRouter)
  }

  /**
   * Test du démarrage du serveur
   * @see WebServer.start
   */
  static startTest () {
    WebServerTest.object.start({ port: 8080 })

    // Verification du démarrage du version
    runner('ok', WebServerTest.object.server.listening)

    // Fermeture de la connexion
    WebServerTest.object.server.close()
  }
}

WebServerTest.object = {}

module.exports = WebServerTest
