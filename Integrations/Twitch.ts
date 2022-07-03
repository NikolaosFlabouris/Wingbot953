import {
    RefreshingAuthProvider,
    exchangeCode,
    AccessToken,
} from "@twurple/auth"
import { ChatClient } from "@twurple/chat"
import { ApiClient } from "@twurple/api"
import {
    EventSubChannelRedemptionAddEvent,
    EventSubListener,
} from "@twurple/eventsub"
import { NgrokAdapter } from "@twurple/eventsub-ngrok"
import { PubSubClient, PubSubRedemptionMessage } from "@twurple/pubsub"
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage"
import open from "open"
import readline from "readline"

import { CheckForVipWelcome } from "../Commands/VipWelcome"
import { SecondsToDuration, Between } from "../Commands/Utils"
import {
    commandMap,
    HandleRandomNumberGeneration,
} from "../Commands/GeneralCommands"
import { quoteMap, HandleOdstQuote } from "../Commands/Quotes"
import {
    onQuizHandler,
    StartQuiz,
    GetMyQuizScore,
    DisplayQuizLeaderboards,
} from "../Commands/Quiz"
import { SendDidYouKnowFact, HandleFastFact } from "../Commands/FastFacts"
import { GetCurrentSong } from "./Spotify"
import axios from "axios"

import express = require("express")

var debug = false

let twitchAccessToken: AccessToken
var authProvider

let chatClient: ChatClient
let apiClient: ApiClient

var authorizeURL =
    `https://id.twitch.tv/oauth2/authorize?` +
    `client_id=${process.env.TWITCH_CLIENT_ID}` +
    `&redirect_uri=${process.env.TWITCH_REDIRECT_URI}` +
    `&response_type=code` +
    `&scope=chat:read+` +
    `chat:edit+` +
    `channel:read:redemptions+` +
    `channel:moderate+` +
    `channel:read:subscriptions+` +
    `channel:read:predictions+` +
    `channel:read:polls+` +
    `channel:read:goals`

export async function TwitchSetup(server: express.Application) {
    GenerateCommandsList()

    server.get(
        "/twitch/callback",
        async function (req: express.Request, res: express.Response) {
            console.log("Twitch Callback received")
            twitchAccessToken = await exchangeCode(
                process.env.TWITCH_CLIENT_ID!,
                process.env.TWITCH_CLIENT_SECRET!,
                req.query.code as string,
                process.env.TWITCH_REDIRECT_URI!
            )
            ContinueTwitchSetup()
        }
    )

    var authWindow = open(authorizeURL, { app: { name: "msedge" } })

    // axios
    //     .get(authorizeURL)
    //     .then((res) => {
    //         console.log(`Twitch statusCode: ${res.status}`)
    //     })
    //     .catch((error) => {
    //         console.error(error)
    //     })
}

