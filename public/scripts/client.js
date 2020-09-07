/* global WebSocket, location, crypto, confirm */

// fd du WebSocket
let ws
// Nombre de partie en cours
let nbUnfinished = 0
// Map des jeux
const games = new Map()
// UUID unique de la session
const uuid = CreateUUID()
// Timeout de renouvellement de la connexion du WebSocket
const timeout = 2000
// Liste des jeux
const gameHolder = document.querySelector('#displayGames')
// Fenêtre de chat
const chatHolder = document.querySelector('#chatMessage')
// Nom de l'utilisateur
let username = `Utilisateur-${uuid}`

/**
 * Initialisation de la page et binding des événements du DOM
 */
document.addEventListener('DOMContentLoaded', () => {
  connect()

  /**
   * Ajout des événements pour le changement de nom d'utilisateur
   */
  const usernameInput = document.querySelector('#username')
  usernameInput.textContent = username
  usernameInput.addEventListener('dblclick', (event) => replace(event.target, 'input', changeUsername))
  usernameInput.addEventListener('touchend', (event) => replace(event.target, 'input', changeUsername))

  /**
   * Ajout des événements pour l'envoie de message
   */
  const messageInput = document.querySelector('#message')
  messageInput.addEventListener('keyup', (event) => {
    if (event.keyCode === 13 && messageInput.value.trim() !== '') {
      console.log(messageInput.value.trim())
      sendMessageToWebsocket(messageInput.value.trim())
      messageInput.value = ''
    }
  })

  /**
   * Ajout des événements pour l'ajout de jeu
   */
  const gameInput = document.querySelector('#game')
  gameInput.addEventListener('keyup', (event) => {
    if (event.keyCode === 13) {
      const gameName = document.querySelector('input#game').value
      if (gameName !== '') {
        const gameObject = { gameName: gameName, finished: false }
        sendNewGameToWebsocket(gameObject)
      }
    }
  })
})

/**
 * Création d'un uuid unique pour l'utilisateur
 */
function CreateUUID () {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

/**
 * Connection WebSocket et routage des événements
 */
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
              addGame(game)
            }
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

/**
 * Garder la connexion WebSocket ouverte
 */
function keepAlive () {
  if (ws.readyState === ws.OPEN) {
    ws.send('')
    setTimeout(keepAlive, timeout)
  } else console.log(ws.readyState)
}

/**
 * Envoie des données par WebSocket
 * @param {Object} data données a envoyer au serveur
 */
function wsSend (data) {
  ws.send(JSON.stringify(data))
}

/**
 * Récupération de tout les jeux par le WebSocket
 */
function getGames () {
  wsSend({ socketId: uuid, type: 'getGames', data: 'all' })
  removeGame()
}

/**
 * Ajout du jeu dans la liste des jeux
 * Création des boutons de fin de partie et de suppréssion
 * @param {Objet} game objet représentant un jeu
 */
function addGame (game) {
  const conteneur = document.createElement('div')
  conteneur.classList.add('game')
  conteneur.id = game.gameId

  const finishedIco = document.createElement('img')
  finishedIco.classList.add('small')
  finishedIco.classList.add('left')
  if (!game.finished) {
    finishedIco.classList.add('running')
    finishedIco.title = finishedIco.alt = 'Passer la partie a terminé'
  } else {
    finishedIco.title = finishedIco.alt = 'Reprendre la partie'
  }
  finishedIco.src = './img/check_circle-black-24dp.svg'

  finishedIco.onclick = () => wsSend({ type: 'updateGame', data: { gameId: game.gameId } })

  const deleteIco = document.createElement('img')
  deleteIco.classList.add('small')
  deleteIco.classList.add('right')
  deleteIco.title = deleteIco.alt = 'Supprimer la partie'
  deleteIco.src = './img/disabled_by_default-black-24dp.svg'

  deleteIco.onclick = () => {
    if (confirm(`Voulez vous supprimer la partie ${game.gameName} ?`)) {
      wsSend({ type: 'deleteGame', data: { gameId: game.gameId } })
    }
  }

  const name = document.createElement('div')
  name.classList.add('gameText')
  name.textContent = game.gameName

  conteneur.appendChild(finishedIco)
  conteneur.appendChild(name)
  conteneur.appendChild(deleteIco)

  gameHolder.appendChild(conteneur)
}

/**
 * Bascule entre les deux états 'en cours' et 'fini'
 * @param {Number} id du jeu a mettre à jour
 */
function toggleFinished (id) {
  document.getElementById(id).querySelector('img').classList.toggle('running')
  games.get(id).finished = !games.get(id).finished
  countUnfinished()
}

/**
 * Supprime le, ou les, jeux de la liste
 * @param {Number|null} id du jeu a supprimer de la liste
 */
function removeGame (id = null) {
  gameHolder.querySelectorAll('.game').forEach(element => {
    if (id === null || element.id === id) element.remove()
  })
  if (id === null) games.clear()
  else games.delete(id)
  countUnfinished()
}

/**
 * Comptage du nombres de partie en cours
 */
function countUnfinished () {
  nbUnfinished = 0
  for (const [, game] of games) {
    nbUnfinished += Number(game.finished === false)
  }
  document.getElementById('nbGames').textContent = nbUnfinished
}

/**
 * Envoie d'un nouveau jeu par Websocket
 * @param {Object} gameObject objet représentant un jeu
 */
function sendNewGameToWebsocket (gameObject) {
  wsSend({ socketId: uuid, type: 'newGame', data: gameObject })
}

/**
 * Changement du nom d'utilisateur a la validation et envoie par WebSocket pour répliqué aux autres clients
 */
function changeUsername () {
  if (document.querySelector('#username').value.trim() === '') {
    document.querySelector('#username').value = username
  } else {
    chatUsernameChange(username, document.querySelector('#username').value.trim())
    username = document.querySelector('#username').value.trim()
    wsSend({ type: 'changeUsername', username: username })
  }
}

/**
 * Changement du nom d'utilisateur dans la fenêtre de chat
 * @param {string} oldUsername ancien nom d'utilisateur
 * @param {string} newUsername nouveau nom d'utilisateur
 */
function chatUsernameChange (oldUsername, newUsername) {
  for (let i = 0; i < chatHolder.children.length; i++) {
    if (chatHolder.children[i].children[0].textContent === oldUsername) {
      chatHolder.children[i].children[0].textContent = newUsername
    }
  }
}

/**
 * Envoie d'un message au serveur en choisissant les destinataires
 * @param {string} message message a envoyer par le WebSocket
 * @param {string} to destinataire du message
 */
function sendMessageToWebsocket (message, to = 'all') {
  wsSend({ socketId: uuid, type: 'message', to: to, message: message })
}

/**
 * Ajout du message dans la fenêtre de chat
 * @param {string} from nom d'utilisateur qui a écrit le message
 * @param {string} message message de l'utilisateur
 */
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

/**
 * Modification du type d'un element HTML
 * @param {Node} what element a remplacer
 * @param {string} type destination de l'element HTML
 * @param {Function} callback a utiliser si on gère des events
 */
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
