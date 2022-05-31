"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckForVipWelcome = void 0;
const Utils_1 = require("./Utils");
const Twitch_1 = require("./../Integrations/Twitch");
function CheckForVipWelcome(messageUsername) {
    for (var i = 0; i < vipWelcome.length; i++) {
        if (!vipWelcome[i].Arrived &&
            vipWelcome[i].Username.findIndex((element) => {
                return element.toLowerCase() === messageUsername.toLowerCase();
            }) >= 0) {
            var greetingIndex = (0, Utils_1.Between)(0, vipWelcome[i].Message.length - 1);
            vipWelcome[i].Arrived = true;
            (0, Twitch_1.SendMessage)("VIP Welcome", vipWelcome[i].Message[greetingIndex], 1000, 2000);
        }
    }
}
exports.CheckForVipWelcome = CheckForVipWelcome;
var vipWelcome = [
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
        Message: [
            "Egggrant hype!",
            "OOOOO Eggplant OOOOO",
            "Hello Marge Simpson!",
        ],
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
        Username: ["AsterVeles"],
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
        Message: ["Hola amiguito!"],
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
    {
        Username: ["TheIncomeTaxes"],
        Message: ["TheIncomeTaxes hello!"],
        Arrived: false,
    },
    {
        Username: ["Shoncay"],
        Message: ["shoncaaaaaay"],
        Arrived: false,
    },
    {
        Username: ["goatrope"],
        Message: ["Goatrope hello!"],
        Arrived: false,
    },
    {
        Username: ["anoobis_117"],
        Message: ["ඞ6️⃣9️⃣4️⃣2️⃣0️⃣👁️👄👁️anoobis was here lol"],
        Arrived: false,
    },
    {
        Username: ["rcrx27"],
        Message: ["@rcrx27 hello!"],
        Arrived: false,
    },
    {
        Username: ["BarkBevastation"],
        Message: ["OhMyDog"],
        Arrived: false,
    },
    {
        Username: ["mindman2121"],
        Message: ["G'day mindman", "G'night mindman"],
        Arrived: false,
    },
    {
        Username: ["FatherPickle4BC"],
        Message: ["Tickle my Pickle FatherPickle"],
        Arrived: false,
    },
    {
        Username: ["1_qup"],
        Message: ["Exodus", "Forerunner ILs"],
        Arrived: false,
    },
];
