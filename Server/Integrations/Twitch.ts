import {
    RefreshingAuthProvider,
    exchangeCode,
    AccessToken,
} from "@twurple/auth"
import { ChatClient } from "@twurple/chat"
import { ApiClient, HelixCustomReward, HelixUser } from "@twurple/api"
import { ChatMessage } from "@twurple/chat/lib/commands/ChatMessage"
import open from "open"

import { CheckForVipWelcome, LoadWelcomeMessages } from "../Commands/VipWelcome"
import { SecondsToDuration, Between, sleep } from "../Commands/Utils"

import { TwitchLivestreamAlert } from "./Discord"

import express = require("express")
import { HaloRunsSetup, HandleHaloRunsWr, HandleWingman953Pb } from "./HaloRuns"
import {
    handleChatMessage,
    PeriodicMessages,
    sendChatMessage,
    Wingbot953Message,
} from "../MessageHandling"
import { ResetUsedQuestions, StartQuiz } from "../Commands/Quiz"
import { AddTracksFromPlaylistToQueue } from "./Spotify"
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage"

let Wingman953: HelixUser

let botTwitchAccessToken: AccessToken
let streamerTwitchAccessToken: AccessToken
let botAuthProvider
let streamerAuthProvider
let server: express.Application
let chatClient: ChatClient
let apiClient: ApiClient

// Intervals
let quizInterval: NodeJS.Timeout
//var didYouKnowInterval
let periodicMessagesInterval: NodeJS.Timeout
let twitchApiPollingInterval: NodeJS.Timeout
let streamNameAndGameInterval: NodeJS.Timeout

// Flags
export let isLive = false
let streamName: string = ""
let streamGame: string = ""
let isFirstAuth = true
let quizStartReward: HelixCustomReward
let latestRedemptionDate: number = Date.now()

const authorizeURL =
    `https://id.twitch.tv/oauth2/authorize?` +
    `client_id=${process.env.TWITCH_CLIENT_ID}` +
    `&redirect_uri=${process.env.TWITCH_REDIRECT_URI}` +
    `&response_type=code` +
    `&scope=chat:read+` +
    `analytics:read:extensions+` +
    `analytics:read:games+` +
    `bits:read+` +
    //`channel:edit:commercial+` +
    `channel:manage:broadcast+` +
    `channel:manage:extensions+` +
    `channel:manage:polls+` +
    `channel:manage:predictions+` +
    `channel:manage:raids+` +
    `channel:manage:redemptions+` +
    //`channel:manage:schedule+` +
    //`channel:manage:videos+` +
    `channel:read:editors+` +
    `channel:read:goals+` +
    `channel:read:hype_train+` +
    `channel:read:polls+` +
    `channel:read:predictions+` +
    `channel:read:redemptions+` +
    `channel:read:stream_key+` +
    `channel:read:subscriptions+` +
    //`clips:edit+` +
    `moderation:read+` +
    //`moderator:manage:banned_users+` +
    //`moderator:read:blocked_terms+` +
    //`moderator:manage:blocked_terms+` +
    //`moderator:manage:automod+` +
    //`moderator:read:automod_settings+` +
    //`moderator:manage:automod_settings+` +
    `moderator:read:chat_settings+` +
    `moderator:manage:chat_settings+` +
    //`user:edit+` +
    //`user:edit:follows+` +
    //`user:manage:blocked_users+` +
    `user:read:blocked_users+` +
    `user:read:broadcast+` +
    `user:read:email+` +
    `user:read:follows+` +
    `user:read:subscriptions+` +
    `channel:moderate+` +
    //`whispers:edit+` +
    `chat:edit`

export async function TwitchSetup(app: express.Application): Promise<void> {
    server = app

    server.get(
        "/twitch/callback",
        async function (req: express.Request, res: express.Response) {
            console.log("Twitch Callback received")
            if (isFirstAuth) {
                isFirstAuth = false
                botTwitchAccessToken = await exchangeCode(
                    process.env.TWITCH_CLIENT_ID!,
                    process.env.TWITCH_CLIENT_SECRET!,
                    req.query.code as string,
                    process.env.TWITCH_REDIRECT_URI!
                )
                const streamerAuthWindow = open(authorizeURL, {
                    app: { name: process.env.STREAMERBROWSER! },
                })
            } else {
                streamerTwitchAccessToken = await exchangeCode(
                    process.env.TWITCH_CLIENT_ID!,
                    process.env.TWITCH_CLIENT_SECRET!,
                    req.query.code as string,
                    process.env.TWITCH_REDIRECT_URI!
                )
                ContinueTwitchSetup()
            }
        }
    )

    open(authorizeURL, { app: { name: process.env.BOTBROWSER! } })

    return
}

