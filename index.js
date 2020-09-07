const process = require('process')
const fs = require('fs')

const configurationFile = require('./static/configuration.json')

const WebServer = require('./src/web/webserver')
const WebRouter = require('./src/web/webrouter')

const { WebSocketServer, sendData } = require('./src/websocket/websocketserver')
const WebSocketRouter = require('./src/websocket/websocketrouter')

const Database = require('./src/database')

try {
  new WebServer()
    .registerRouter(new WebRouter({ clientPath: `${__dirname}/${configurationFile.server.clientPath}` }))
    .registerDatabase(new Database(configurationFile.database))
    .registerWebSocketRouter(new WebSocketRouter())
    .registerWebSocket(new WebSocketServer())
    .start(configurationFile.server)

  if (process.env.NODE_ENV === 'dev') {
    configurationFile.dev.watch.forEach(w => {
      console.log(`Watching du fichier ${w}`)
      fs.watchFile(`${__dirname}/${configurationFile.server.clientPath}/${w}`, (curr, prev) => {
        console.log(`Mise à jour du fichier ${w}, demande de rafraîchissement des clients`)
        sendData('server', 'all', { type: 'reload', message: `Mise à jour du fichier ${w}, demande de rafraîchissement des clients` })
      })
    })
  }
} catch (error) {
  console.error(error)
  process.exit(-1)
}
