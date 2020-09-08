const { constructReply, sendData } = require('./websocketserver')

/**
 * Routeur de WebSocket
 * @prop {(Database|null)} database gestionnaire de la base
 */
class WebSocketRouter {
  /**
   * Initialisation des attributs du routeur de WebSocket
   */
  constructor () {
    this.database = null
  }

  /**
   * Ajout de la liaison avec la base de données
   * @param {Database} database gestionnaire de la base de donées
   */
  registerDatabase (database) {
    this.database = database
  }

  /**
   * Routage des messages en provenance du WebSocket
   *
   * Liste des type de repsonse :
   *  'init' => Initialisation du client
   *  'getGames' => Récupération de tout les jeux
   *  'newGame' => Ajout d'un nouveau jeu
   *  'deleteGame' => Suppression d'un jeu
   *  'updateGame' => Mise à jour de l'état du jeu
   *  'changeUsername' => Changement du nom d'utilisateur du client
   *  'message' => Envoie de message aux autres clients
   *
   * @param {net.Socket} socket websocket a traiter
   * @param {object} response donnée envoyer par le websocket
   *
   * @returns Promise
   */
  route (socket, response) {
    if (typeof response === 'object' && response.type !== undefined && response.type !== null) {
      if (process.env.NODE_ENV === 'dev') console.log(socket.socketId, response)
      switch (response.type) {
        case 'init':
          socket.socketId = response.socketId
          socket.username = response.username
          socket.write(constructReply({ type: response.type, message: 'complete' }))
          return Promise.resolve()
        case 'getGames':
          return this.database.getParties().then(gamesObject => {
            sendData('server', socket.socketId, { type: response.type, data: gamesObject })
          }).catch(error => {
            console.error('Erreur de récupération', error)
          })
        case 'newGame':
          return this.database.addPartie(response.data.gameName).then(returnId => {
            sendData(socket.socketId, 'all', { type: response.type, data: { gameId: returnId, gameName: response.data.gameName, finished: response.data.finished } })
          }).catch(error => {
            console.error('Erreur d\'insertion', error)
          })
        case 'deleteGame':
          return this.database.deleteGame(response.data.gameId).then(() => {
            sendData(socket.socketId, 'all', { type: response.type, data: { gameId: response.data.gameId } })
          }).catch(error => {
            console.error('Erreur de suppression', error)
          })
        case 'updateGame':
          return this.database.toggleFinished(response.data.gameId).then(newVal => {
            sendData(socket.socketId, 'all', { type: response.type, data: { gameId: response.data.gameId, finished: newVal } })
          }).catch(error => {
            console.error('Erreur de mise à jour', error)
          })
        case 'changeUsername':
          sendData(socket.socketId, 'other', { type: response.type, username: response.username, oldUsername: socket.username, message: response.message })
          socket.username = response.username
          return Promise.resolve()
        case 'message':
          sendData(socket.socketId, response.to, { type: 'message', username: socket.username, message: response.message })
          return Promise.resolve()
        default:
          return Promise.resolve()
      }
    }
  }
}

module.exports = WebSocketRouter
