const Discord = require('discord.js')
const token_file = require('./tokens.json')
const axios = require('axios')
const youtubedl = require('ytdl-core')
const youtubeapi = require('youtube-api-v3-search')

const yttoken = token_file.youtube.api_key

const client = new Discord.Client()
const prefix = "!"

// TODO: Allow per server settings
let dispatch
let volume = 0.5
let queue = []
let playEmbed
let playingMessage

const phrases = [
    "A animal has appeared!",
    "Woah, a animal has arrived!",
    "A wild animal is here!",
    "Say hello to this animal!"
]
const splitter = /animal/gi

const urls = {
    fox: { uri: "https://dagg.xyz/randomfox", result: "link" }
}

client.login(token_file.discord.bot_token)

client.on('ready', () => {
    console.log(`Logged on successfully as ${client.user.tag}`)
})

client.on('message', message => {
    console.log(`@${message.author.tag} - #${message.channel.name}: ${message.content}`)
    if (!message.content.startsWith(prefix) || message.channel.type == "dm" || message.author.bot) return
    const arguments = message.content.slice(prefix.length).split(/ +/)
    const command = arguments.shift().toLowerCase();

    switch (command) {
        //#region Fox Delivery
        case "fox":
            getAnimal(message, command)
            break
        //#endregion

        //#region Music Bot (Redirects to musicBot() function)
        case "play":
            musicBot(message, command, arguments)
            break
        case "volume":
            musicBot(message, command, arguments)
            break
        case "add":
            musicBot(message, command, arguments)
            break
        case "queue":
            musicBot(message, command, arguments)
            break
        case "stop":
            musicBot(message, command, arguments)
            break
        case "skip":
            musicBot(message, command, arguments)
            break
        case "clear":
            musicBot(message, command, arguments)
            break
        case "np":
            musicBot(message, command, arguments)
            break
        //#endregion
    }
})

async function requestIMG(command) {
    const meta = urls[command]
    return (await axios.get(meta.uri)).data[meta.result]
}

