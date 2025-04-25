import { sendChatMessage, Wingbot953Message } from "../MessageHandling"
import { Between, sleep } from "./Utils"
import fs from "fs"

const vipWelcomeFilePath = "./Data/Users/VIPWelcome.json"

var vipWelcome: string | any[]

export function LoadWelcomeMessages() {
    try {
        const data = fs.readFileSync(vipWelcomeFilePath, "utf8")
        vipWelcome = JSON.parse(data)
    } catch (err) {
        console.error(err)
    }
}

export function CheckForVipWelcome(messageUsername: string) {
    for (var i = 0; i < vipWelcome.length; i++) {
        if (
            !vipWelcome[i].Arrived &&
            vipWelcome[i].Username.findIndex((element: string) => {
                return element.toLowerCase() === messageUsername.toLowerCase()
            }) >= 0
        ) {
            var greetingIndex = Between(0, vipWelcome[i].Message.length - 1)

            vipWelcome[i].Arrived = true

            let vipWelcomeMessage = Wingbot953Message
            vipWelcomeMessage.platform = "twitch"
            vipWelcomeMessage.message.text =
                vipWelcome[i].Message[greetingIndex]

            sleep(1500).then(() => {
                sendChatMessage(vipWelcomeMessage)
            })
        }
    }
}
