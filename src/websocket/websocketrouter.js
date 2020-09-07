const { constructReply } = require('./websocketutils')
const { sendData } = require('./websocketserver')

class WebSocketRouter {
  constructor () {
    this.database = null
  }

  registerDatabase (database) {
    this.database = database
  }

  route (socket, response) {
    if (typeof response === 'object' && response.type !== undefined && response.type !== null) {
      console.log(socket.socketId, response)
      switch (response.type) {
        case 'init':
          socket.socketId = response.socketId
          socket.username = response.username
          socket.write(constructReply({ type: response.type, message: 'complete' }))
          break
        case 'getGames':
          try {
            const games = this.database.executeQuery('SELECT * FROM partie ORDER BY id;')
            const gamesObject = []
            for (const game of games) {
              gamesObject.push({
                gameId: game[0],
                gameName: game[1],
                finished: game[2] === 't'
              })
            }
            sendData('server', socket.socketId, { type: response.type, data: gamesObject })
          } catch (error) {
            console.error('Erreur de récupération', error)
          }
          break
        case 'newGame':
          try {
            const returnId = this.database.executeQuery(`INSERT INTO partie (name) VALUES ('${response.data.gameName}') RETURNING id;`)[0][0].split('\n')[0]
            sendData(socket.socketId, 'all', { type: response.type, data: { gameId: returnId, gameName: response.data.gameName, finished: response.data.finished } })
          } catch (error) {
            console.error('Erreur d\'insertion', error)
          }
          break
        case 'deleteGame':
          try {
            const retour = this.database.executeQuery(`DELETE FROM partie WHERE id = ${response.data.gameId};`)
            console.log(retour)
            sendData(socket.socketId, 'all', { type: response.type, data: { gameId: response.data.gameId } })
          } catch (error) {
            console.error('Erreur de suppression', error)
          }
          break
        case 'updateGame':
          try {
            const retour = this.database.executeQuery(`UPDATE partie SET finished = NOT(finished) WHERE id = ${response.data.gameId} RETURNING finished;`)
            console.log(retour)
            sendData(socket.socketId, 'all', { type: response.type, data: { gameId: response.data.gameId } })
          } catch (error) {
            console.error('Erreur de mise à jour', error)
          }
          break
        case 'changeUsername':
          sendData(socket.socketId, 'other', { type: response.type, username: response.username, oldUsername: socket.username, message: response.message })
          socket.username = response.username
          break
        case 'message':
          sendData(socket.socketId, response.to, { type: 'message', username: socket.username, message: response.message })
          break
        default:
          break
      }
    }
  }
}

module.exports = WebSocketRouter
