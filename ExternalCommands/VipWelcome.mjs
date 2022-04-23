import { Between } from "./Utils.mjs"
import { SendMessage } from "../Wingbot953.js"

export function CheckForVipWelcome(messageUsername) {
    for (var i = 0; i < vipWelcome.length; i++) {
        if (
            !vipWelcome[i].Arrived &&
            vipWelcome[i].Username.includes(messageUsername)
        ) {
            var greetingIndex = Between(0, vipWelcome[i].Message.length - 1)

            vipWelcome[i].Arrived = true

            SendMessage("VIP Welcome", vipWelcome[i].Message[greetingIndex])
        }
    }
}

export var vipWelcome = [
    {
        Username: ["Wingman953"],
        Message: ["Hello streamer!"],
        Arrived: false,
    },
    {
        Username: ["Skilledgames_"],
        Message: ["Skilled has arrived"],
        Arrived: false,
    },
    {
        Username: ["Adversaryy"],
        Message: ["adfdafjfnsdkjvnskjgnsfsfsghsgsggs"],
        Arrived: false,
    },
    {
        Username: ["HarcTehShark"],
        Message: ["Hello Harc the 57min Shark!"],
        Arrived: false,
    },
    {
        Username: ["sleeplessblue"],
        Message: ["Sleepless hello!"],
        Arrived: false,
    },
    {
        Username: ["zomb1e343"],
        Message: ["yea jon"],
        Arrived: false,
    },
    {
        Username: ["Reptilian_Gamer"],
        Message: ["lookslikerep is here!"],
        Arrived: false,
    },
    {
        Username: ["eggplanthydra53"],
        Message: ["Egggrant hype!", "OOOOO Eggplant OOOOO"],
        Arrived: false,
    },
    {
        Username: ["Two_EEzy"],
        Message: ["Two_EEzy hype!"],
        Arrived: false,
    },
    {
        Username: ["CameraDancer"],
        Message: [
            "Camera is back to have a blast of a time!",
            "CameraDancer hello!",
        ],
        Arrived: false,
    },
    {
        Username: ["Ebrox"],
        Message: ["Ebrox hello!"],
        Arrived: false,
    },
    {
        Username: ["Jangoosed"],
        Message: ["Hi Jack \\o!", "Jangoosed \\o!"],
        Arrived: false,
    },
    {
        Username: ["McThumbs"],
        Message: ["McThumbs hello!"],
        Arrived: false,
    },
    {
        Username: ["danielcitoo", "kaptajuan"],
        Message: ["Daniel hello!", "go to bed"],
        Arrived: false,
    },
    {
        Username: ["Penguinsane"],
        Message: ["Penguin hello!", "Penguin was sane enough to return!"],
        Arrived: false,
    },
    {
        Username: ["AsterQuasimoto"],
        Message: ["hi cutie ;)"],
        Arrived: false,
    },
    {
        Username: ["thiccElite"],
        Message: ["thiccElite hello!"],
        Arrived: false,
    },
    {
        Username: ["Alextremo08"],
        Message: ["Alextremo08 hello!"],
        Arrived: false,
    },
    {
        Username: ["yeV_cM"],
        Message: ["yeV_cM hello!"],
        Arrived: false,
    },
    {
        Username: ["Baachan"],
        Message: ["Baachan hello!"],
        Arrived: false,
    },
]