async function ContinueTwitchSetup() {
    console.log("Continuing Setup")
    authProvider = new RefreshingAuthProvider(
        {
            clientId: process.env.TWITCH_CLIENT_ID!,
            clientSecret: process.env.TWITCH_CLIENT_SECRET!,
            onRefresh: async (newTokenData) => {
                twitchAccessToken = newTokenData
            },
        },
        twitchAccessToken
    )

    chatClient = new ChatClient({
        authProvider,
        channels: ["Wingman953"],
    })

    chatClient.onConnect(() => {
        console.log("* Connected!")
    })

    apiClient = new ApiClient({
        authProvider,
    })

    await chatClient.connect()

    const pubSubClient = new PubSubClient()
    const userId = await pubSubClient.registerUserListener(authProvider)

    const listener = await pubSubClient.onRedemption(
        userId,
        (message: PubSubRedemptionMessage) => {
            HandleRedemption(message)
        }
    )

    // Automatic messages on timers
    var quizInterval = setInterval(StartQuiz, Between(2100000, 2700000)) // 35-45mins
    //var didYouKnowInterval = setInterval(SendDidYouKnowFact, 2580000) // 43mins
    var periodicMessagesInterval = setInterval(PeriodicMessages, 3300000) // 55mins

    chatClient.onMessage(async (channel, user, message, msg) => {
        // Ignore messages from the bot
        if (msg.userInfo.displayName === "Wingbot953") {
            return
        }

        if (msg.isRedemption) {
            console.log("Redemption redeemed")
            console.log(msg)
        }

        if (debug)
            console.log(
                `DEBUG: User message received from ${msg.userInfo.displayName.toLowerCase()}: ${message}`
            )

        CheckForVipWelcome(msg.userInfo.displayName)

        onQuizHandler(user, msg)

        if (debug) console.log("DEBUG: Command handling")

        /* COMMAND DICTIONARIES */
        if (SearchCommandDictionary(msg, commandMap)) {
            return
        }

        if (SearchCommandDictionary(msg, quoteMap)) {
            return
        }

        if (SearchCommandDictionary(msg, functionMap)) {
            return
        }

        if (msg.content.value.charAt(0) == "!") {
            SendMessage(
                message.split(" ")[0].trim().toLowerCase(),
                "Unknown command"
            )
        }
    })

    chatClient.onSub((channel, user) => {
        SendMessage(
            "subthanks",
            `Thank you @${user} for subscribing to the channel!`,
            1000
        )
    })

    chatClient.onResub((channel, user, subInfo) => {
        SendMessage(
            "resubthanks",
            `Thank you @${user} for subscribing to the channel for a total of ${subInfo.months} months!`,
            1000
        )
    })

    chatClient.onSubGift((channel, user, subInfo) => {
        SendMessage(
            "giftsubthanks",
            `Thank you ${subInfo.gifter} for gifting a subscription to ${user}!`,
            1000
        )
    })
}

export function SendMessage(
    command: string,
    message: string,
    minDelay = 0,
    maxDelay = 0
) {
    var delay = minDelay

    if (minDelay > 0 && maxDelay > 0) {
        delay = Between(minDelay, maxDelay)
    }

    setTimeout(() => {
        try {
            chatClient.say("Wingman953", message)
            console.log(
                `* Executed ${command} command with the following response: ${message}`
            )
        } catch (error: any) {
            console.log(
                `* ERROR: Executed ${command} and FAILED to send the following response: ${error.message}`
            )
        }
    }, delay)
}

var periodicMessages = [
    "/me Enjoying the stream? Watching, chatting, following, cheering or subscribing are all great ways to support the stream. Your support allows me to continue investing time into the channel and it is greatly appreciated!",
    "/me Got a song suggestion? Feel free to share it with the streamer and it may be added to the stream playlist!",
    "/me Join Wingman953's Discord Server here: https://discord.gg/6KPBTApkJ8",
]

function PeriodicMessages() {
    SendMessage(
        "channelsupport",
        periodicMessages[Between(0, periodicMessages.length - 1)]
    )
}

function HandleRedemption(message: PubSubRedemptionMessage) {
    if (message.rewardTitle === "Start a Quiz Round") {
        StartQuiz()
    }
}

async function HandleFollowAge(msg: TwitchPrivateMessage) {
    const follow = await apiClient.users.getFollowFromUserToBroadcaster(
        msg.userInfo.userId,
        msg.channelId!
    )

    if (follow) {
        const currentTimestamp = Date.now()
        const followStartTimestamp = follow.followDate.getTime()
        SendMessage(
            "!followage",
            `@${
                msg.userInfo.displayName
            } You have been following for ${SecondsToDuration(
                (currentTimestamp - followStartTimestamp) / 1000
            )}!`
        )
    } else {
        SendMessage(
            "!followage",
            `@${msg.userInfo.displayName} You are not following!`
        )
    }
}

async function HandleUptime(msg: TwitchPrivateMessage) {
    const channel = await apiClient.channels.getChannelInfoById(msg.channelId!)
    const stream = await apiClient.streams.getStreamByUserName(
        channel?.displayName!
    )

    if (stream) {
        const currentTimestamp = Date.now()
        const streamStartTimestamp = stream.startDate.getTime()
        SendMessage(
            "!uptime",
            `@${msg.userInfo.displayName} Stream uptime: ${SecondsToDuration(
                (currentTimestamp - streamStartTimestamp) / 1000
            )}`
        )
    } else {
        console.log("* ERROR Failed to get stream uptime.")
    }
}

