const Discord = require('discord.js')
const token_file = require('./tokens.json')

const client = new Discord.Client()

client.login(token_file.discord.bot_token)

client.on('ready', () => {
    console.log(`Logged on successfully as ${client.user.tag}`)
})