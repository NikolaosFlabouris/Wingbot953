import { sendChatMessage, Wingbot953Message } from "../MessageHandling"
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage"

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
export function SelectFromList(list: Array<string>, msg: UnifiedChatMessage) {
    var originalMessage = msg.message.text
    var command = originalMessage.split(" ")[0].trim().toLowerCase()
    var argumentCount = originalMessage.split(" ").length - 1
    var index = Between(0, list.length - 1)

    let itemFromListMessage = structuredClone(Wingbot953Message)
    itemFromListMessage.platform = msg.platform

    if (argumentCount === 0) {
        itemFromListMessage.message.text = `[${index + 1}] ` + list[index]
    } else if (
        argumentCount === 1 &&
        !Number.isNaN(parseInt(originalMessage.split(" ")[1].trim(), 10))
    ) {
        // Parse the number, subtract one because human readable argument is accepted.
        index = parseInt(originalMessage.split(" ")[1].trim(), 10) - 1

        if (index < 0 || index >= list.length) {
            itemFromListMessage.message.text = `Value out of range: 1 to ${list.length}`
        }

        itemFromListMessage.message.text = `[${index + 1}] ` + list[index]
    } else if (argumentCount >= 1) {
        // Check if words have been given and match a quote in the list.
        let matchWords = originalMessage.split(" ").slice(1)

        let matches: Array<{ quote: string; index: number }> = []

        for (let i = 0; i < list.length; i++) {
            let isMatch = true
            for (let j = 0; j < matchWords.length; j++) {
                if (
                    !list[i]
                        .toLowerCase()
                        .includes(matchWords[j].trim().toLowerCase())
                ) {
                    isMatch = false
                    break
                }
            }

            if (isMatch) {
                matches.push({ quote: list[i], index: i })
            }
        }

        if (matches.length === 0) {
            itemFromListMessage.message.text = `No word match found.`
        } else {
            var matchIndex = Between(0, matches.length - 1)
            itemFromListMessage.message.text =
                `[${matches[matchIndex].index + 1}] ` +
                matches[matchIndex].quote
        }
    }

    sendChatMessage(itemFromListMessage)
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

    if (minutes < 10 && hours) {
        time += `0${minutes}:`
    } else if (minutes) {
        time += `${minutes}:`
    } else {
        time += `00:`
    }

    if (seconds < 10) {
        time += `0${seconds}`
    } else if (seconds) {
        time += `${seconds}`
    } else {
        time += `00`
    }

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
