import { CheckForVipWelcome } from "./ExternalCommands/VipWelcome.mjs"
import { Between } from "./ExternalCommands/Utils.mjs"
import { commandMap } from "./ExternalCommands/GeneralCommands.mjs"
import { quoteMap } from "./ExternalCommands/Quotes.mjs"
import { functionMap } from "./ExternalCommands/FunctionMap.mjs"
import { onQuizHandler } from "./ExternalCommands/Quiz.mjs"
import fs from "fs"
import tmi from "tmi.js"

const debug = false

// Define configuration options
const opts = {
    connection: {
        secure: true,
        reconnect: true,
    },
    identity: {
        username: "Wingbot953",
    },
    channels: ["Wingman953"],
}

// Read OAuth token from separate file.
fs.readFile("./OAuth.txt", "utf8", (err, data) => {
    if (err) {
        console.error(err)
        return
    }
    opts.identity.password = data
})

// Create a client with our options
export const client = new tmi.client(opts)

// Register our event handlers (defined below)
client.on("message", onMessageHandler)
client.on("message", onQuizHandler)
client.on("connected", onConnectedHandler)

// Connect to Twitch:
client.connect()

var botMessageTarget

///
/// Called every time a message comes in.
///
function onMessageHandler(target, context, msg, self) {
    // Ignore messages from the bot
    if (self) {
        return
    }

    botMessageTarget = target

    var messageUsername = context["display-name"]

    if (debug) console.log("DEBUG: User message received")

    CheckForVipWelcome(messageUsername)

    // MONITOR PERFORMANCE, IF POOR UNCOMMENT BELOW TO FILTER MESSAGES

    // Remove whitespace and make lowercase.
    // const command = msg.split(" ")[0].trim().toLowerCase()

    // Ignore messages that don't begin with an exclamation mark.
    // if (command.charAt(0) != "!") {
    //     return
    // }

    if (debug) console.log("DEBUG: Command handling")

    /* COMMAND DICTIONARIES */
    if (SearchCommandDictionary(msg, commandMap, messageUsername)) {
        return
    }

    if (SearchCommandDictionary(msg, quoteMap, messageUsername)) {
        return
    }

    if (SearchCommandDictionary(msg, functionMap, messageUsername)) {
        return
    }

    if (msg.charAt(0) == "!") {
        SendMessage(msg.split(" ")[0].trim().toLowerCase(), "Unknown command")
    }
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
                commandDictionary[i].Function(originalMessage)
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

///
/// Sends the given message to the Twitch chat.
///
export function SendMessage(command, message) {
    try {
        client.say(botMessageTarget, message)
        console.log(
            `* Executed ${command} command with the following response: ${message}`
        )
    } catch {
        console.log(
            `* ERROR: Executed ${command} and FAILED to send the following response: ${message}`
        )
        try {
            client.say(
                botMessageTarget,
                "ERROR: Please alert streamer. Please try command again. "
            )
        } catch {
            console.log(`* ERROR: Error messaged also failed to send lol`)
        }
    }
}

///
/// Called every time the bot connects to Twitch chat.
///
function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`)
}
