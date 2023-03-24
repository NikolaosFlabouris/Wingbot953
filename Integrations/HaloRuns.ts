import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage"
import https from "https"

import { CommandNaming } from "../Data/Naming/CommandNaming"
import { SendMessage } from "./Twitch"
import { SecsToHMS } from "../Commands/Utils"

const hrApiHostName = "https://haloruns.z20.web.core.windows.net"

const Wingman953HrId = "c6f4a6e2-b5b8-4012-acb5-53bbf9dc54f9"

const hrGeneralUrl = "/content/metadata/global.json"
const wingman953ProfileUrl = `/content/users/${Wingman953HrId}/career.json`

const OdstGameId = "4a100d57-0000-3000-8000-000000000000"

let hrGeneralJson: any
let wingman953ProfileJson: any

export function HaloRunsSetup() {
    // Read HR Global data
    let req = https.get(
        hrApiHostName + hrGeneralUrl,
        function (res: {
            on: (arg0: string, arg1: { (stream: string): void }) => void
        }) {
            let data = ""

            res.on("data", function (stream: string) {
                data += stream
            })

            res.on("end", function () {
                hrGeneralJson = JSON.parse(data)
            })
        }
    )

    req.on("error", function (e: { message: any }) {
        console.log(e.message)
    })

    // Read Wingman953 HR Profile data
    req = https.get(
        hrApiHostName + wingman953ProfileUrl,
        function (res: {
            on: (arg0: string, arg1: { (stream: string): void }) => void
        }) {
            let data = ""

            res.on("data", function (stream: string) {
                data += stream
            })

            res.on("end", function () {
                wingman953ProfileJson = JSON.parse(data)
            })
        }
    )

    req.on("error", function (e: { message: any }) {
        console.log(e.message)
    })
}

export function HandleHaloRunsWr(msg: TwitchPrivateMessage) {
    let msgSplitArray = msg.content.value.toLowerCase().split(" ")

    if (
        msgSplitArray.length === 1 &&
        msg.content.value.toLowerCase() === "!wr"
    ) {
        GetHaloRunsWr("Halo 3: ODST", "Solo", "Full Game", "Easy")
        GetHaloRunsWr("Halo 3: ODST", "Solo", "Full Game", "Legendary")
        return
    } else if (msgSplitArray.length != 5) {
        SendMessage("!wr", `Incorrect number of parameters for !wr command`)
        return
    }

    let hrNames: string[] = FindHaloRunsCompatibleNames(
        msgSplitArray[1].trim().toLowerCase(), //gameName
        msgSplitArray[2].trim().toLowerCase(), //category
        msgSplitArray[3].trim().toLowerCase(), //runnableSegment
        msgSplitArray[4].trim().toLowerCase() //difficulty
    )

    if (hrNames.length === 4) {
        GetHaloRunsWr(hrNames[0], hrNames[1], hrNames[2], hrNames[3])
    }
}

