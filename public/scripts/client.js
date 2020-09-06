/* global WebSocket, location, crypto, confirm */

let ws
let nbUnfinished = 0
const games = new Map()
const uuid = CreateUUID()
const timeout = 2000
const gameHolder = document.querySelector('#displayGames')
const chatHolder = document.querySelector('#chatMessage')

let username = `Utilisateur-${uuid}`

document.addEventListener('DOMContentLoaded', () => {
  connect()

  const usernameInput = document.querySelector('#username')
  usernameInput.textContent = username
  usernameInput.addEventListener('dblclick', (event) => replace(event.target, 'input', changeUsername))
  usernameInput.addEventListener('touchend', (event) => replace(event.target, 'input', changeUsername))

  const messageInput = document.querySelector('#message')
  messageInput.addEventListener('keyup', (event) => {
    if (event.keyCode === 13 && messageInput.value.trim() !== '') {
      console.log(messageInput.value.trim())
      sendMessageToWebsocket(messageInput.value.trim())
      messageInput.value = ''
    }
  })

  const gameInput = document.querySelector('#game')
  gameInput.addEventListener('keyup', (event) => {
    if (event.keyCode === 13) {
      const gameName = document.querySelector('input#game').value
      if (gameName !== '') {
        const gameObject = { gameName: gameName, finished: false }
        sendGameToWebsocket(gameObject)
      }
    }
  })
})

function CreateUUID () {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

function connect () {
  ws = new WebSocket(`ws://${document.location.host}`)
  ws.addEventListener('open', () => {
    wsSend({ socketId: uuid, type: 'init', username: username })
    keepAlive()
  })

  ws.addEventListener('message', event => {
    console.log(event.data)
    try {
      const response = JSON.parse(event.data)
      switch (response.type) {
        case 'reload':
          console.log(response.message)
          location.reload()
          break
        case 'init':
          if (response.message === 'complete') getGames()
          break
        case 'getGames':
          if (Array.isArray(response.data)) {
            for (const game of response.data) {
              games.set(game.gameId, game)
            }
            response.data.forEach(game => addGame(game))
            countUnfinished()
          }
          break
        case 'newGame':
          games.set(response.data.gameId, response.data)
          addGame(response.data)
          break
        case 'updateGame':
          toggleFinished(response.data.gameId)
          break
        case 'deleteGame':
          removeGame(response.data.gameId)
          break
        case 'message':
          addMessage(response.username, response.message)
          break
        case 'changeUsername':
          chatUsernameChange(response.oldUsername, response.username)
          break
        default:
      }
    } catch (error) {
      console.error(error, event.data)
    }
  })

  ws.addEventListener('close', data => {
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

function wsSend (data) {
  ws.send(JSON.stringify(data))
}

function getGames () {
  wsSend({ socketId: uuid, type: 'getGames', data: 'all' })
  removeGame()
}

function addGame (game) {
  const contenair = document.createElement('div')
  contenair.classList.add('game')
  contenair.id = game.gameId

  const finishedIco = document.createElement('img')
  finishedIco.classList.add('small')
  finishedIco.classList.add('left')
  if (!game.finished) finishedIco.classList.add('running')
  finishedIco.src = './img/check_circle-black-24dp.svg'

  finishedIco.onclick = () => wsSend({ type: 'updateGame', data: { gameId: game.gameId } })

  const deleteIco = document.createElement('img')
  deleteIco.classList.add('small')
  deleteIco.classList.add('right')
  deleteIco.src = './img/disabled_by_default-black-24dp.svg'

  deleteIco.onclick = () => {
    if (confirm(`Voulez vous supprimer la partie ${game.gameName} ?`)) {
      wsSend({ type: 'deleteGame', data: { gameId: game.gameId } })
    }
  }

  const name = document.createTextNode(game.gameName)

  contenair.appendChild(finishedIco)
  contenair.appendChild(name)
  contenair.appendChild(deleteIco)

  gameHolder.appendChild(contenair)
}

function toggleFinished (id) {
  document.getElementById(id).querySelector('img').classList.toggle('running')
  games.get(id).finished = !games.get(id).finished
  countUnfinished()
}

function removeGame (id = null) {
  gameHolder.querySelectorAll('.game').forEach(element => {
    if (id === null || element.id === id) element.remove()
  })
  if (id === null) games.clear()
  else games.delete(id)
  countUnfinished()
}

function countUnfinished () {
  nbUnfinished = 0
  for (const [, game] of games) {
    nbUnfinished += Number(game.finished === false)
  }
  document.getElementById('nbGames').textContent = nbUnfinished
}

function sendGameToWebsocket (gameObject) {
  wsSend({ socketId: uuid, type: 'newGame', data: gameObject })
}

function changeUsername () {
  if (document.querySelector('#username').value.trim() === '') {
    document.querySelector('#username').value = username
  } else {
    chatUsernameChange(username, document.querySelector('#username').value.trim())
    username = document.querySelector('#username').value.trim()
    wsSend({ type: 'changeUsername', username: username })
  }
}

function chatUsernameChange (oldUsername, newUsername) {
  for (let i = 0; i < chatHolder.children.length; i++) {
    if (chatHolder.children[i].children[0].textContent === oldUsername) {
      chatHolder.children[i].children[0].textContent = newUsername
    }
  }
}

function sendMessageToWebsocket (message, to = 'all') {
  wsSend({ socketId: uuid, type: 'message', to: to, message: message })
}

function addMessage (from, message) {
  const usernameMessage = document.createElement('div')
  if (from === username) usernameMessage.classList.add('self')

  usernameMessage.classList.add('username')
  usernameMessage.textContent = `${from}`

  const content = document.createElement('div')
  content.classList.add('content')
  content.textContent = ` : ${message}`

  const newMessage = document.createElement('div')
  newMessage.classList.add('message')
  newMessage.appendChild(usernameMessage)
  newMessage.appendChild(content)

  chatHolder.appendChild(newMessage)
  chatHolder.scrollTop = chatHolder.scrollHeight
}

function replace (what, type = 'input', callback = () => { }) {
  let i
  if (type === 'input') {
    i = document.createElement('input')
    i.value = what.innerText
    i.id = what.id
    i.size = what.innerText.length
    i.classList.add(...what.classList)
    i.addEventListener('keyup', (event) => {
      if (event.keyCode === 13) {
        callback()
        replace(event.target, 'div', callback)
      }
    })
  } else {
    i = document.createElement('div')
    i.innerHTML = what.value
    i.id = what.id
    i.classList.add(...what.classList)
    i.addEventListener('dblclick', (event) => replace(event.target, 'input', callback))
    i.addEventListener('touchend', (event) => replace(event.target, 'input', callback))
  }
  what.replaceWith(i)
  i.focus()
}
