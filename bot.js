const Discord = require('discord.js')
const token_file = require('./tokens.json')
const axios = require('axios')
const youtubedl = require('ytdl-core')
const youtubeapi = require('youtube-api-v3-search')

const yttoken = token_file.youtube.api_key

const client = new Discord.Client()
const prefix = "!"

let dispatch = []
let volume = []
let queue = []
let playEmbed = []
let playingMessage = []

const phrases = [
    "A animal has appeared!",
    "Woah, a animal has arrived!",
    "A wild animal is here!",
    "Say hello to this animal!"
]
const splitter = /animal/gi

const urls = {
    fox: { uri: "https://dagg.xyz/randomfox", result: "link" },
    shibe: { uri: "https://dog.ceo/api/breed/shiba/images/random", result: "message" }
}

client.login(token_file.discord.bot_token)

client.on("guildCreate", guild => {
    volume.push(guild.id)
    volume[guild.id] = 0.5
    queue.push(guild.id)
    queue[guild.id] = []
    dispatch.push(guild.id)
    playEmbed.push(guild.id)
    playingMessage.push(guild.id)
})

client.on("guildDelete", guild => {
    volume.push(guild.id)
    volume[guild.id] = 0.5
    queue.push(guild.id)
    queue[guild.id] = []
    dispatch.push(guild.id)
    playEmbed.push(guild.id)
    playingMessage.push(guild.id)
})

client.on('ready', () => {
    console.log(`Logged on successfully as ${client.user.tag}`)
    client.guilds.tap(guild => {
        volume.push(guild.id)
        volume[guild.id] = 0.5
        queue.push(guild.id)
        queue[guild.id] = []
        dispatch.push(guild.id)
        playEmbed.push(guild.id)
        playingMessage.push(guild.id)
    })
})