async function getAnimal(message, command) {
    let filter = (reaction, user) => [reaction.emoji.name == "➡", reaction.emoji.name == "⏹"] && user.id == message.author.id
    let animalEmbed = new Discord.RichEmbed()
        .setAuthor(message.author.tag, message.author.avatarURL)
        .setImage(await requestIMG(command))
        .setColor(Math.floor(Math.random() * 16777215) + 1)
        .setDescription(phrases[Math.floor(Math.random() * phrases.length)].replace(splitter, command))
    message.channel.send(animalEmbed)
        .then(async sentMessage => {
            sentMessage.createReactionCollector(filter, { time: null })
                .on('collect', async reaction => {
                    switch (reaction.emoji.name) {
                        case "➡":
                            animalEmbed.setImage(await requestIMG(command))
                            animalEmbed.setDescription(phrases[Math.floor(Math.random() * phrases.length)].replace(splitter, command))
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

async function addQueue(message, arguments) {
    if (!arguments[0]) return
    let info
    if (message.content.includes("https://youtu.be/" || message.content.includes("https://www.youtube.com/watch?v="))) {
        info = await youtubedl.getBasicInfo(arguments[0])
    }
    else {
        let apiresp = await youtubeapi(yttoken, { q: arguments.join().replace(/,/gi, " "), part: 'snippet', type: "video" })
        if (!apiresp.items[0]) {
            return message.channel.send("Nothing was found for your query!")
        }
        info = await youtubedl.getBasicInfo(apiresp.items[0].id.videoId)
    }
    queue.push({
        url: info.video_url,
        title: info.title,
        author: {
            name: info.author.name,
            avatarURL: info.author.avatar,
            link: info.author.channel_url
        },
        viewCount: parseInt(info.player_response.videoDetails.viewCount).toLocaleString(),
        thumbnail: info.player_response.videoDetails.thumbnail.thumbnails[info.player_response.videoDetails.thumbnail.thumbnails.length - 1].url
    })
}

async function playMusic(message, command, arguments) {
    if (dispatch) return message.channel.send("Something is already playing! I can't be in two places at once!")
    if (!arguments[0] && !queue[0]) return message.channel.send("There's nothing queued, try using !add to add something or use !play to immediately play a video")
    if (!message.member.voiceChannel) return message.channel.send("You are not in a voice channel.")
    if (arguments[0]) { await addQueue(message, arguments) }
    message.member.voiceChannel.join()
        .then(connection => {
            untilEmpty()
            function untilEmpty() {
                dispatch = connection.playStream(youtubedl(queue[0].url, { highWaterMark: 32000000 }))
                dispatch.setVolume(volume)
                dispatch.on('end', () => {
                    queue.shift()
                    if (queue[0]) {
                        playEmbed.setTitle(`**Now Playing:** ${queue[0].title}`)
                            .setAuthor(queue[0].author.name, queue[0].author.avatarURL, queue[0].author.link)
                            .setDescription(queue[0].url)
                            .setImage(queue[0].thumbnail)
                            .setFooter(`${queue[0].viewCount} views`)
                        playingMessage.edit(playEmbed)
                        untilEmpty()
                    }
                    else {
                        dispatch = undefined
                        connection.disconnect()
                    }
                })
            }
        })
}

async function musicBot(message, command, arguments) {
    switch (command) {
        case "add":
            await addQueue(message, arguments)
            let addEmbed = new Discord.RichEmbed()
                .setAuthor(queue[queue.length - 1].author.name, queue[queue.length - 1].author.avatarURL, queue[queue.length - 1].author.link)
                .setTitle(`Added **${queue[queue.length - 1].title}** to the queue`)
                .setDescription(queue[queue.length - 1].url)
                .setColor("#FF0000")
                .setImage(queue[queue.length - 1].thumbnail)
                .setFooter(`${queue[queue.length - 1].viewCount} views`)
            message.channel.send(addEmbed)
            break
        case "play":
            await playMusic(message, command, arguments)
            playEmbed = new Discord.RichEmbed()
                .setTitle(`**Now Playing:** ${queue[0].title}`)
                .setAuthor(queue[0].author.name, queue[0].author.avatarURL, queue[0].author.link)
                .setDescription(queue[0].url)
                .setImage(queue[0].thumbnail)
                .setFooter(`${queue[0].viewCount} views`)
                .setColor("#FF0000")
            message.channel.send(playEmbed).then(newmessage => playingMessage = newmessage)
            break
        case "volume":
            if (!dispatch) return message.channel.send("Nothing is currently playing! I can't control air!")
            if (!arguments[0]) return message.channel.send(`The current volume is set to: ${dispatch.volume}`)
            if (arguments[0] > 1.0) return message.channel.send("Sorry! I can't let you destroy your eardrums! Please keep it **below 1.0**")
            if (arguments[0] <= 0) return message.channel.send("Hello? I can't hear anything! Please keep it **above 0.0**")
            volume = arguments[0]
            dispatch.setVolume(volume)
            break
        case "queue":
            if (!queue[0]) return message.channel.send("Nothing is queued!")
            let queueEmbed = new Discord.RichEmbed()
                .setColor("#FF0000")
                .setAuthor(message.author.tag, message.author.avatarURL)
                .setTitle("Queue")
            let x = 0
            queue.forEach(element => {
                if (x == 0) {
                    queueEmbed.addField("Up Next", element.title)
                }
                else {
                    queueEmbed.addField(`#${x}`, element.title)
                }
                ++x
            })
            message.channel.send(queueEmbed)
            break
        case "stop":
            if (!dispatch) return message.channel.send("Nothing is currently playing")
            if (queue[1]) {
                await queue.forEach(element => {
                    queue.shift()
                })
                queue.shift()
            }
            dispatch.end()
            break
        case "skip":
            if (!dispatch) return message.channel.send("Nothing is currently playing")
            if (!queue[1]) return message.channel.send("There's nothing left to skip!")
            dispatch.end()
            break
        case "clear":
            if (!queue[0]) return message.channel.send("Nothing is queued!")
            queue = []
            break
        case "np":
            if (!dispatch) return message.channel.send("Nothing is currently playing")
            message.channel.send(playEmbed)
            break
    }
}