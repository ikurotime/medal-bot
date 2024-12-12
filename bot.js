import 'dotenv/config'

import tmi from "tmi.js";

const client = new tmi.Client({
	options: { debug: true },
	identity: {
		username: 'MedalBot',
		password: process.env.BOT_SECRET
	},
	channels: [ 'ikurotime' ]
});

const ignoredChannels =  ['ikurotime','streamelements','nightbot'];
let isStarted = false;
let medalMap = new Map();
let honorMentions = new Set();
let position = 1;
client.connect();
//[#ikurotime] <streamelements>: ikurotime is now live!
client.on('message', (channel, tags, message, self) => {
	// "Alca: Hello, World!"
	if(self) return;
	console.log({isStarted})
	if(!isStarted && !ignoredChannels.includes(tags['username']) && !honorMentions.has(tags['username'])) {
		client.say(channel, `Mención de honor para @${tags['username']}! 🎖️`);	
		honorMentions.add(tags['username']);
	}
	if(tags['username'] === 'ikurotime' && message.includes('ikurotime is now live!')) {
		console.log('Stream started');
		isStarted = true;
	}
	if(isStarted && position < 4 && !medalMap.has(tags['username']) && !ignoredChannels.includes(tags['username'])) {
			medalMap.set(tags['username'], position);
			switch(position){
					case 1:
					client.say(channel, `Medalla de oro 🥇 para @${tags['username']}!`);
					break;
					case 2:
					client.say(channel, `Medalla de plata 🥈 @${tags['username']}!`);
					break;
					case 3:
					client.say(channel, `Medalla de bronce 🥉 @${tags['username']}!`);
					break;
			}
					position++;
			}
		
		console.log(`${tags['display-name']}: ${message}`);
		if(message.toLowerCase() === '!hello') {
		// "@alca, heya!"
		client.say(channel, `@${tags.username}, heya!`);
	}
	
});