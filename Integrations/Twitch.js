import { RefreshingAuthProvider } from "@twurple/auth"
import { ChatClient } from "@twurple/chat"
import axios from "axios"
import { CheckForVipWelcome } from "./../Commands/VipWelcome.mjs"
import { Between } from "./../Commands/Utils.mjs"
import { commandMap } from "./../Commands/GeneralCommands.mjs"
import { quoteMap } from "./../Commands/Quotes.mjs"
import { functionMap } from "./../Commands/FunctionMap.mjs"
import { onQuizHandler, StartQuiz } from "./../Commands/Quiz.mjs"
import open from "open"
import readline from "readline"
import { SendDidYouKnowFact } from "./../Commands/FastFacts.mjs"

var debug = false

var accessToken
var refreshToken
var expiresIn

var authProvider
var chatClient

var authorizeURL = `https://id.twitch.tv/oauth2/authorize?client_id=${process.env.TWITCH_CLIENT_ID}&redirect_uri=${process.env.TWITCH_REDIRECT_URI}&response_type=code&scope=chat:read+chat:edit`

export async function TwitchSetup() {
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    var authCode
    var authWindow = open(authorizeURL, { app: { name: "msedge" } })

    await new Promise((response) =>
        rl.question("Please enter in the Twitch token: ", (ans) => {
            rl.close()
            authCode = ans
            response(ans)
        })
    )

    await axios
        .post(
            `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&code=${authCode}&grant_type=authorization_code&redirect_uri=${process.env.TWITCH_REDIRECT_URI}`
        )
        .then((response) => {
            console.log(`Twitch statusCode: ${response.status}`)
            accessToken = response.data.access_token
            refreshToken = response.data.refresh_token
        })
        .catch((error) => {
            console.error(error)
        })

    authProvider = new RefreshingAuthProvider(
        {
            clientId: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
        },
        {
            accessToken: accessToken,
            refreshToken: refreshToken,
            refreshToken: 0,
            onRefresh: async (newTokenData) => {
                accessToken = newTokenData.accessToken
                refreshToken = newTokenData.refreshToken
                expiresIn = newTokenData.expiresIn
            },
        }
    )

    chatClient = new ChatClient({
        authProvider,
        channels: ["Wingman953"],
    })

    chatClient.onConnect(() => {
        console.log("* Connected!")
    })

    await chatClient.connect()

    // Automatic messages on timers
    var quizInterval = setInterval(StartQuiz, 2100000) // 35mins
    //var didYouKnowInterval = setInterval(SendDidYouKnowFact, 2580000) // 43mins
    var supportInterval = setInterval(ChannelSupport, 2580000) // 43mins

    chatClient.onMessage(async (channel, user, message, msg) =>
        onQuizHandler(user, message)
    )

    chatClient.onMessage(async (channel, user, message, msg) => {
        // Ignore messages from the bot
        if (user === "Wingbot953") {
            return
        }

        if (debug) console.log(`DEBUG: User message received from ${user}`)

        CheckForVipWelcome(user)

        // MONITOR PERFORMANCE, IF POOR UNCOMMENT BELOW TO FILTER MESSAGES

        // Remove whitespace and make lowercase.
        // const command = msg.split(" ")[0].trim().toLowerCase()

        // Ignore messages that don't begin with an exclamation mark.
        // if (command.charAt(0) != "!") {
        //     return
        // }

        if (debug) console.log("DEBUG: Command handling")

        /* COMMAND DICTIONARIES */
        if (SearchCommandDictionary(message, commandMap, user)) {
            return
        }

        if (SearchCommandDictionary(message, quoteMap, user)) {
            return
        }

        if (SearchCommandDictionary(message, functionMap, user)) {
            return
        }

        if (message.charAt(0) == "!") {
            SendMessage(
                message.split(" ")[0].trim().toLowerCase(),
                "Unknown command"
            )
        }

        if (message === "!followage") {
            const follow = await apiClient.users.getFollowFromUserToBroadcaster(
                message.userInfo.userId,
                message.channelId
            )

            if (follow) {
                const currentTimestamp = Date.now()
                const followStartTimestamp = follow.followDate.getTime()
                SendMessage(
                    "!followage",
                    `@${user} You have been following for ${secondsToDuration(
                        (currentTimestamp - followStartTimestamp) / 1000
                    )}!`
                )
            } else {
                SendMessage("!followage", `@${user} You are not following!`)
            }
        }
    })

    chatClient.onSub((channel, user) => {
        SendMessage(
            "subthanks",
            `Thank you @${user} for subscribing to the channel!`
        )
    })

    chatClient.onResub((channel, user, subInfo) => {
        SendMessage(
            "resubthanks",
            `Thank you @${user} for subscribing to the channel for a total of ${subInfo.months} months!`
        )
    })

    chatClient.onSubGift((channel, user, subInfo) => {
        SendMessage(
            "giftsubthanks",
            `Thank you ${subInfo.gifter} for gifting a subscription to ${user}!`
        )
    })
}

export function SendMessage(command, message) {
    try {
        chatClient.say("Wingman953", message)
        console.log(
            `* Executed ${command} command with the following response: ${message}`
        )
    } catch {
        console.log(
            `* ERROR: Executed ${command} and FAILED to send the following response: ${message}`
        )
    }
}

function ChannelSupport() {
    SendMessage(
        "channelsupport",
        "/me Enjoying the stream? Watching, chatting, following, cheering or subscribing are all great ways to support the stream. Your support allows me to continue investing time into the channel and it is greatly appreciated!"
    )
}

///
/// Searches the given command dictionary and performs the required
/// actions if a command is found.
///
function SearchCommandDictionary(
    originalMessage,
    commandDictionary,
    messageUsername
) {
    const command = originalMessage.split(" ")[0].trim().toLowerCase()

    for (var i = 0; i < commandDictionary.length; i++) {
        // Check if the command exists.
        if (commandDictionary[i].Command.includes(command)) {
            // Check if the user is authorised.
            if (
                commandDictionary[i].Username &&
                !commandDictionary[i].Username.includes(messageUsername)
            ) {
                continue
            }

            if (commandDictionary[i].Function) {
                commandDictionary[i].Function(originalMessage, messageUsername)
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

///
/// Generates and sends a commands list
///
export function HandleCommandsList(originalMessage) {
    var command = originalMessage.split(" ")[0].trim().toLowerCase()

    if (command === "!commands" || command === "!commandlist") {
        var commandList = []
        var message = ""

        // Generate commands list
        for (var i = 0; i < commandMap.length; i++) {
            if (
                commandList.indexOf(commandMap[i].Command[0]) < 0 &&
                commandMap[i].Command[0].includes("!")
            ) {
                commandList.push(commandMap[i].Command[0])
            }
        }

        for (var i = 0; i < quoteMap.length; i++) {
            if (commandList.indexOf(quoteMap[i].Command[0]) < 0) {
                commandList.push(quoteMap[i].Command[0])
            }
        }

        for (var i = 0; i < functionMap.length; i++) {
            if (commandList.indexOf(functionMap[i].Command[0]) < 0) {
                commandList.push(functionMap[i].Command[0])
            }
        }

        commandList.sort()

        for (var i = 0; i < commandList.length; i++) {
            message += commandList[i] + " "
        }

        SendMessage(command, message)
        return
    }
}
