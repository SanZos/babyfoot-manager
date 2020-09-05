/* global WebSocket, location, crypto */

let ws
const uuid = CreateUUID()
const game = []
const timeout = 2000

document.addEventListener('DOMContentLoaded', () => {
  connect()
  document.querySelector('button.validate').addEventListener('click', event => {
    event.preventDefault()
    const gameName = document.querySelector('input#game').value
    if (gameName !== '') {
      const gameObject = { type: 'newGame', gameName: gameName, finished: false }
      game.push(gameObject)
      sendNewGameToWebsocket(gameObject)
    }
  })
})

function CreateUUID () {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

function sendNewGameToWebsocket (gameObject) {
  ws.send(JSON.stringify({ socketId: uuid, data: gameObject }))
}

function connect () {
  ws = new WebSocket(`ws://${document.location.host}`)
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ socketId: uuid, message: 'Hello!' }))
    keepAlive()
  })

  ws.addEventListener('message', event => {
    console.log(event.data)
    try {
      const data = JSON.parse(event.data)
      if (data.message === 'reload') location.reload()
    } catch (error) {
      console.error('Unable to parse JSON', event.data)
    }
  })

  ws.addEventListener('close', data => {
    console.log(data)
    setTimeout(function () {
      connect()
    }, timeout)
  })
}

function keepAlive () {
  if (ws.readyState === ws.OPEN) {
    ws.send('')
    setTimeout(keepAlive, timeout)
  } else console.log(ws.readyState)
}