///
/// Searches the given command dictionary and performs the required
/// actions if a command is found.
///
function SearchCommandDictionary(
    msg: TwitchPrivateMessage,
    commandDictionary: any[]
) {
    var command = msg.content.value.split(" ")[0].trim().toLowerCase()

    for (var i = 0; i < commandDictionary.length; i++) {
        // Check if the command exists.
        if (commandDictionary[i].Command.includes(command)) {
            // Check if the user is authorised.
            if (
                commandDictionary[i].Username &&
                !commandDictionary[i].Username.includes(
                    msg.userInfo.displayName
                )
            ) {
                continue
            }

            if (commandDictionary[i].Function) {
                if (debug) console.log("DEBUG: Running function")
                commandDictionary[i].Function(msg)
            } else if (commandDictionary[i].AllMessages) {
                if (debug)
                    console.log("DEBUG: Sending all messages for command")

                // Send all messages.
                for (
                    var commandMessageIndex = 0;
                    commandMessageIndex < commandDictionary[i].Message.length;
                    commandMessageIndex++
                ) {
                    SendMessage(
                        command,
                        commandDictionary[i].Message[commandMessageIndex]
                    )
                }
            } else {
                // Pick a random message from the list and send.
                var commandMessageIndex = Between(
                    0,
                    commandDictionary[i].Message.length - 1
                )

                if (debug)
                    console.log("DEBUG: Sending random message from list")

                SendMessage(
                    command,
                    commandDictionary[i].Message[commandMessageIndex]
                )
            }
            return true
        }
    }
    return false
}

let commandsList: string

// Generates and the commands list
function GenerateCommandsList() {
    var list = []

    // Generate commands list
    for (var i = 0; i < commandMap.length; i++) {
        if (
            list.indexOf(commandMap[i].Command[0]) < 0 &&
            commandMap[i].Command[0].includes("!")
        ) {
            list.push(commandMap[i].Command[0])
        }
    }

    for (var i = 0; i < quoteMap.length; i++) {
        if (list.indexOf(quoteMap[i].Command[0]) < 0) {
            list.push(quoteMap[i].Command[0])
        }
    }

    for (var i = 0; i < functionMap.length; i++) {
        if (list.indexOf(functionMap[i].Command[0]) < 0) {
            list.push(functionMap[i].Command[0])
        }
    }

    list.sort()

    commandsList = list[0]

    for (var i = 1; i < list.length; i++) {
        commandsList = commandsList + " " + list[i]
    }
}

function HandleCommandsList() {
    // Commands list too long, split somehow
    SendMessage("!commandslist", commandsList)
}

var functionMap = [
    {
        Command: ["!commands", "!commandsList"],
        Function: HandleCommandsList,
    },
    {
        Command: ["!random", "!range"],
        Function: HandleRandomNumberGeneration,
    },
    {
        Command: ["!odstquote", "!odstquotes"],
        Function: HandleOdstQuote,
    },
    {
        Command: ["!fastfact", "!odstfact"],
        Function: HandleFastFact,
    },
    // Twitch
    {
        Command: ["!followage"],
        Function: HandleFollowAge,
    },
    {
        Command: ["!uptime"],
        Function: HandleUptime,
    },
    // Spotify
    {
        Command: ["!song"],
        Function: GetCurrentSong,
    },
    // Quiz
    {
        Command: ["!quizstart"],
        Username: ["Wingman953"],
        Function: StartQuiz,
    },
    {
        Command: ["!quizscore", "!score"],
        Function: GetMyQuizScore,
    },
    {
        Command: [
            "!quizleaderboard",
            "!quizleaderboards",
            "!leaderboards",
            "!leaderboard",
        ],
        Function: DisplayQuizLeaderboards,
    },
]