async function ContinueTwitchSetup() {
    console.log("Continuing Twitch Setup")

    botAuthProvider = new RefreshingAuthProvider({
        clientId: process.env.TWITCH_CLIENT_ID!,
        clientSecret: process.env.TWITCH_CLIENT_SECRET!,
    })

    // Add initial user with tokens from environment
    await botAuthProvider.addUserForToken(
        {
            accessToken: botTwitchAccessToken.accessToken,
            refreshToken: botTwitchAccessToken.refreshToken,
            expiresIn: 0, // Will force a refresh on first use
            obtainmentTimestamp: 0,
        },
        ["chat"] // This line fixes the error
    )

    // Set up a handler to save tokens when they refresh
    botAuthProvider.onRefresh(async (userId, newTokenData) => {
        try {
            // Update the tokens for this user
            botTwitchAccessToken = newTokenData
            console.log(`Tokens refreshed for user ${userId}`)
        } catch (error) {
            console.error("Error saving refreshed tokens:", error)
        }
    })

    streamerAuthProvider = new RefreshingAuthProvider({
        clientId: process.env.TWITCH_CLIENT_ID!,
        clientSecret: process.env.TWITCH_CLIENT_SECRET!,
    })

    // Add initial user with tokens from environment
    await streamerAuthProvider.addUserForToken({
        accessToken: streamerTwitchAccessToken.accessToken,
        refreshToken: streamerTwitchAccessToken.refreshToken,
        expiresIn: 0, // Will force a refresh on first use
        obtainmentTimestamp: 0,
    })

    // Set up a handler to save tokens when they refresh
    streamerAuthProvider.onRefresh(async (userId, newTokenData) => {
        try {
            // Update the tokens for this user
            streamerTwitchAccessToken = newTokenData
            console.log(`Tokens refreshed for user ${userId}`)
        } catch (error) {
            console.error("Error saving refreshed tokens:", error)
        }
    })

    chatClient = new ChatClient({
        authProvider: botAuthProvider,
        channels: ["Wingman953"],
    })

    chatClient.onConnect(() => {
        console.log("* Connected!")
    })

    apiClient = new ApiClient({
        authProvider: streamerAuthProvider,
    })

    let findWingman953 = await apiClient.users.getUserByName("Wingman953")

    if (findWingman953 != null) {
        Wingman953 = findWingman953
    } else {
        console.log("ERROR: Failed to find streamer user.")
        return
    }

    //Find Reward Info
    const rewardsWingman953 = await apiClient.channelPoints.getCustomRewards(
        Wingman953?.id!,
        false
    )

    for (let reward = 0; reward < rewardsWingman953.length; reward++) {
        if (rewardsWingman953[reward].title == "Start a Quiz Round") {
            quizStartReward = rewardsWingman953[reward]
        }
    }

    const redemptionsWingman953 =
        await apiClient.channelPoints.getRedemptionsForBroadcaster(
            Wingman953?.id as string,
            quizStartReward.id,
            "UNFULFILLED",
            { newestFirst: true }
        )

    await chatClient.connect()

    twitchApiPollingInterval = setInterval(TwitchApiPolling, 5000) // 5secs

    chatClient.onMessage(async (channel, user, message, msg) => {
        const badges = msg.userInfo.badges

        const unifiedMessage: UnifiedChatMessage = {
            id: msg.id,
            platform: "twitch",
            timestamp: new Date(),
            channel: {
                id: msg?.channelId || undefined,
                name: channel.replace("#", ""),
            },
            author: {
                id: msg.userInfo.userId,
                name: user,
                displayName: msg.userInfo.displayName || user,
                isModerator: msg.userInfo.isMod || false,
                isSubscriber: msg.userInfo.isSubscriber || false,
                isOwner: msg.userInfo.isBroadcaster || false,
            },
            message: {
                text: message,
                isHighlighted: msg.isHighlight || false,
            },
            platformSpecific: {
                bits: msg.bits,
                firstMessage: msg.isFirst,
                returningChatter: msg.isReturningChatter,
            },
        }

        handleChatMessage(unifiedMessage)
    })

    chatClient.onSub((channel, user) => {
        let subMessage: UnifiedChatMessage = Wingbot953Message
        subMessage.message.text = `wingma14Blush Thank you @${user} for subscribing to the channel! wingma14Blush Let's celebrate with a Quiz!`
        subMessage.platform = "twitch"

        sleep(1000).then(() => {
            sendChatMessage(subMessage)
        })

        setTimeout(() => {
            StartQuiz()
        }, 5000)
    })

    chatClient.onResub((channel, user, subInfo) => {
        let resubMessage: UnifiedChatMessage = Wingbot953Message
        resubMessage.message.text = `wingma14Blush Thank you @${user} for resubscribing to the channel for a total of ${subInfo.months} months! wingma14Blush Let's celebrate with a Quiz!`
        resubMessage.platform = "twitch"

        sleep(1000).then(() => {
            sendChatMessage(resubMessage)
        })

        setTimeout(() => {
            StartQuiz()
        }, 5000)
    })

    chatClient.onSubGift((channel, user, subInfo) => {
        let subGiftMessage: UnifiedChatMessage = Wingbot953Message
        subGiftMessage.message.text = `wingma14Blush Thank you ${subInfo.gifter} for gifting a subscription to ${user}! wingma14Blush Let's celebrate with a Quiz!`
        subGiftMessage.platform = "twitch"

        sleep(1000).then(() => {
            sendChatMessage(subGiftMessage)
        })

        setTimeout(() => {
            StartQuiz()
        }, 5000)
    })

    chatClient.onRaid((channel, user, raidInfo) => {
        let raidMessage: UnifiedChatMessage = Wingbot953Message
        raidMessage.message.text = `wingma14Blush Thank you ${raidInfo.displayName} for the raid! wingma14Blush Let's celebrate with a Quiz!`
        raidMessage.platform = "twitch"

        sleep(1000).then(() => {
            sendChatMessage(raidMessage)
        })

        setTimeout(() => {
            StartQuiz()
        }, 5000)
    })
}

