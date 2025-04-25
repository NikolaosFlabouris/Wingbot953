import {
    isLive,
    sendTwitchMessage as sendTwitchMessage,
} from "./Integrations/Twitch"
import { CheckForVipWelcome } from "./Commands/VipWelcome"
import { onQuizHandler } from "./Commands/Quiz"
import { Between } from "./Commands/Utils"
import { commandMap } from "./Commands/GeneralCommands"
import { quoteMap } from "./Commands/Quotes"
import functionMap from "./Commands/FunctionCommands"
import util from "util"
import { sendYouTubeMessage } from "./Integrations/YouTube"
import WebSocket from "ws"
import { UnifiedChatMessage } from "../Common/UnifiedChatMessage"

// Store connected clients
const clients: WebSocket[] = []

export const Wingbot953Message: UnifiedChatMessage = {
    platform: "all",
    channel: { name: "Wingman953" },
    author: {
        name: "Wingbot953",
        displayName: "Wingbot953",
    },
    message: {
        text: "",
    },
}

export function createWebSocket() {
    // Create WebSocket server
    const PORT = process.env.PORT || 8080
    const wss = new WebSocket.Server({ port: Number(PORT) })

    console.log(`WebSocket server is running on port ${PORT}`)

    // Handle new connections
    wss.on("connection", (ws: WebSocket) => {
        console.log("Client connected")
        clients.push(ws)

        // Handle disconnection
        ws.on("close", () => {
            console.log("Client disconnected")
            const index = clients.indexOf(ws)
            if (index !== -1) {
                clients.splice(index, 1)
            }
        })
    })
}

export function handleChatMessage(msg: UnifiedChatMessage) {
    // Example handling function that processes the message
    console.log(`Received message from ${msg.author.name}: ${msg.message.text}`)

    console.log(
        util.inspect(msg, {
            showHidden: false,
            depth: null,
            colors: true,
        })
    )

    if (msg.author.displayName == "Wingbot953") {
        console.log("Message from Wingbot953, ignoring.")
        return
    }

    // Process common logic for both platforms
    // SEND MESSAGE TO FRONTEND

    // Add ID and timestamp if not provided
    // if (!msg.id) {
    //     msg.id = uuidv4()
    // }
    sendToWebSocketClients(msg)

    let commandExecuted = false

    if (msg.platform === "youtube") {
        // Handle YouTube-specific logic
        Converse(msg.author.displayName, msg)

        /* COMMAND DICTIONARIES */
        if (SearchCommandDictionary(msg, commandMap)) {
            commandExecuted = true
        } else if (SearchCommandDictionary(msg, quoteMap)) {
            commandExecuted = true
        } else if (SearchCommandDictionary(msg, functionMap)) {
            commandExecuted = true
        } else if (!commandExecuted && msg.message.text.charAt(0) == "!") {
            let message = Wingbot953Message
            message.platform = msg.platform
            message.message.text = "Unknown command"
            message.replyingTo = msg
            message.channel = msg.channel

            sendChatMessage(message)
        }
    } else if (msg.platform === "twitch") {
        // Handle Twitch-specific logic
        if (isLive) {
            CheckForVipWelcome(msg.author.displayName)
        }

        Converse(msg.author.displayName, msg)

        onQuizHandler(msg.author.displayName, msg)

        /* COMMAND DICTIONARIES */
        if (SearchCommandDictionary(msg, commandMap)) {
            commandExecuted = true
        } else if (SearchCommandDictionary(msg, quoteMap)) {
            commandExecuted = true
        } else if (SearchCommandDictionary(msg, functionMap)) {
            commandExecuted = true
        } else if (!commandExecuted && msg.message.text.charAt(0) == "!") {
            let message = Wingbot953Message
            message.platform = msg.platform
            message.message.text = "Unknown command"
            message.replyingTo = msg
            message.channel = msg.channel

            sendChatMessage(message)
        }
    }
}

export function sendChatMessage(msg: UnifiedChatMessage) {
    console.log(
        `Sending response to ${msg.replyingTo?.author.name || ""}: ${
            msg.message.text
        }`
    )

    if (msg.platform === "youtube") {
        // Handle YouTube-specific response logic
        sendYouTubeMessage(msg.message.text)
    } else if (msg.platform === "twitch") {
        // Handle Twitch-specific response logic
        sendTwitchMessage(msg.message.text)
    }

    sendToWebSocketClients(msg)
}

function sendToWebSocketClients(msg: UnifiedChatMessage) {
    if (!msg.timestamp) {
        msg.timestamp = new Date()
    }

    const messageString = JSON.stringify(msg)

    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageString)
        }
    })
}

///
/// Searches the given command dictionary and performs the required
/// actions if a command is found.
///
function SearchCommandDictionary(
    msg: UnifiedChatMessage,
    commandDictionary: any[]
) {
    const command = msg.message.text.split(" ")[0].trim().toLowerCase()

    let commandMessage = Wingbot953Message
    commandMessage.platform = msg.platform

    for (let i = 0; i < commandDictionary.length; i++) {
        // Check if the command exists.
        if (commandDictionary[i].Command.includes(command)) {
            // Check if the user is authorised.
            if (
                commandDictionary[i].Username &&
                !commandDictionary[i].Username.includes(msg.author.displayName)
            ) {
                continue
            }

            if (commandDictionary[i].Function) {
                commandDictionary[i].Function(msg)
            } else if (commandDictionary[i].AllMessages) {
                // Send all messages.
                for (
                    let commandMessageIndex = 0;
                    commandMessageIndex < commandDictionary[i].Message.length;
                    commandMessageIndex++
                ) {
                    commandMessage.message.text =
                        commandDictionary[i].Message[commandMessageIndex]
                    sendChatMessage(commandMessage)
                }
            } else {
                // Pick a random message from the list and send.
                const commandMessageIndex = Between(
                    0,
                    commandDictionary[i].Message.length - 1
                )

                commandMessage.message.text =
                    commandDictionary[i].Message[commandMessageIndex]
                sendChatMessage(commandMessage)
            }
            return true
        }
    }
    return false
}

const periodicMessages = [
    "/me Enjoying the stream? Watching, chatting, following, cheering, subscribing or donating are all great ways to support the stream. Your support allows me to continue investing time into the channel and it is greatly appreciated!",
    "/me Got a song to share? Subs can add songs to the queue with !sr.",
    "/me Join Wingman953's Discord Server here: https://discord.gg/6KPBTApkJ8",
    "You got this streamer! Keep up the good work!",
    "wingma14Jam",
]

export function PeriodicMessages() {
    let periodicMessage = Wingbot953Message
    periodicMessage.platform = "twitch"
    periodicMessage.message.text =
        periodicMessages[Between(0, periodicMessages.length - 1)]
    sendChatMessage(periodicMessage)
}

function Converse(user: string, msg: UnifiedChatMessage) {
    const msgWords = msg.message.text.split(" ")[0].trim().toLowerCase()
    if (msgWords === "is" && Between(0, 99) < 40) {
        let converseMessage = Wingbot953Message
        converseMessage.platform = msg.platform
        converseMessage.message.text =
            converseResponses[Between(0, converseResponses.length - 1)]
        sendChatMessage(converseMessage)
    }
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