function GetHaloRunsWr(
    hrGameName: string,
    hrCategory: string,
    hrRunnableSegment: string,
    hrDifficulty: string
) {
    // Search HaloRuns global.json for Game, Category and Runnable Segment IDs

    console.log(hrGameName, hrCategory, hrRunnableSegment, hrDifficulty)

    let hrGameIndex = hrGeneralJson.Games.findIndex((element: any) => {
        return element.Name === hrGameName
    })

    if (hrGameIndex < 0) {
        SendMessage("!wr", "Failed to find game on HaloRuns")
        return
    }

    let hrCategoryIndex = hrGeneralJson.Games[hrGameIndex].Categories.findIndex(
        (element: any) => {
            return element.Name === hrCategory
        }
    )

    if (hrCategoryIndex < 0) {
        SendMessage("!wr", "Failed to find category on HaloRuns")
        return
    }

    let hrRunnableSegmentIndex = hrGeneralJson.Games[
        hrGameIndex
    ].RunnableSegments.findIndex((element: any) => {
        return element.Name === hrRunnableSegment
    })

    if (hrRunnableSegmentIndex < 0) {
        SendMessage("!wr", "Failed to find runnable segment on HaloRuns")
        return
    }

    let hrGameId: string = hrGeneralJson.Games[hrGameIndex].Id

    let hrCategoryId: string =
        hrGeneralJson.Games[hrGameIndex].Categories[hrCategoryIndex].Id

    let hrRunnableSegmentId: string =
        hrGeneralJson.Games[hrGameIndex].RunnableSegments[
            hrRunnableSegmentIndex
        ].Id

    // Perform HaloRuns API request
    let apiUrl =
        hrApiHostName +
        `/content/boards/${hrGameId}/${hrCategoryId}/leaderboard/${hrRunnableSegmentId}/${hrDifficulty}.json`

    let leaderboardJson: any

    let req = https.get(
        apiUrl,
        function (res: {
            on: (arg0: string, arg1: { (stream: string): void }) => void
        }) {
            let data = ""

            res.on("data", function (stream: string) {
                data += stream
            })

            res.on("end", function () {
                // Parse leaderboard for WR info

                try {
                    leaderboardJson = JSON.parse(data)
                } catch {
                    SendMessage("!wr", `Failed to access HaloRuns Leaderboards`)
                    return
                }

                if (leaderboardJson.Entries.length === 0) {
                    SendMessage(
                        "!wr",
                        `There is no HaloRuns Record for ${hrGameName} ${hrCategory} ${hrRunnableSegment} ${hrDifficulty}`
                    )
                }

                let wrTime: string = SecsToHMS(
                    parseInt(leaderboardJson.Entries[0].Duration, 10)
                )
                let wrUsernames: string = ""
                let wrVideo: string = ""

                let stillWrTime = true
                let entriesIndex = 0

                while (
                    stillWrTime &&
                    entriesIndex < leaderboardJson.Entries.length
                ) {
                    if (
                        leaderboardJson.Entries[entriesIndex].Points ===
                        leaderboardJson.Entries[0].Points
                    ) {
                        if (entriesIndex === 0) {
                            wrUsernames +=
                                leaderboardJson.Entries[0].Participants[0]
                                    .Username

                            wrVideo =
                                leaderboardJson.Entries[0].Participants[0]
                                    .EvidenceLink
                        } else {
                            wrUsernames += ` & ${leaderboardJson.Entries[entriesIndex].Participants[0].Username}`
                        }

                        for (
                            let i = 1;
                            i <
                            leaderboardJson.Entries[entriesIndex].Participants
                                .length;
                            i++
                        ) {
                            wrUsernames += `, ${leaderboardJson.Entries[0].Participants[i].Username}`
                        }

                        entriesIndex++
                    } else {
                        stillWrTime = false
                    }
                }

                SendMessage(
                    "!wr",
                    `The HaloRuns Record for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty} is ${wrTime} by ${wrUsernames} | ${wrVideo}`
                )
            })
        }
    )

    req.on("error", function (e: { message: any }) {
        SendMessage("!wr", `Failed to access HaloRuns Leaderboards`)
    })
}

export function HandleWingman953Pb(msg: TwitchPrivateMessage) {
    let msgSplitArray = msg.content.value.toLowerCase().split(" ")

    if (
        msgSplitArray.length === 1 &&
        msg.content.value.toLowerCase() === "!pb"
    ) {
        GetHaloRunsPb("Halo 3: ODST", "Solo", "Full Game", "Easy")
        GetHaloRunsPb("Halo 3: ODST", "Solo", "Full Game", "Legendary")
        return
    } else if (msgSplitArray.length != 5) {
        SendMessage("!pb", `Incorrect number of parameters for !pb command`)
        return
    }

    let hrNames: string[] = FindHaloRunsCompatibleNames(
        msgSplitArray[1].trim().toLowerCase(), //gameName
        msgSplitArray[2].trim().toLowerCase(), //category
        msgSplitArray[3].trim().toLowerCase(), //runnableSegment
        msgSplitArray[4].trim().toLowerCase() //difficulty
    )

    if (hrNames.length === 4) {
        GetHaloRunsPb(hrNames[0], hrNames[1], hrNames[2], hrNames[3])
    }
}

