const http = require('http')
const fs = require('fs')
const WebSocketServer = require('./webSocket')

// Create an HTTP server
const srv = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(fs.readFileSync(`${__dirname}/index.html`))
})

srv.on('upgrade', (req, socket, head) => {
  if (req.headers.upgrade !== 'websocket') {
    socket.end('HTTP/1.1 400 Bad Request')
    return
  }
  WebSocketServer.handshake(req, socket)
})

// now that server is running
srv.listen(1337, '127.0.0.1', () => { })
