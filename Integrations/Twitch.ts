import {
    RefreshingAuthProvider,
    exchangeCode,
    AccessToken,
} from "@twurple/auth"
import { ChatClient } from "@twurple/chat"
import { ApiClient, HelixCustomReward, HelixUser } from "@twurple/api"
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage"
import open from "open"

import { CheckForVipWelcome, LoadWelcomeMessages } from "../Commands/VipWelcome"
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
    ResetUsedQuestions,
    AddQuizScore,
    PublishNewLeaderboard,
    PublishLeaderboards,
} from "../Commands/Quiz"
import { SendDidYouKnowFact, HandleFastFact } from "../Commands/FastFacts"
import {
    GetCurrentSong,
    AddTracksFromPlaylistToQueue,
    FuzzySearchAndQueue,
} from "./Spotify"
import { LivestreamAlert } from "./Discord"

import express = require("express")
import { HaloRunsSetup, HandleHaloRunsWr, HandleWingman953Pb } from "./HaloRuns"

const debug = false

let Wingman953: HelixUser | null

let botTwitchAccessToken: AccessToken
let streamerTwitchAccessToken: AccessToken
let botAuthProvider
let streamerAuthProvider
let server: express.Application
let chatClient: ChatClient
let apiClient: ApiClient

const commandsList: Array<string> = ["", ""]

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

export async function TwitchSetup(app: express.Application) {
    GenerateCommandsList()

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
}

async function ContinueTwitchSetup() {
    botAuthProvider = new RefreshingAuthProvider(
        {
            clientId: process.env.TWITCH_CLIENT_ID!,
            clientSecret: process.env.TWITCH_CLIENT_SECRET!,
            onRefresh: async (newTokenData) => {
                botTwitchAccessToken = newTokenData
            },
        },
        botTwitchAccessToken
    )

    streamerAuthProvider = new RefreshingAuthProvider(
        {
            clientId: process.env.TWITCH_CLIENT_ID!,
            clientSecret: process.env.TWITCH_CLIENT_SECRET!,
            onRefresh: async (newTokenData) => {
                streamerTwitchAccessToken = newTokenData
            },
        },
        streamerTwitchAccessToken
    )

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

    Wingman953 = await apiClient.users.getUserByName("Wingman953")

    // Find Reward Info
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
        // Ignore messages from the bot
        if (msg.userInfo.displayName === "Wingbot953") {
            return
        }

        if (debug)
            console.log(
                `DEBUG: User message received from ${msg.userInfo.displayName.toLowerCase()}: ${message}`
            )

        if (isLive) {
            CheckForVipWelcome(msg.userInfo.displayName)
        }

        Converse(user, msg)

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
            `wingma14Blush Thank you @${user} for subscribing to the channel! wingma14Blush Let's celebrate with a Quiz!`,
            1000
        )

        setTimeout(() => {
            StartQuiz()
        }, 5000)
    })

    chatClient.onResub((channel, user, subInfo) => {
        SendMessage(
            "resubthanks",
            `wingma14Blush Thank you @${user} for subscribing to the channel for a total of ${subInfo.months} months! wingma14Blush Let's celebrate with a Quiz!`,
            1000
        )

        setTimeout(() => {
            StartQuiz()
        }, 5000)
    })

    chatClient.onSubGift((channel, user, subInfo) => {
        SendMessage(
            "giftsubthanks",
            `wingma14Blush Thank you ${subInfo.gifter} for gifting a subscription to ${user}! wingma14Blush Let's celebrate with a Quiz!`,
            1000
        )

        setTimeout(() => {
            StartQuiz()
        }, 5000)
    })

    chatClient.onRaid((channel, user, raidInfo) => {
        SendMessage(
            "raidthanks",
            `wingma14Blush Thank you ${raidInfo.displayName} for the raid! wingma14Blush Let's celebrate with a Quiz!`,
            2000
        )

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

            SendMessage(
                "streamend",
                `wingma14Blush Thanks for the stream!`,
                1000
            )
        } else if (
            !isLive &&
            streamWingman953?.startDate != undefined /* &&
        streamWingman953?.startDate.getTime() > currentTimestamp*/
        ) {
            isLive = true
            console.log("Streamer went live!")

            streamName = streamWingman953.title
            streamGame = streamWingman953.gameName

            LivestreamAlert(streamName, streamGame)
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

            SendMessage(
                "streamstart",
                `wingma14Arrive Good Luck Streamer! wingma14Blush`,
                1000
            )
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

export function SendMessage(
    command: string,
    message: string,
    minDelay = 0,
    maxDelay = 0
) {
    let delay = minDelay

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
            LivestreamAlert(streamName, streamGame)
        }
    } catch {
        console.log("CATCH: Failed to reach Twitch API.")
    }
}

const periodicMessages = [
    "/me Enjoying the stream? Watching, chatting, following, cheering, subscribing or donating are all great ways to support the stream. Your support allows me to continue investing time into the channel and it is greatly appreciated!",
    "/me Got a song suggestion? Feel free to share it with the streamer and it may be added to the stream playlist!",
    "/me Join Wingman953's Discord Server here: https://discord.gg/6KPBTApkJ8",
    "You got this streamer! Keep up the good work!",
    "wingma14Jam",
]

