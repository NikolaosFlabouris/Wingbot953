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
const twitchAllTimeLeaderboardChannelId = "1071212911231508500"
const youtubeAllTimeLeaderboardChannelId = "1382159909067427960"
let twitchStreamAlertChannel: TextChannel
let youtubeStreamAlertChannel: TextChannel
let twitchAllTimeLeaderboardChannel: TextChannel
let youtubeAllTimeLeaderboardChannel: TextChannel

export function DiscordSetup() {
    // When the client is ready, run this code
    client.once(Events.ClientReady, (c) => {
        console.log(`Discord Ready! Logged in as ${c.user.tag}`)

        // Alert Channels
        twitchStreamAlertChannel = client.channels.cache.get(
            twitchStreamAlertChannelId
        ) as TextChannel
        youtubeStreamAlertChannel = client.channels.cache.get(
            youtubeStreamAlertChannelId
        ) as TextChannel

        // Leaderboard Channels
        twitchAllTimeLeaderboardChannel = client.channels.cache.get(
            twitchAllTimeLeaderboardChannelId
        ) as TextChannel
        youtubeAllTimeLeaderboardChannel = client.channels.cache.get(
            youtubeAllTimeLeaderboardChannelId
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

export function PublishTwitchAllTimeLeaderboard(leaderboard: any) {
    twitchAllTimeLeaderboardChannel.messages?.fetch().then((messages) => {
        let leaderboardMessage = ""

        // Filter for Twitch users only, then sort by score in descending order
        const twitchUsers = leaderboard
            .filter((user: any) => user.Platform === "twitch")
            .sort(
                (firstItem: any, secondItem: any) =>
                    secondItem.Score - firstItem.Score
            )

        // Get the top 50 users (or fewer if there aren't 50 Twitch users)
        const userCount = Math.min(twitchUsers.length, 50)

        // Build the leaderboard message
        for (let i = 0; i < userCount; i++) {
            leaderboardMessage += `${i + 1} - ${twitchUsers[i].Username}: ${
                twitchUsers[i].Score
            }pts\n`
        }

        leaderboardMessage =
            bold("Twitch All-Time Quiz Leaderboards - Top 50!") +
            `\n\n` +
            leaderboardMessage.replace(/(\*|_|`|~|\\)/g, "\\$1")

        if (messages.size > 0) {
            messages.first()?.edit(leaderboardMessage)
        } else {
            twitchAllTimeLeaderboardChannel.send(leaderboardMessage)
        }
    })
}

export function PublishYouTubeAllTimeLeaderboard(leaderboard: any) {
    youtubeAllTimeLeaderboardChannel.messages?.fetch().then((messages) => {
        let leaderboardMessage = ""

        // Filter for YouTube users only, then sort by score in descending order
        const youtubeUsers = leaderboard
            .filter((user: any) => user.Platform === "youtube")
            .sort(
                (firstItem: any, secondItem: any) =>
                    secondItem.Score - firstItem.Score
            )

        // Get the top 50 users (or fewer if there aren't 50 YouTube users)
        const userCount = Math.min(youtubeUsers.length, 50)

        // Build the leaderboard message
        for (let i = 0; i < userCount; i++) {
            leaderboardMessage += `${i + 1} - ${youtubeUsers[i].Username}: ${
                youtubeUsers[i].Score
            }pts\n`
        }

        leaderboardMessage =
            bold("YouTube All-Time Quiz Leaderboards - Top 50!") +
            `\n\n` +
            leaderboardMessage.replace(/(\*|_|`|~|\\)/g, "\\$1")

        if (messages.size > 0) {
            messages.first()?.edit(leaderboardMessage)
        } else {
            youtubeAllTimeLeaderboardChannel.send(leaderboardMessage)
        }
    })
}
