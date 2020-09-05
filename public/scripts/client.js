/* global location, crypto */

// let numClick = 0
const ws = new WebSocket(`ws://${document.location.host}`) // eslint-disable-line no-undef

function keepAlive () {
  const timeout = 20000
  if (ws.readyState === ws.OPEN) {
    ws.send('')
    setTimeout(keepAlive, timeout)
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ id: CreateUUID(), message: 'Hello!' }))
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
})

function CreateUUID () {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}