function GetHaloRunsPb(
    hrGameName: string,
    hrCategory: string,
    hrRunnableSegment: string,
    hrDifficulty: string
) {
    // Search HaloRuns global.json for Game and Runnable Segment IDs
    let hrGameIndex = hrGeneralJson.Games.findIndex((element: any) => {
        return element.Name === hrGameName
    })

    if (hrGameIndex < 0) {
        SendMessage("!pb", "Failed to find game on HaloRuns")
        return
    }

    let hrRunnableSegmentIndex = hrGeneralJson.Games[
        hrGameIndex
    ].RunnableSegments.findIndex((element: any) => {
        return element.Name === hrRunnableSegment
    })

    if (hrRunnableSegmentIndex < 0) {
        SendMessage("!pb", "Failed to find runnable segment on HaloRuns")
        return
    }

    let hrGameId: string = hrGeneralJson.Games[hrGameIndex].Id

    let hrRunnableSegmentId: string =
        hrGeneralJson.Games[hrGameIndex].RunnableSegments[
            hrRunnableSegmentIndex
        ].Id

    let pbRuns = wingman953ProfileJson.RunsByCategory.Solo

    if (hrCategory === "Solo") {
        pbRuns = wingman953ProfileJson.RunsByCategory.Solo

        for (let runIndex = 0; runIndex < pbRuns.length; runIndex++) {
            if (
                pbRuns[runIndex].GameId === hrGameId &&
                pbRuns[runIndex].RunnableSegmentId === hrRunnableSegmentId &&
                pbRuns[runIndex].Difficulty === hrDifficulty
            ) {
                let pbTime: string = SecsToHMS(
                    parseInt(pbRuns[runIndex].Duration, 10)
                )

                let pbVideo: string =
                    pbRuns[runIndex].Participants[0].EvidenceLink

                SendMessage(
                    "!pb",
                    `Wingman953's PB for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty} is ${pbTime} | ${pbVideo}`
                )

                return
            }
        }
    }

    if (hrCategory === "Coop") {
        pbRuns = wingman953ProfileJson.RunsByCategory.Coop

        let pbTimeSecs: number = 99999999
        let pbTime: string = ""
        let coopUsernames: string = ""
        let pbVideo: string = ""

        for (let runIndex = 0; runIndex < pbRuns.length; runIndex++) {
            if (
                pbRuns[runIndex].GameId === hrGameId &&
                pbRuns[runIndex].RunnableSegmentId === hrRunnableSegmentId &&
                pbRuns[runIndex].Difficulty === hrDifficulty
            ) {
                if (parseInt(pbRuns[runIndex].Duration, 10) < pbTimeSecs) {
                    pbTimeSecs = parseInt(pbRuns[runIndex].Duration, 10)
                    pbTime = SecsToHMS(parseInt(pbRuns[runIndex].Duration, 10))

                    pbVideo = pbRuns[runIndex].Participants[0].EvidenceLink

                    coopUsernames = " with "

                    for (
                        let i = 0;
                        i < pbRuns[runIndex].Participants.length;
                        i++
                    ) {
                        if (
                            pbRuns[runIndex].Participants[i].UserId ===
                            Wingman953HrId
                        ) {
                            continue
                        }

                        coopUsernames += `${pbRuns[runIndex].Participants[i].Username}, `
                    }

                    coopUsernames = coopUsernames.substring(
                        0,
                        coopUsernames.length - 2
                    )
                }
            }
        }

        if (pbTime !== "") {
            SendMessage(
                "!pb",
                `Wingman953's PB for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty} is ${pbTime}${coopUsernames} | ${pbVideo}`
            )
            return
        }
    }

    SendMessage(
        "!pb",
        `Wingman953 does not have a submitted time for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty}`
    )

    return
}

function FindHaloRunsCompatibleNames(
    gameName: string,
    category: string,
    runnableSegment: string,
    difficulty: string
) {
    let hrGameName = FindCommandMatch(CommandNaming.Games, gameName)

    if (hrGameName === "") {
        SendMessage("!wr/!pb", "Failed to parse game")
        return []
    }

    let hrCategory = FindCommandMatch(CommandNaming.Categories, category)

    if (hrCategory === "") {
        SendMessage("!wr/!pb", "Failed to parse category")
        return []
    }

    let hrRunnableSegment = ""

    for (const propertyGame in CommandNaming.Levels) {
        if (
            CommandNaming.Levels[propertyGame].Game.findIndex(
                (element: string) => {
                    return element === hrGameName
                }
            ) >= 0
        ) {
            hrRunnableSegment = FindCommandMatch(
                CommandNaming.Levels[propertyGame],
                runnableSegment
            )
        }
    }

    if (hrRunnableSegment === "") {
        SendMessage("!wr/!pb", "Failed to parse runnable segment")
        return []
    }

    let hrDifficulty = FindCommandMatch(CommandNaming.Difficulty, difficulty)

    if (hrDifficulty === "") {
        SendMessage("!wr/!pb", "Failed to parse difficulty")
        return []
    }

    return [hrGameName, hrCategory, hrRunnableSegment, hrDifficulty]
}

function FindCommandMatch(
    commandList: { [key: string]: string[] },
    command: string
) {
    for (const property in commandList) {
        if (
            commandList[property].findIndex((element: string) => {
                return element.toLowerCase() === command
            }) >= 0
        ) {
            return commandList[property][0]
        }
    }

    return ""
}
