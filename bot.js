const Discord = require('discord.js')
const token_file = require('./tokens.json')
const axios = require('axios')

const client = new Discord.Client()
const prefix = "!"

const urls = {
    fox: { uri: "https://dagg.xyz/randomfox", result: "link" }
}

client.login(token_file.discord.bot_token)

client.on('ready', () => {
    console.log(`Logged on successfully as ${client.user.tag}`)
})

client.on('message', message => {
    console.log(`@${message.author.tag} - #${message.channel.name}: ${message.content}`)
    if(!message.content.startsWith(prefix) || message.channel.type == "dm" || message.author.bot) return
    const arguments = message.content.slice(prefix.length).split(/ +/)
    const command = arguments.shift().toLowerCase();
    
    switch (command) {
        //#region Fox delivery
        case "fox":
            getAnimal(message, command)
            break
        //#endregion
    }
})

async function requestIMG(command) {
    const meta = urls[command]
    return (await axios.get(meta.uri)).data[meta.result]
}

async function getAnimal(message, command) {
    let filter = (reaction, user) => [ reaction.emoji.name == "➡", reaction.emoji.name == "⏹"] && user.id == message.author.id
    let animalEmbed = new Discord.RichEmbed()
        .setAuthor(message.author.tag, message.author.avatarURL) 
        .setImage(await requestIMG(command))
        .setColor(Math.floor(Math.random() * 16777215) + 1)
        message.channel.send(animalEmbed)
        .then(async sentMessage => {
            sentMessage.createReactionCollector(filter, {time: null})
            .on('collect', async reaction => {
                switch (reaction.emoji.name) {
                    case "➡":
                        animalEmbed.setImage(await requestIMG(command))
                        reaction.remove(message.author.id)
                        sentMessage.edit(animalEmbed)
                        break 
                    case "⏹":
                        sentMessage.delete()
                        break
                }
            })
            await sentMessage.react("➡")
            await sentMessage.react("⏹")
        })
}