import { Between } from "./Utils"
import { SendMessage } from "./../Integrations/Twitch"
import fs from "fs"

const vipWelcomeFilePath = "./Data/Twitch/VIPWelcome.json"

var vipWelcome: string | any[]

export function LoadWelcomeMessages()
{
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

            SendMessage(
                "VIP Welcome",
                vipWelcome[i].Message[greetingIndex],
                1000,
                2000
            )
        }
    }
}
