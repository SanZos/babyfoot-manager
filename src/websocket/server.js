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
   * @param {String} acceptKey clé d'acceptation envoyée par le client
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
        WebSocketServer.route(socket, response, acceptKey)
      } else if (response === null) {
        delete WebSocketServer.registeredWebsocket[acceptKey]
        socket.end()
        socket.destroy()
        console.log(`WebSocket ${acceptKey} connection closed.`)
      }
    })
  }

  static route (socket, response) {
    if (typeof response === 'object' && response.type !== undefined && response.type !== null) {
      console.log(socket.socketId, response)
      switch (response.type) {
        case 'init':
          socket.socketId = response.socketId
          socket.username = response.username
          socket.write(WebSocketServer.constructReply({ type: response.type, message: 'complete' }))
          break
        case 'getGames':
          try {
            const games = WebSocketServer.database.executeQuery('SELECT * FROM partie ORDER BY id;')
            const gamesObject = []
            for (const game of games) {
              gamesObject.push({
                gameId: game[0],
                gameName: game[1],
                finished: game[2] === 't'
              })
            }
            WebSocketServer.sendData('server', socket.socketId, { type: response.type, data: gamesObject })
          } catch (error) {
            console.error('Erreur de récupération', error)
          }
          break
        case 'newGame':
          try {
            const returnId = WebSocketServer.database.executeQuery(`INSERT INTO partie (name) VALUES ('${response.data.gameName}') RETURNING id;`)[0][0].split('\n')[0]
            WebSocketServer.sendData(socket.socketId, 'all', { type: response.type, data: { gameId: returnId, gameName: response.data.gameName, finished: response.data.finished } })
          } catch (error) {
            console.error('Erreur d\'insertion', error)
          }
          break
        case 'deleteGame':
          try {
            const retour = WebSocketServer.database.executeQuery(`DELETE FROM partie WHERE id = ${response.data.gameId};`)
            console.log(retour)
            WebSocketServer.sendData(socket.socketId, 'all', { type: response.type, data: { gameId: response.data.gameId } })
          } catch (error) {
            console.error('Erreur de suppression', error)
          }
          break
        case 'updateGame':
          try {
            const retour = WebSocketServer.database.executeQuery(`UPDATE partie SET finished = NOT(finished) WHERE id = ${response.data.gameId} RETURNING finished;`)
            console.log(retour)
            WebSocketServer.sendData(socket.socketId, 'all', { type: response.type, data: { gameId: response.data.gameId } })
          } catch (error) {
            console.error('Erreur de mise à jour', error)
          }
          break
        case 'changeUsername':
          WebSocketServer.sendData(socket.socketId, 'other', { type: response.type, username: response.username, oldUsername: socket.username, message: response.message })
          socket.username = response.username
          break
        case 'message':
          WebSocketServer.sendData(socket.socketId, response.to, { type: 'message', username: socket.username, message: response.message })
          break
        default:
          break
      }
    }
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
          WebSocketServer.registeredWebsocket[acceptKey].write(WebSocketServer.constructReply(sendMessage))
        } catch (error) {
          console.error(error.name, error)
          if (error.code === 'ERR_STREAM_DESTROYED') delete WebSocketServer.registeredWebsocket[acceptKey]
        }
      })
    }
  }
}

WebSocketServer.registeredWebsocket = {}
WebSocketServer.database = null

module.exports = WebSocketServer