async function TwitchApiPolling() {
    try {
        const streamWingman953 = await apiClient.streams.getStreamByUserId(
            Wingman953?.id as string
        )

        // Gone Live!
        const currentTimestamp = Date.now()
        if (isLive && streamWingman953?.startDate == null) {
            isLive = false
            console.log("Streamer went offline!")

            clearInterval(quizInterval)
            //clearInterval(didYouKnowInterval)
            clearInterval(periodicMessagesInterval)
            clearInterval(streamNameAndGameInterval)

            let endstreamMessage: UnifiedChatMessage = Wingbot953Message
            endstreamMessage.platform = "twitch"
            endstreamMessage.message.text = `wingma14Blush Thanks for the stream!`
            sendChatMessage(endstreamMessage)
        } else if (
            !isLive &&
            streamWingman953?.startDate != undefined /* &&
        streamWingman953?.startDate.getTime() > currentTimestamp*/
        ) {
            isLive = true
            console.log("Streamer went live!")

            streamName = streamWingman953.title
            streamGame = streamWingman953.gameName

            TwitchLivestreamAlert(streamName, streamGame)
            LoadWelcomeMessages()
            ResetUsedQuestions()
            HaloRunsSetup()

            // Automatic messages on timers
            quizInterval = setInterval(StartQuiz, Between(2100000, 2700000)) // 35-45mins
            //didYouKnowInterval = setInterval(SendDidYouKnowFact, 2580000) // 43mins
            periodicMessagesInterval = setInterval(PeriodicMessages, 3300000) // 55mins
            streamNameAndGameInterval = setInterval(
                PollStreamNameAndGame,
                60000
            ) // 1min

            let startStreamMessage: UnifiedChatMessage = Wingbot953Message
            startStreamMessage.platform = "twitch"
            startStreamMessage.message.text = `wingma14Arrive Good Luck Streamer! wingma14Blush`
            sendChatMessage(startStreamMessage)
        }

        // Quiz Start!
        const redemptionsWingman953 =
            await apiClient.channelPoints.getRedemptionsForBroadcaster(
                Wingman953?.id as string,
                quizStartReward.id,
                "UNFULFILLED",
                { newestFirst: true }
            )

        if (
            redemptionsWingman953.data.length > 0 &&
            redemptionsWingman953.data[0].redemptionDate.getTime() >
                latestRedemptionDate
        ) {
            latestRedemptionDate =
                redemptionsWingman953.data[0].redemptionDate.getTime()
            HandleRedemption(redemptionsWingman953.data[0].rewardTitle)
        }
    } catch {
        console.log("CATCH: Failed to reach Twitch API.")
    }
}

