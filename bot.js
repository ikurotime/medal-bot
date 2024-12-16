import { JSONFileSyncPreset } from 'lowdb/node'

/* eslint-disable node/prefer-global/process */
import tmi from 'tmi.js'
/* eslint-disable no-console */
import 'dotenv/config'

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
// [#ikurotime] <streamelements>: ikurotime is now live!
client.on('message', (channel, tags, message, self) => {
  // "Alca: Hello, World!"
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
      `Comandos: !medals, !medallas, !medal, !medalla, !reset`,
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

-- 1. Crear un comando que muestre el top 5 de medallas
-- 2. Crear un comando que muestre las medallas de un usuario específico - OK
-- 3. Crear un comando que muestre el total de medallas entregadas
-- 4. Crear un comando que muestre el total de medallas entregadas por tipo
-- 5. Crear un comando que muestre el top 5 de medallas por tipo
-- 6. calcular total de puntos por cada medalla obtenida. oro 3, plata 2, bronce 1.
*/
