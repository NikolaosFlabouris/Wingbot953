// Require the necessary discord.js classes
import {
    bold,
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    TextChannel,
} from "discord.js"

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] })
const twitchStreamAlertChannelId = "1070944970338488321"
const youtubeStreamAlertChannelId = "1365162765601214544"
const allTimeLeaderboardChannelId = "1071212911231508500"
const bimonthlyLeaderboardChannelId = "1071213119570972673"
let twitchStreamAlertChannel: TextChannel
let youtubeStreamAlertChannel: TextChannel
let allTimeLeaderboardChannel: TextChannel
let bimonthlyLeaderboardChannel: TextChannel

export function DiscordSetup() {
    // When the client is ready, run this code
    client.once(Events.ClientReady, (c) => {
        console.log(`Discord Ready! Logged in as ${c.user.tag}`)

        twitchStreamAlertChannel = client.channels.cache.get(
            twitchStreamAlertChannelId
        ) as TextChannel
        youtubeStreamAlertChannel = client.channels.cache.get(
            youtubeStreamAlertChannelId
        ) as TextChannel
        allTimeLeaderboardChannel = client.channels.cache.get(
            allTimeLeaderboardChannelId
        ) as TextChannel
        bimonthlyLeaderboardChannel = client.channels.cache.get(
            bimonthlyLeaderboardChannelId
        ) as TextChannel
    })

    // Log in to Discord with your client's token
    client.login(process.env.DISCORD_TOKEN)
}

export function TwitchLivestreamAlert(streamTitle: string, streamGame: string) {
    const exampleEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(streamTitle)
        .setURL("https://www.twitch.tv/wingman953")
        .setAuthor({ name: "Wingman953 is now live on Twitch!" }) //, iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
        .setDescription(`Playing ` + streamGame)
        //.setThumbnail('https://i.imgur.com/AfFp7pu.png')
        //.addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
        //.setImage('https://i.imgur.com/AfFp7pu.png')
        .setTimestamp()
    //.setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

    twitchStreamAlertChannel.send({ embeds: [exampleEmbed] })
}

export function YoutubeLivestreamAlert(
    streamTitle: string,
    streamGame: string,
    streamUrl: string
) {
    const exampleEmbed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(streamTitle)
        .setURL(streamUrl)
        .setAuthor({ name: "Wingman953 is now live on YouTube!" }) //, iconURL: 'https://i.imgur.com/AfFp7pu.png', url: 'https://discord.js.org' })
        //.setDescription(streamGame !== "" ? `Playing ` + streamGame : null)
        //.setThumbnail('https://i.imgur.com/AfFp7pu.png')
        //.addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
        //.setImage('https://i.imgur.com/AfFp7pu.png')
        .setTimestamp()
    //.setFooter({ text: 'Some footer text here', iconURL: 'https://i.imgur.com/AfFp7pu.png' });

    youtubeStreamAlertChannel.send({ embeds: [exampleEmbed] })
}

export function PublishAlltimeLeaderboard(leaderboard: any) {
    allTimeLeaderboardChannel.messages?.fetch().then((messages) => {
        let leaderboardMessage = ""

        leaderboard.sort(
            (firstItem: { Score: number }, secondItem: { Score: number }) =>
                secondItem.Score - firstItem.Score
        )

        const userCount = leaderboard.length > 50 ? 50 : leaderboard.length

        for (let i = 0; i < userCount; i++) {
            leaderboardMessage += `${i + 1} - ${leaderboard[i].Username}: ${
                leaderboard[i].Score
            }pts\n`
        }

        leaderboardMessage =
            bold("All-Time Quiz Leaderboards - Top 50!") +
            `\n\n` +
            leaderboardMessage.replace(/(\*|_|`|~|\\)/g, "\\$1")

        if (messages.size > 0) {
            messages.first()?.edit(leaderboardMessage)
        } else {
            allTimeLeaderboardChannel.send(leaderboardMessage)
        }
    })
}

export function PublishBimonthlyLeaderboard(
    leaderboard: any,
    newMessage: boolean = false
) {
    bimonthlyLeaderboardChannel.messages?.fetch().then((messages) => {
        let leaderboardMessage = ""

        leaderboard.sort(
            (firstItem: { Score: number }, secondItem: { Score: number }) =>
                secondItem.Score - firstItem.Score
        )

        const userCount = leaderboard.length > 50 ? 50 : leaderboard.length

        for (let i = 0; i < userCount; i++) {
            leaderboardMessage += `${i + 1} - ${leaderboard[i].Username}: ${
                leaderboard[i].Score
            }pts\n`
        }

        leaderboardMessage =
            bold("March - April 2024 Bi-Monthly Quiz Leaderboards - Top 50!") +
            `\n\n` +
            leaderboardMessage.replace(/(\*|_|`|~|\\)/g, "\\$1")

        if (messages.size > 0 && !newMessage) {
            messages.first()?.edit(leaderboardMessage)
        } else if (newMessage) {
            bimonthlyLeaderboardChannel.send(leaderboardMessage)
        }
    })
}
