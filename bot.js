/* eslint-disable perfectionist/sort-imports */
import 'dotenv/config'

import { extname, join } from 'node:path'

import { JSONFileSyncPreset } from 'lowdb/node'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { readFile } from 'node:fs/promises'
/* eslint-disable no-console */
/* eslint-disable node/prefer-global/process */
import tmi from 'tmi.js'

console.log('Environment Variables:')
console.log('ENVIRONMENT:', process.env.ENVIRONMENT)
console.log('DATABASE_URL:', process.env.DATABASE_URL)
// Serve files from the "public" folder
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const BASE_DIR = join(__dirname, '/')

// MIME types for content
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
}

const server = createServer(async (req, res) => {
  const filePath = join(BASE_DIR, req.url === '/' ? 'index.html' : req.url)
  const ext = extname(filePath)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  try {
    const data = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  }
  catch (err) {
    res.writeHead(err.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain' })
    res.end(err.code === 'ENOENT' ? '404 Not Found' : '500 Internal Server Error')
  }
})
server.listen(3000, () => console.log('Server running at http://localhost:3000'))

const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: 'MedalBot',
    password: process.env.BOT_SECRET,
  },
  channels: ['ikurotime'],
})

const iconMedals = ['🥇', '🥈', '🥉']
const medals = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
  honor: '🎖️',
}
const ignoredChannels = ['ikurotime', 'streamelements', 'nightbot']
const medalCommands = ['!medals', '!medallas', '!medal', '!medalla']
let isStarted = false
const medalMap = new Map()
const honorMentions = new Set()
let position = 1
let canLogMedals = true

const db = JSONFileSyncPreset(`${process.env.DB_NAME}.json`, {
  users: [],
})
function giveMedals(username, medal) {
  db.update(({ users }) => {
    if (!users.find(user => user.username === username)) {
      users.push({
        username,
        medals: {
          ...users.medals,
          [medal]: 1,
        },
      })
    }
    else {
      const userData = users.find(user => user.username === username)
      if (userData.medals[medal]) {
        userData.medals[medal]++
      }
      else {
        userData.medals[medal] = 1
      }
    }
    return users
  })
}

function getMedals(username, channel) {
  console.log({ username, channel })
  const { users } = db.data
  const userData = users.find(user => user.username === username)
  console.log({ userData })
  const goldMedals = userData?.medals.gold ?? 0
  const silverMedals = userData?.medals.silver ?? 0
  const bronzeMedals = userData?.medals.bronze ?? 0
  const honorMedals = userData?.medals.honor ?? 0

  if (userData) {
    client.say(
      channel,
      `Medallas de ${username}: 
      ${medals.gold}  ${goldMedals} | 
      ${medals.silver}  ${silverMedals} |
      ${medals.bronze}  ${bronzeMedals} |
      ${medals.honor}  ${honorMedals}`,
    )
  }
  else {
    client.say(channel, `No se encontraron medallas para ${username}`)
  }
}

function getTodayMedals(channel) {
  const medals = Array.from(medalMap.entries())
  client.say(
    channel,
    `⭐ Medallas de hoy: ${medals.map(([user, pos]) => `@${user} | ${iconMedals[pos - 1]}`).join(', ')}`,
  )
  canLogMedals = false
  setTimeout(() => {
    canLogMedals = true
  }, 5000)
}

client.connect()
client.on('message', (channel, tags, message, self) => {
  if (self)
    return
  if (
    !isStarted
    && !ignoredChannels.includes(tags.username)
    && !honorMentions.has(tags.username)
  ) {
    client.say(channel, `Mención de honor para @${tags.username}! 🎖️`)
    giveMedals(tags.username, 'honor')
    honorMentions.add(tags.username)
  }

  if (
    tags.username === 'ikurotime'
    && message.includes('ikurotime is now live!')
  ) {
    console.log('Stream started')
    isStarted = true
  }

  if (
    isStarted
    && position < 4
    && !medalMap.has(tags.username)
    && !ignoredChannels.includes(tags.username)
  ) {
    medalMap.set(tags.username, position)
    switch (position) {
      case 1:
        client.say(channel, `Medalla de oro 🥇 para @${tags.username}!`)
        giveMedals(tags.username, 'gold')
        break
      case 2:
        client.say(channel, `Medalla de plata 🥈 @${tags.username}!`)
        giveMedals(tags.username, 'silver')
        break
      case 3:
        client.say(channel, `Medalla de bronce 🥉 @${tags.username}!`)
        giveMedals(tags.username, 'bronze')
        break
    }
    position++
  }

  console.log(`${tags['display-name']}: ${message}`)
  const command = message.toLowerCase().split(' ')[0]
  if (medalCommands.includes(command) && canLogMedals) {
    const usernameRegex = /@(\w+)/
    const username = message.match(usernameRegex)?.[0] ?? '@'
    if (username !== '@') {
      console.log({ username })
      getMedals(username.slice(1), channel)
    }
    else {
      getTodayMedals(channel)
    }
  }
  if (message.toLowerCase() === '!help') {
    client.say(
      channel,
      `Comandos: !medals | !medals @username`,
    )
  }
  if (message.toLowerCase() === '!reset' && tags.username === 'ikurotime') {
    isStarted = false
    position = 1
    medalMap.clear()
    honorMentions.clear()
    client.say(channel, `Medallas reseteadas!`)
  }
})

/*

oro - 4 puntos
plata - 2 puntos
bronce - 1 punto

-- 1. Crear un comando que muestre el top 5 usuarios
-- 2. Crear un comando que muestre las medallas de un usuario específico - OK
-- 3. Crear un comando que muestre el total de medallas entregadas
-- 5. Crear un comando que muestre el top 5 de medallas por tipo
-- 6. calcular total de puntos por cada medalla obtenida. oro 3, plata 2, bronce 1.
*/
