import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage"
import { AutoModerationRuleKeywordPresetType } from "discord.js"
import { SendMessage } from "../Integrations/Twitch"

export function SecondsToDuration(numIn: number) {
    var d = Math.floor(numIn / 60 / 60 / 24)
    var h = Math.floor((numIn % (60 * 60 * 24)) / 60 / 60)
    var m = Math.floor((numIn % (60 * 60)) / 60)
    var s = Math.floor((numIn % (60 * 60)) % 60)

    var result = `${h}hrs ${("0" + m).slice(-2)}mins ${("0" + s).slice(-2)}secs`

    if (d > 0) {
        result = `${d}days ` + result
    }

    return result
}

///
/// Await sleep(milliseconds) to wait for the given amount of time.
///
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

///
/// Randomly returns a number between the two given numbers (inclusive)
///
export function Between(min: number, max: number) {
    if (min > max) {
        // swapping
        // min = (initial_min - initial_max)
        min = min - max
        // b = (initial_min - initial_b) + initial_max = initial_min
        max = min + max
        // a = initial_min - (initial_min - initial_max) = initial_max
        min = max - min
    }

    return Math.floor(Math.random() * (max - min + 1) + min)
}

///
/// Selects a random item from the list or the specified item
/// at the human-readable index given as an argument.
///
export function SelectFromList(list: Array<string>, msg: TwitchPrivateMessage) {
    var originalMessage = msg.content.value
    var command = originalMessage.split(" ")[0].trim().toLowerCase()
    var index = Between(0, list.length - 1)

    // Check if at least one argument have been given
    if (originalMessage.split(" ").length >= 2) {
        // Parse the number, subtract one because human readable argument is accepted.
        index = parseInt(originalMessage.split(" ")[1].trim(), 10) - 1

        if (Number.isNaN(index)) {
            SendMessage(
                command,
                "Use a number following the command to specify which result should be given."
            )
            return
        }
    }

    if (index < 0 || index >= list.length) {
        SendMessage(command, `Value out of range: 1 to ${list.length}`)
        return
    }

    SendMessage(command, `[${index + 1}] ` + list[index])
}

///
/// Turns a number of seconds into HH:MM:SS format as a string
///
export function SecsToHMS(totalSeconds: number) {
    const totalMinutes: number = Math.floor(totalSeconds / 60)

    const seconds: number = totalSeconds % 60
    const hours: number = Math.floor(totalMinutes / 60)
    const minutes: number = totalMinutes % 60

    let time: string = ""

    if (hours) {
        time += `${hours}:`
    }

    if (minutes) {
        time += `${minutes}:`
    } else {
        time += `00:`
    }

    time += `${seconds}`

    return time
}

///
/// adiuahfiudhfusdhfisdfghoishoi
///
export function GenerateSeanMessage() {
    var letters = ["a", "b", "c", "d", "e", "f", "g", "h", "r", "s", "w"]

    var messageLength = Between(6, 14)
    var message = "asd"

    for (var i = 0; i < messageLength; i++) {
        message += letters[Between(0, letters.length - 1)]
    }

    return message
}
