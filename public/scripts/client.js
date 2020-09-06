/* global WebSocket, location, crypto */

let ws
const uuid = CreateUUID()
const game = []
const timeout = 2000
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
      sendMessageToWebsocket(messageInput.value.trim())
    }
  })

  const gameInput = document.querySelector('#game')
  gameInput.addEventListener('keyup', (event) => { if (event.keyCode === 13) { } })
  // document.querySelector('button.validate').addEventListener('click', event => {
  //   event.preventDefault()
  //   const gameName = document.querySelector('input#game').value
  //   if (gameName !== '') {
  //     const gameObject = { gameName: gameName, finished: false }
  //     game.push(gameObject)
  //     sendNewGameToWebsocket(gameObject)
  //   }
  // })
})

function CreateUUID () {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

function connect () {
  ws = new WebSocket(`ws://${document.location.host}`)
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ socketId: uuid, type: 'init', username: username }))
    keepAlive()
  })

  ws.addEventListener('message', event => {
    console.log(event.data)
    try {
      const data = JSON.parse(event.data)
      switch (data.type) {
        case 'reload':
          console.log(data.message)
          location.reload()
          break
        case 'init':
          if (data.message === 'complete') getGames()
          break
        case 'message':
          addMessage(data.username, data.message)
          break
        case 'changeUsername':
          chatUsernameChange(data.oldUsername, data.username)
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

function getGames () {
  ws.send(JSON.stringify({ socketId: uuid, type: 'getGames', data: 'all' }))
}

function sendGameToWebsocket (gameObject) {
  ws.send(JSON.stringify({ socketId: uuid, type: 'newGame', data: gameObject }))
}

function changeUsername () {
  if (document.querySelector('#username').value.trim() === '') {
    document.querySelector('#username').value = username
  } else {
    chatUsernameChange(username, document.querySelector('#username').value.trim())
    username = document.querySelector('#username').value.trim()
    ws.send(JSON.stringify({ type: 'changeUsername', username: username }))
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
  ws.send(JSON.stringify({ socketId: uuid, type: 'message', to: to, message: message }))
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
