import { SelectFromList } from "./Utils.mjs"

export function HandleFastFact(originalMessage) {
    SelectFromList(fastFactList, originalMessage)
}

const fastFactList = [
    "Drop Prepare to - https://www.youtube.com/watch?v=ZQhXSoZUAP4",
    "Ring Ring - https://www.youtube.com/watch?v=ji-A76Pf9KA",
    "Frag Out! - https://www.youtube.com/watch?v=nUISaN0hoNY",
    "What You Can't See Can't Slow You Down - https://www.youtube.com/watch?v=yD0L2P7o4L4",
    "Raising the Undead - https://www.youtube.com/watch?v=-OjoRIZKK0M",
    "Lightweight Champion - https://www.youtube.com/watch?v=rYHYPJq-2bw",
    "Secret Ammo Room - https://www.youtube.com/watch?v=s0m7jDGcb8s",
    "The Arc - https://www.youtube.com/watch?v=B6zOijtYQfk",
]

// // Did You Know Facts
// "In the final cutscene for NMPD HQ, the pilot can be seen wielding a Battle Rifle",
// 'On NMPD HQ there is no double phantom for right-side last. In the mission script there is a missing "ai_place" for the 2nd phantom. Is it a bug or was it intentionally disabled?',
// "In Coastal Highway, the highway can be accessed without going through the cutscene. https://www.youtube.com/watch?v=P7szf4v1nu8",
// "Ever wanted to know how to get to the bottom of an elevator in Mombasa Streets? No? Oh, well watch this video anyways: https://www.youtube.com/watch?v=94CmgFi2Vms",
// "In Prepare to Drop, you can re-enter the drop pod: https://www.youtube.com/watch?v=gfZJsHsAcEk",
// "Founding out the hard way that the Jet Pack Brutes on ONI Alpha Site can have Trip Mines on Legendary: https://www.youtube.com/watch?v=VU5tPJ4hSOU",
// "Jumping up slopes saves ~1/60sec per jump! https://www.youtube.com/watch?v=1ZVna-aIIW4",
// "Getting out of bounds on Prepare to Drop/Mombasa Streets: https://www.youtube.com/watch?v=tj1xAuXY8ZY",
// "Getting out of bounds on Tayari Plaza: Out of bounds: (video TBA), Out of Map: https://www.youtube.com/watch?v=kQOj5JaenIs",
// "Getting out of bounds on Uplift Reserve: https://youtu.be/mnMEszaVJM8?t=537",
// "Getting out of bounds on Kizingo Blvd.: (see haloruns.com for IL WR)",
// "Getting out of bounds on ONI Alpha Site: The Easy Way https://www.youtube.com/watch?v=MBUEpuulGzs, The Hard Way https://www.youtube.com/watch?v=vIZJ8-IFYHw",
// "Getting out of bounds on NMPD HQ: Basic OOB https://www.youtube.com/watch?v=bm7J18IyNaI, With a banshee https://www.youtube.com/watch?v=xr_X5k4BmUk",
// "Getting out of bounds on Kikowani Station: (see haloruns.com for IL WR)",
// //"Getting out of bounds on Data Hive: ",
// "Getting out of bounds on Coastal Highway: (see haloruns.com for IL WR)",
// "Soft-locking ONI Alpha Site, (very, very, very rare) if Mickey hops back on the turret at the wrong moment he will stay outside and won't teleport inbounds and the mission won't progress: https://youtu.be/gQXZIJUiKvA?t=196",
// "Soft-locking NMPD HQ, if the last phantom is destroyed too quickly the mission will not end.",
// "Soft-locking Coastal Highway, by clearing the Jackals too quickly the Hunter's spawn before the Phantom and fall outside of the map. While the Hunters are live the mission won't progress: https://www.youtube.com/watch?v=ei6E8tzsCUc",
// "MCC Season 8 changes https://www.youtube.com/watch?v=4v0SaOwZWmQ",
// 2nd March 2016 SkilledGames NMPD Leg IL WR, beaten later that day, rip. 3.5yrs later he set the ODST Easy FG WR in 1:08:04.
// The following is a link to the first documented ODST Speedrun by a member of the public, Tayari Plaza Easy done in 2:13. The video is uploaded before the official release of the game. The runner says they received the game 3 days before release. https://www.youtube.com/watch?v=XCViO047t8g
