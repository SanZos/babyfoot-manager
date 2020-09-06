const process = require('process')
const __root = process.cwd()

const configurationFile = require(`${__root}/static/configuration.json`)

const mime = {
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
}

// gestion de la base de donnée
const Database = require('./database')
const db = new Database(configurationFile.database)

const http = require('http')
const fs = require('fs')
const path = require('path')

const srv = http.createServer((req, res) => {
  const [type, file] = routeur(req.url)
  if (type === null || file === null) {
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end('<html><body style="display: flex;background-color: #242933;color: #D8DEE9;justify-content: center;align-items: center;"><h1>404 - NOT FOUND</h1></body></html>')
  } else {
    res.writeHead(200, { 'Content-Type': mime[type] })
    res.end(fs.readFileSync(file))
  }
})

const routeur = (filePath) => {
  if (filePath === '/') {
    filePath = '/index.html'
  }
  if (fs.existsSync(`${__root}/${configurationFile.server.clientPath}${filePath}`)) {
    return [path.extname(filePath), `${__root}/${configurationFile.server.clientPath}${filePath}`]
  } else return [null, null]
}

const WebSocketServer = require('./websocket/server')
WebSocketServer.database = db

srv.on('upgrade', (req, socket, head) => {
  if (req.headers.upgrade !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request')
    return
  }
  WebSocketServer.handshake(req, socket)
})

configurationFile.dev.watch.forEach(w => {
  console.log(`Watching du fichier ${w}`)
  fs.watchFile(`${__root}/${configurationFile.server.clientPath}/${w}`, (curr, prev) => {
    console.log(`Mise à jour du fichier ${w}, demande de rafraichissement des clients`)
    WebSocketServer.sendData('server', 'all', { type: 'reload', message: `Mise à jour du fichier ${w}, demande de rafraichissement des clients` })
  })
})

srv.listen(configurationFile.server.port, '0.0.0.0', () => { })
