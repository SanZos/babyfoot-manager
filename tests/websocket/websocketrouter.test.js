const { runner } = require('../testUtils')
const { constructReply, sendData } = require('../../src/websocket/websocketserver')

const save = {
  constructReply: null,
  sendData: null
}

// Sauvegarde des fonctions
save.constructReply = constructReply.bind({})
save.sendData = sendData.bind({})

// Ré-écriture des exports du serveur pour évité les collisions de test
module.children[1].exports.sendData = (...data) => { WebSocketRouterTest.data = data }
module.children[1].exports.constructReply = (data) => { return data }

const WebSocketRouter = require('../../src/websocket/websocketrouter')

class WebSocketRouterTest {
  static tearsDown () {
    // Ré-écriture des exports du serveur pour évité les collisions de test
    module.children[1].exports.sendData = save.sendData.bind({})
    module.children[1].exports.constructReply = save.constructReply.bind({})
  }

  /**
   * Test du constructeur
   * @see WebSocketRouter
   */
  static constructorTest () {
    // Test de la création de l'objet
    WebSocketRouterTest.object = new WebSocketRouter()
    runner('ok', WebSocketRouterTest.object instanceof WebSocketRouter)

    // Test des valeurs initial
    runner('equal', WebSocketRouterTest.object.database, null)
  }

  /**
   * Test de la liaison avec la base de données
   * @see WebSocketRouter.registerDatabase
   */
  static registerDatabaseTest () {
    // Mockup
    const f = {
      data: null,
      getParties: (data) => {
        f.data = data
        return Promise.resolve({})
      },
      addPartie: (data) => {
        f.data = data
        return Promise.resolve(12)
      },
      deleteGame: (data) => {
        f.data = data
        return Promise.resolve()
      },
      toggleFinished: (data) => {
        f.data = data
        return Promise.resolve('f')
      }
    }
    // Test de l'ajout de la base
    WebSocketRouterTest.object.registerDatabase(f)

    runner('deepEqual', WebSocketRouterTest.object.database, f)
  }

  /**
   * Test du routage
   * @see WebSocketRouter.route
   */
  static async routeTest () {
    // MockUp
    const socket = {
      socketId: '',
      username: '',
      data: '',
      write: (data) => { socket.data = data }
    }

    const response = {
      type: 'init',
      socketId: 'f6e23fc8-1dd0-4e5e-a011-ea2ae22dea23',
      username: 'Testing User 1'
    }

    // Test de l'initialisation
    await WebSocketRouterTest.object.route(socket, response)
    runner('deepEqual', socket.data, { type: 'init', message: 'complete' })
    runner('equal', socket.socketId, response.socketId)
    runner('equal', socket.username, response.username)

    //  Test du routage de récupération de donnée de la base et d'envoie au client
    response.type = 'getGames'
    await WebSocketRouterTest.object.route(socket, response)
    runner('deepEqual', WebSocketRouterTest.data, ['server', socket.socketId, { type: response.type, data: {} }])
    runner('equal', socket.socketId, response.socketId)
    runner('equal', socket.username, response.username)

    // Test du routage de l'ajout d'un jeu
    response.type = 'newGame'
    response.data = { gameName: 'Test X l\'autre test', finished: 'f' }
    await WebSocketRouterTest.object.route(socket, response)
    runner('deepEqual', WebSocketRouterTest.data, [socket.socketId, 'all', { type: response.type, data: { gameId: 12, gameName: response.data.gameName, finished: response.data.finished } }])
    runner('equal', socket.socketId, response.socketId)
    runner('equal', socket.username, response.username)

    // Test du routage de la suppression d'un jeu
    response.type = 'deleteGame'
    response.data = { gameId: 5 }
    await WebSocketRouterTest.object.route(socket, response)
    runner('deepEqual', WebSocketRouterTest.data, [socket.socketId, 'all', { type: response.type, data: { gameId: response.data.gameId } }])
    runner('equal', socket.socketId, response.socketId)
    runner('equal', socket.username, response.username)

    // Test du routage de la mise à jour d'un jeu
    response.type = 'updateGame'
    response.data = { gameId: 5, finished: 'f' }
    await WebSocketRouterTest.object.route(socket, response)
    runner('deepEqual', WebSocketRouterTest.data, [socket.socketId, 'all', { type: response.type, data: { gameId: response.data.gameId, finished: 'f' } }])
    runner('equal', socket.socketId, response.socketId)
    runner('equal', socket.username, response.username)

    // Test du changement d'utilisateur
    response.type = 'changeUsername'
    response.username = 'Utilisateur 2'
    await WebSocketRouterTest.object.route(socket, response)
    runner('deepEqual', WebSocketRouterTest.data, [socket.socketId, 'other', { type: response.type, username: response.username, oldUsername: 'Testing User 1', message: response.message }])
    runner('equal', socket.socketId, response.socketId)
    runner('notEqual', socket.username, 'Testing User 1')
    runner('equal', socket.username, response.username)

    response.type = 'message'
    response.to = 'all'
    await WebSocketRouterTest.object.route(socket, response)
    runner('deepEqual', WebSocketRouterTest.data, [socket.socketId, response.to, { type: 'message', username: socket.username, message: response.message }])
  }
}

WebSocketRouterTest.data = {}

/** @type WebSocketRouter */
WebSocketRouterTest.object = {}

module.exports = WebSocketRouterTest