export function sendTwitchMessage(message: string, minDelay = 0, maxDelay = 0) {
    let delay = minDelay

    if (minDelay > 0 && maxDelay > 0) {
        delay = Between(minDelay, maxDelay)
    }

    setTimeout(() => {
        try {
            chatClient.say("Wingman953", message)
        } catch (error: any) {
            console.log(
                `* ERROR: Twitch Message FAILED to send: ${error.message}`
            )
        }
    }, delay)
}

async function PollStreamNameAndGame() {
    try {
        const streamWingman953 = await apiClient.streams.getStreamByUserId(
            Wingman953?.id as string
        )

        if (
            streamWingman953?.title !== streamName ||
            streamWingman953?.gameName !== streamGame
        ) {
            streamName = streamWingman953?.title!
            streamGame = streamWingman953?.gameName!
            TwitchLivestreamAlert(streamName, streamGame)
        }
    } catch {
        console.log("CATCH: Failed to reach Twitch API.")
    }
}

function HandleRedemption(rewardTitle: string) {
    if (rewardTitle === "Start a Quiz Round") {
        StartQuiz()
    }

    if (rewardTitle === "") {
        AddTracksFromPlaylistToQueue("", 7)
    }
}

export async function HandleFollowAge(msg: UnifiedChatMessage) {
    try {
        const followInfo = await apiClient.channels.getChannelFollowers(
            Wingman953.id,
            msg.author.id
        )

        let followMessage: UnifiedChatMessage = Wingbot953Message
        followMessage.platform = "twitch"

        // Check if the user is following the broadcaster
        if (!followInfo.data.length) {
            console.log(
                `${msg.author.displayName} is not following ${Wingman953.displayName}`
            )

            followMessage.message.text = `@${msg.author.displayName} You are not following!`

            sendChatMessage(followMessage)
            return
        }

        const followData = followInfo.data[0]
        const followDate = new Date(followData.followDate)
        const currentTimestamp = Date.now()
        const followStartTimestamp = followDate.getTime()

        followMessage.message.text = `@${
            msg.author.displayName
        } You have been following for ${SecondsToDuration(
            (currentTimestamp - followStartTimestamp) / 1000
        )}!`

        sendChatMessage(followMessage)
    } catch {
        console.log("CATCH: Failed to retrieve follow age.")
    }
}

export async function HandleUptime(msg: UnifiedChatMessage) {
    try {
        const channel = await apiClient.channels.getChannelInfoById(
            msg.channel.id!
        )
        const stream = await apiClient.streams.getStreamByUserName(
            channel?.displayName!
        )

        if (stream) {
            const currentTimestamp = Date.now()
            const streamStartTimestamp = stream.startDate.getTime()

            let uptimeMessage = Wingbot953Message
            uptimeMessage.message.text = `@${
                msg.author.displayName
            } Stream uptime: ${SecondsToDuration(
                (currentTimestamp - streamStartTimestamp) / 1000
            )}`
            uptimeMessage.platform = "twitch"

            sendChatMessage(uptimeMessage)
        } else {
            console.log("* ERROR Failed to get stream uptime.")
        }
    } catch {
        console.log("CATCH: Failed to reach Twitch API.")
    }
}

async function CreateReward() {
    let playlists: string[] = [
        "[P] Capital Cities", // To Do
        "[P] Empire of the Sun", // To Do
        "[P] Bad Suns", // To Do
        "[P] The Naked and Famous", // To Do
        "[P] Great Good Fine Ok",
        "[P] XY&O", // To Do
        "[P] STARSET",
        "[P] Cold War Kids",
        "[P] Penguin Prison",
        "[P] NCS (NoCopyrightSounds)", // To Do
        "[P] KOLIDESCOPES",
        "[P] Moxie",
    ]
    // "[P] Foster the People", "[P] Phoenix", "[P] The Killers", "[P] Two Door Cinema Club", "[P] Walk the Moon",

    for (let i = 0; i < playlists.length; i++) {
        await apiClient.channelPoints.createCustomReward(
            Wingman953?.id as string,
            {
                autoFulfill: false,
                backgroundColor: "#392e5c",
                cost: 1800,
                globalCooldown: 60,
                isEnabled: true,
                title: "Start a Quiz Round",
                userInputRequired: false,
            }
        )
        console.log("Reward created!")
    }
}