client.on('message', message => {
    console.log(`@${message.author.tag} - #${message.channel.name}: ${message.content}`)
    if (!message.content.startsWith(prefix) || message.channel.type == "dm" || message.author.bot) return
    const arguments = message.content.slice(prefix.length).split(/ +/)
    const command = arguments.shift().toLowerCase();

    switch (command) {
        //#region Animal Delivery
        case "fox":
            getAnimal(message, command)
            break
        case "shibe":
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
        case "remove":
            musicBot(message, command, arguments)
            break
        //#endregion

        //#region Help (Redirects to helpCMD() function)
        case "help":
            helpCMD(message)
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
                            reaction.remove(message.author.id).catch(() => console.log("A reaction failed to be removed, it's a common issue, and you may ignore it!"))
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
    let aQGuild = message.guild
    if (!arguments[0]) return
    let info
    if (message.content.includes("https://youtu.be/") || message.content.includes("https://www.youtube.com/watch?v=")) {
        info = await youtubedl.getBasicInfo(arguments[0])
    }
    else {
        let apiresp = await youtubeapi(yttoken, { q: arguments.join().replace(/,/gi, " "), part: 'snippet', type: "video" })
        if (!apiresp.items[0]) {
            return message.channel.send("Nothing was found for your query!")
        }
        info = await youtubedl.getBasicInfo(apiresp.items[0].id.videoId)
    }
    queue[aQGuild.id].push({
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

async function playMusic(message, arguments) {
    let pMGuild = message.guild
    if (dispatch[pMGuild.id]) return message.channel.send("Something is already playing! I can't be in two places at once!")
    if (!arguments[0] && !queue[pMGuild.id][0]) { message.channel.send("There's nothing queued, try using !add to add something or use !play to immediately play a video"); return "failure"} 
    if (!message.member.voiceChannel) { message.channel.send("You are not in a voice channel."); return "failure"}
    if (arguments[0]) { await addQueue(message, arguments) }
    message.member.voiceChannel.join()
        .then(connection => {
            untilEmpty()
            function untilEmpty() {
                dispatch[pMGuild.id] = connection.playStream(youtubedl(queue[pMGuild.id][0].url, { highWaterMark: 32000000 }))
                dispatch[pMGuild.id].setVolume(volume[pMGuild.id])
                dispatch[pMGuild.id].on('end', () => {
                    queue[pMGuild.id].shift()
                    if (queue[pMGuild.id][0]) {
                        playEmbed[pMGuild.id].setTitle(`**Now Playing:** ${queue[pMGuild.id][0].title}`)
                            .setAuthor(queue[pMGuild.id][0].author.name, queue[pMGuild.id][0].author.avatarURL, queue[pMGuild.id][0].author.link)
                            .setDescription(queue[pMGuild.id][0].url)
                            .setImage(queue[pMGuild.id][0].thumbnail)
                            .setFooter(`${queue[pMGuild.id][0].viewCount} views`)
                        playingMessage[pMGuild.id].edit(playEmbed[pMGuild.id])
                        untilEmpty()
                    }
                    else {
                        dispatch[pMGuild.id] = undefined
                        connection.disconnect()
                    }
                })
            }
        })
}

async function musicBot(message, command, arguments) {
    let mBGuild = message.guild
    switch (command) {
        case "add":
            await addQueue(message, arguments)
            let addEmbed = new Discord.RichEmbed()
                .setAuthor(queue[mBGuild.id][queue[mBGuild.id].length - 1].author.name, queue[mBGuild.id][queue[mBGuild.id].length - 1].author.avatarURL, queue[mBGuild.id][queue[mBGuild.id].length - 1].author.link)
                .setTitle(`Added **${queue[mBGuild.id][queue[mBGuild.id].length - 1].title}** to the queue`)
                .setDescription(queue[mBGuild.id][queue[mBGuild.id].length - 1].url)
                .setColor("#FF0000")
                .setImage(queue[mBGuild.id][queue[mBGuild.id].length - 1].thumbnail)
                .setFooter(`${queue[mBGuild.id][queue[mBGuild.id].length - 1].viewCount} views`)
            message.channel.send(addEmbed)
            break
        case "play":
            let state = await playMusic(message, arguments)
            if (state == "failure") return
            playEmbed[mBGuild.id] = new Discord.RichEmbed()
                .setTitle(`**Now Playing:** ${queue[mBGuild.id][0].title}`)
                .setAuthor(queue[mBGuild.id][0].author.name, queue[mBGuild.id][0].author.avatarURL, queue[mBGuild.id][0].author.link)
                .setDescription(queue[mBGuild.id][0].url)
                .setImage(queue[mBGuild.id][0].thumbnail)
                .setFooter(`${queue[mBGuild.id][0].viewCount} views`)
                .setColor("#FF0000")
            message.channel.send(playEmbed[mBGuild.id]).then(newmessage => playingMessage[mBGuild.id] = newmessage)
            break
        case "volume":
            if (!dispatch[mBGuild.id]) return message.channel.send("Nothing is currently playing! I can't control air!")
            if (!parseFloat(arguments[0])) return message.channel.send(`The current volume is set to: ${dispatch[mBGuild.id].volume}`)
            if (parseFloat(arguments[0]) > 1.0) return message.channel.send("Sorry! I can't let you destroy your eardrums! Please keep it **below 1.0**")
            if (parseFloat(arguments[0]) <= 0) return message.channel.send("Hello? I can't hear anything! Please keep it **above 0.0**")
            volume[mBGuild.id] = parseFloat(arguments[0])
            dispatch[mBGuild.id].setVolume(volume[mBGuild.id])
            message.channel.send(`Volume is now set to: ${dispatch[mBGuild.id].volume}!`)
            break
        case "queue":
            if (!queue[mBGuild.id][0]) return message.channel.send("Nothing is queued!")
            let queueEmbed = new Discord.RichEmbed()
                .setColor("#FF0000")
                .setAuthor(message.author.tag, message.author.avatarURL)
                .setTitle("Queue")
            let x = 0
            queue[mBGuild.id].forEach(element => {
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
            if (!dispatch[mBGuild.id]) return message.channel.send("Nothing is currently playing")
            if (queue[mBGuild.id][1]) {
                await queue[mBGuild.id].forEach(element => {
                    queue[mBGuild.id].shift()
                })
                queue[mBGuild.id].shift()
            }
            dispatch[mBGuild.id].end()
            break
        case "skip":
            if (!dispatch[mBGuild.id]) return message.channel.send("Nothing is currently playing")
            if (!queue[mBGuild.id][1]) return message.channel.send("There's nothing left to skip!")
            dispatch[mBGuild.id].end()
            break
        case "clear":
            if (!queue[mBGuild.id][0]) return message.channel.send("Nothing is queued!")
            queue[mBGuild.id] = []
            message.channel.send("The queue has been sucessfully emptied")
            break
        case "np":
            if (!dispatch[mBGuild.id]) return message.channel.send("Nothing is currently playing")
            message.channel.send(playEmbed[mBGuild.id])
            break
        case "remove":
            if (!queue[mBGuild.id][0]) return message.channel.send("Nothing is queued!")
            if (!arguments[0]) return message.channel.send("I can't remove nothing!")
            if (arguments[0] > queue[mBGuild.id].length - 1 || arguments[0] < 0) return message.channel.send("Out of range!")
            message.channel.send(`Removed **${queue[mBGuild.id][arguments[0]].title}** from the queue!`)
            queue[mBGuild.id].splice(arguments[0], 1)
            break
    }
}

async function helpCMD(message) {
    let helpEmbed = new Discord.RichEmbed()
    .setAuthor("FoxBot 3.0", client.user.avatarURL, "https://github.com/dagg-1/foxbot-3")
    .setDescription("Click my name to visit my source code repository!")
    .setThumbnail(client.user.avatarURL)
    .addField(`${prefix}help`, "Displays this message")
    .addField(`${prefix}fox`, "Sends a random picture of a fox")
    .addField(`${prefix}play`, "Play music in a voice channel")
    .addField(`${prefix}add`, "Adds a song to the queue")
    .addField(`${prefix}queue`, "Displays the queue")
    .addField(`${prefix}remove`, "Removes a song from the queue")
    .addField(`${prefix}clear`, "Clears the queue")
    .addField(`${prefix}stop`, "Clears the queue and stops all music")
    .addField(`${prefix}np`, "Displays the currently playing song")
    .addField(`${prefix}skip`, "Skip the current song")
    .addField(`${prefix}volume`, "Set the volume")
    message.channel.send(helpEmbed)
} 