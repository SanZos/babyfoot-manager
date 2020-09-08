
const { runner } = require('../testUtils')
const { WebSocketServer } = require('../../src/websocket/websocketserver')

// MockUp
const socket = {
  socketId: 'PCTVnEp5Fgk+FSRxTmDP8XrJlSk=',
  data: '',
  listeners: new Map(),
  write: (data) => { socket.data = data },
  on: (type, callback) => { socket.listeners.set(type, callback) },
  end: () => { },
  destroy: () => { }
}

const acceptKey = 'Miv1a+VUO6asXh0R0XO3mw=='

const testAcceptKeys = [
  'DbTXmy+hzShlxVtG+XWP5g==',
  'F/EXjTH1W7LjO86vQPHBFQ==',
  'cx78622UtFcCGe7m+RMP1A==',
  '/UHqPVWLYRTyC+pctBpBeg==',
  'zXGD8zeHQj696OTfGtgkWw=='
]
const testHashes = [
  'gXE/KvVIU2fwSXEz7tL59rxRL9M=',
  'gpEIVflf1bw12E31OvHvUXPU+Z0=',
  'QlwXJP9bIM/VExUfe0eXwA+jmLw=',
  'tLRkYaG8iqMzFX9VkkSIuq8Ko6Y=',
  'bkWlFGYRJ8SgikPJrUJ1RaHVRc8='
]

class WebSocketServerTest {
  /**
   * Test du constructeur
   * @see WebSocketServer
   */
  static constructorTest () {
    // Test de la création de l'objet
    WebSocketServerTest.object = new WebSocketServer()
    runner('ok', WebSocketServerTest.object instanceof WebSocketServer)

    // Test des valeurs initial
    runner('equal', WebSocketServerTest.object.router, null)
  }

  /**
   * Test de la liaison avec le routeur
   * @see WebSocketServer.registerRouter
   */
  static registerRouterTest () {
    const f = {
      route: () => { }
    }
    WebSocketServerTest.object.registerRouter(f)
    runner('equal', WebSocketServerTest.object.router, f)
  }

  /**
   * Test de l'upgrade du client http en websocket
   * @see WebSocketServer.handshake
   */
  static handshakeTest () {
    const req = {
      headers: {
        'sec-websocket-key': acceptKey
      }
    }

    // Test du retour du socket mis à jour
    runner('deepEqual', WebSocketServerTest.object.handshake(req, socket), socket)

    // Test de l'entête envoyer par le serveur
    runner('equal', socket.data, 'HTTP/1.1 101 Web Socket Protocol Handshake\r\nUpgrade: WebSocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: PCTVnEp5Fgk+FSRxTmDP8XrJlSk= \r\n\r\n')

    // Suppression du socket enregistrer
    WebSocketServer.registeredWebsocket.delete(acceptKey)
  }

  /**
   * Test de la génération de la clef
   * @see WebSocketServer.generateAcceptValue
   */
  static generateAcceptValueTest () {
    // Test de la génération de 5 hashs
    for (let i = 0; i < testAcceptKeys.length; i++) {
      runner('equal', WebSocketServerTest.object.generateAcceptValue(testAcceptKeys[i]), testHashes[i])
    }
  }

  /**
   * Test de l'enregistrement du socket'
   * @see WebSocketServer.registerSocket
   */
  static registerSocketTest () {
    // Test de la non présence de socket
    runner('deepEqual', WebSocketServer.registeredWebsocket, new Map())

    // Test de l'enregistrement d'un socket
    WebSocketServerTest.object.registerSocket(socket, acceptKey)
    runner('equal', WebSocketServer.registeredWebsocket.size, 1)
    runner('deepEqual', WebSocketServer.registeredWebsocket.get(acceptKey), socket)

    // Test de la présence des eventLisentners
    runner('equal', typeof socket.listeners.get('timeout'), 'function')
    runner('equal', typeof socket.listeners.get('data'), 'function')
  }

  /**
   * Test de l'envoie de donnée
   * @see WebSocketServer.sendData
   */
  static sendDataTest () {
    // Test du retour si pas de destinataire
    runner('equal', WebSocketServer.sendData('', null, null), null)

    // Test de l'envoie d'un message a un socket
    WebSocketServer.sendData('server', 'PCTVnEp5Fgk+FSRxTmDP8XrJlSk=', 'Message transmit')
    runner('deepEqual', socket.data, WebSocketServer.constructReply(Object.assign({ from: 'server' }, 'Message transmit')))

    // Test de l'envoie d'un message aux autres sockets
    WebSocketServer.sendData('PCTVnEp5FgkFSRxTmDP8XrJlSk=', 'other', 'Ah')
    runner('deepEqual', socket.data, WebSocketServer.constructReply(Object.assign({ from: 'PCTVnEp5FgkFSRxTmDP8XrJlSk=' }, 'Ah')))

    // Test de l'envoie d'un message a tout le monde les sockets
    WebSocketServer.sendData('PCTVnEp5FgkFSRxTmDP8XrJlSk=', 'all', 'Nouveau message')
    runner('deepEqual', socket.data, WebSocketServer.constructReply(Object.assign({ from: 'PCTVnEp5FgkFSRxTmDP8XrJlSk=' }, 'Nouveau message')))
  }

  /**
   * Test de la création de packet de WebSocket
   * @see WebSocketServer.constructReply
   */
  static constructReplyTest () {
    // Test de l'encodage d'un message
    runner('deepEqual', WebSocketServer.constructReply('Ah'), Buffer.from([0x81, 0x04, 0x22, 0x41, 0x68, 0x22]))
  }
}

/** @type WebSocketServer */
WebSocketServerTest.object = {}

module.exports = WebSocketServerTest
