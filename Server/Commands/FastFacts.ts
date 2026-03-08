import { SelectFromList, Between } from "./Utils"
import { sendChatMessage, Wingbot953Message } from "../MessageHandling"
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage"

export function HandleFastFact(originalMessage: UnifiedChatMessage) {
    SelectFromList(fastFactList, originalMessage)
}

export function SendDidYouKnowFact() {
    const index = Between(0, didYouKnowList.length - 1)

    const didYouKnowMessage = structuredClone(Wingbot953Message)
    didYouKnowMessage.platform = "twitch"
    didYouKnowMessage.message.text = "/me " + didYouKnowList[index]
    sendChatMessage(didYouKnowMessage)
}

const fastFactList = [
    "Drop Prepare to - https://youtu.be/ZQhXSoZUAP4",
    "Ring Ring - https://youtu.be/ji-A76Pf9KA",
    "Frag Out! - https://youtu.be/nUISaN0hoNY",
    "What You Can't See Can't Slow You Down - https://youtu.be/yD0L2P7o4L4",
    "Raising the Undead - https://youtu.be/-OjoRIZKK0M",
    "Lightweight Champion - https://youtu.be/rYHYPJq-2bw",
    "Secret Ammo Room - https://youtu.be/s0m7jDGcb8s",
    "The Arc - https://youtu.be/B6zOijtYQfk",
]

const didYouKnowList = [
    "Did you know on the final cutscene for NMPD HQ, the pilot can be seen wielding a Battle Rifle",
    'Did you know on NMPD HQ there is no double phantom for right-side last. There is a missing "ai_place" for the 2nd phantom in the scripts. Bug or intentionally disabled? Who knows...',
    "Did you know on Coastal Highway, the highway can be accessed without going through the cutscene: https://youtu.be/P7szf4v1nu8",
    "Ever wanted to know how to get to the bottom of an elevator shaft in Mombasa Streets? No? Oh, well, here's a video of it anyways: https://youtu.be/94CmgFi2Vms",
    "Did you know after you drop out of the pod, you can re-enter it: https://youtu.be/gfZJsHsAcEk",
    "Did you know jumping up slopes saves ~1/60sec per jump!", // https://youtu.be/1ZVna-aIIW4",
    "Did you know you can get out of bounds on Mombasa Streets: https://youtu.be/tj1xAuXY8ZY",
    "Did you know you can get out of bound on Tayari Plaza: Out of bounds: https://youtu.be/jEzbmqd_Ygw, Out of Map: https://youtu.be/kQOj5JaenIs",
    "Did you know you can get out of bounds on ONI Alpha Site: The Easy Way https://youtu.be/MBUEpuulGzs, The Hard Way https://youtu.be/vIZJ8-IFYHw",
    "Did you know you can get out of bounds on NMPD HQ: Basic OOB https://youtu.be/bm7J18IyNaI, With a banshee https://youtu.be/xr_X5k4BmUk",
    "Did you know you can soft-lock on NMPD HQ? If you destroy the last phantom too quickly the mission won't end.",
    "Did you know you can soft-lock on Coastal Highway? Clearing the Jackals too quickly makes the Hunter's spawn before their transport Phantom so they fall outside of the map and often survive. While the Hunters are alive the mission won't progress: https://youtu.be/ei6E8tzsCUc",
    "Did you know on the 2nd March 2016 SkilledGames_ set the NMPD Leg IL WR and... was bopped later that day, RIP. 3.5yrs later he set the ODST Easy FG WR in 1:08:04.",
    "Did you know the first documented ODST speedrun by a member of the public (probably) was Tayari Plaza Easy done in 2:13. The runner says they received the game 3 days before release. https://youtu.be/XCViO047t8g",
    "Did you know Heroic Robb held the Kizingo Blvd. Legendary IL WR from 12th Mar 2015 to 19th Oct 2020. He set 9 different WRs during that time.",
    "Did you know the entry to Data Hive varies based on which flashback mission was completed last.",
    "Did you know Halo 3: ODST is the first game where player characters have dialogue during gameplay.",
]