function PeriodicMessages() {
    SendMessage(
        "periodicMessage",
        periodicMessages[Between(0, periodicMessages.length - 1)]
    )
}

const converseResponses = [
    "yea jon",
    "correct jacob",
    "truthful sean",
    "definitely joseph",
    "exactly hurricane",
    "precisely vance",
    "affirmative nik",
    "absolutely andrew",
    "agreed matt",
    "excellent jack",
    "splendid grant",
    "unquestionably neil",
    "positively brent",
    "okeydokey brayden",
]

function Converse(user: string, msg: TwitchPrivateMessage) {
    const msgWords = msg.content.value.split(" ")[0].trim().toLowerCase()
    if (msgWords === "is" && Between(0, 99) < 40) {
        SendMessage(
            "converse",
            converseResponses[Between(0, converseResponses.length - 1)]
        )
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

async function HandleFollowAge(msg: TwitchPrivateMessage) {
    try {
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
    } catch {
        console.log("CATCH: Failed to reach Twitch API.")
    }
}

async function HandleUptime(msg: TwitchPrivateMessage) {
    try {
        const channel = await apiClient.channels.getChannelInfoById(
            msg.channelId!
        )
        const stream = await apiClient.streams.getStreamByUserName(
            channel?.displayName!
        )

        if (stream) {
            const currentTimestamp = Date.now()
            const streamStartTimestamp = stream.startDate.getTime()
            SendMessage(
                "!uptime",
                `@${
                    msg.userInfo.displayName
                } Stream uptime: ${SecondsToDuration(
                    (currentTimestamp - streamStartTimestamp) / 1000
                )}`
            )
        } else {
            console.log("* ERROR Failed to get stream uptime.")
        }
    } catch {
        console.log("CATCH: Failed to reach Twitch API.")
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
    const command = msg.content.value.split(" ")[0].trim().toLowerCase()

    for (let i = 0; i < commandDictionary.length; i++) {
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
                    let commandMessageIndex = 0;
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
                const commandMessageIndex = Between(
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

// Generates and the commands list
function GenerateCommandsList() {
    const list = []

    // Generate commands list
    for (let i = 0; i < commandMap.length; i++) {
        if (
            list.indexOf(commandMap[i].Command[0]) < 0 &&
            commandMap[i].Command[0].includes("!")
        ) {
            list.push(commandMap[i].Command[0])
        }
    }

    for (let i = 0; i < quoteMap.length; i++) {
        if (list.indexOf(quoteMap[i].Command[0]) < 0) {
            list.push(quoteMap[i].Command[0])
        }
    }

    for (let i = 0; i < functionMap.length; i++) {
        if (list.indexOf(functionMap[i].Command[0]) < 0) {
            list.push(functionMap[i].Command[0])
        }
    }

    list.sort()

    for (let i = 0; i < Math.floor(list.length / 2); i++) {
        commandsList[0] = commandsList[0] + " " + list[i]
    }

    for (let i = Math.floor(list.length / 2); i < list.length; i++) {
        commandsList[1] = commandsList[1] + " " + list[i]
    }
}

function HandleCommandsList() {
    // Commands list too long, split somehow
    SendMessage("!commandslist", commandsList[0])
    SendMessage("!commandslist", commandsList[1])
}

async function CreateQuizReward() {
    // await apiClient.channelPoints.createCustomReward(Wingman953?.id as string, {
    //     autoFulfill: false,
    //     backgroundColor: "#392e5c",
    //     cost: 1800,
    //     globalCooldown: 60,
    //     isEnabled: true,
    //     title: "Start a Quiz Round",
    //     userInputRequired: false,
    // })
    // console.log("Reward created!")
}

const functionMap = [
    {
        Command: ["!commands", "!commandsList"],
        Function: HandleCommandsList,
    },
    {
        Command: ["!random", "!range", "!roll"],
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
    {
        Command: ["!sr", "!songrequest"],
        Username: ["Wingman953"],
        Function: FuzzySearchAndQueue,
    },
    // HaloRuns
    {
        Command: ["!wr"],
        Function: HandleHaloRunsWr,
    },
    {
        Command: ["!pb"],
        Function: HandleWingman953Pb,
    },
    // Quiz
    {
        Command: ["!quizstart"],
        Username: ["Wingman953"],
        Function: StartQuiz,
    },
    {
        Command: ["!quizscore", "!score", "!points"],
        Function: GetMyQuizScore,
    },
    {
        Command: ["!addscore"],
        Username: ["Wingman953"],
        Function: AddQuizScore,
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
    {
        Command: ["!publishleaderboards"],
        Username: ["Wingman953"],
        Function: PublishLeaderboards,
    },
    {
        Command: ["!publishnewleaderboard"],
        Username: ["Wingman953"],
        Function: PublishNewLeaderboard,
    },
    {
        Command: ["!createquiz"],
        Username: ["Wingman953"],
        Function: CreateQuizReward,
    },
]
