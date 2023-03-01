import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage"
import https from "https"

import { GamesNaming_Commands as GameNames } from "../Data/Naming/GamesAndLevels/GamesNaming_Commands"
import { GamesLevels_Commands as GameLevels } from "../Data/Naming/GamesAndLevels/GamesLevels_Commands"
import { GamesDifficulty_Commands as GameDifficulty } from "../Data/Naming/GamesAndLevels/GamesDifficulty_Commands"
import { GamesCategories_Commands as GameCategories } from "../Data/Naming/GamesAndLevels/GamesCategories_Commands"
import { SendMessage } from "./Twitch"
import { SecsToHMS } from "../Commands/Utils"

const hrApiHostName = "https://haloruns.z20.web.core.windows.net"

const hrGeneral = "/content/metadata/global.json"
const wingman953Profile =
    "/content/users/c6f4a6e2-b5b8-4012-acb5-53bbf9dc54f9/career.json"

const OdstGameId = "4a100d57-0000-3000-8000-000000000000"

// "/content/boards/{gameId}/{categoryId}/leaderboard/{runnableSegmentId}/{difficulty}.json"

let hrGeneralJson: any
let wingman953ProfileJson: any

function main() {
    HaloRunsSetup()
}

main()

export function HaloRunsSetup() {
    // Read HR Global data
    let req = https.get(
        hrApiHostName + hrGeneral,
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
        hrApiHostName + wingman953Profile,
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

export function GetHaloRunsWr(msg: TwitchPrivateMessage) {
    let gameName: string = "",
        category: string = "",
        runnableSegment: string = "",
        difficulty: string = "",
        hrGameName: string = "",
        hrCategory: string = "",
        hrRunnableSegment: string = "",
        hrDifficulty: string = "",
        hrGameId: string = "",
        hrCategoryId: string = "",
        hrRunnableSegmentId: string = ""

    let msgSplitArray = msg.content.value.toLowerCase().split(" ")

    if (msgSplitArray.length === 1) {
        SendOdstFullGameWr()
    }

    if (msgSplitArray.length != 5) {
        SendMessage("!wr", `Failed to parse WR command`)
    }

    gameName = msgSplitArray[1].trim()
    category = msgSplitArray[2].trim()
    runnableSegment = msgSplitArray[3].trim()
    difficulty = msgSplitArray[4].trim()

    for (const property in GameNames) {
        if (
            GameNames[property].findIndex((element: string) => {
                return element.toLowerCase() == gameName
            })
        ) {
            hrGameName = GameNames[property][0]
        }
    }

    for (const property in GameCategories) {
        if (
            GameCategories[property].findIndex((element: string) => {
                return element.toLowerCase() == runnableSegment
            })
        ) {
            hrCategory = GameCategories[property][0]
        }
    }

    for (const propertyGame in GameLevels) {
        if (
            GameLevels[propertyGame].Game.findIndex((element: string) => {
                return element.toLowerCase() == hrGameName
            })
        ) {
            for (const propertyLevels in GameLevels[propertyGame]) {
                if (
                    GameLevels[propertyGame][propertyLevels].findIndex(
                        (element: string) => {
                            return element.toLowerCase() == hrGameName
                        }
                    )
                ) {
                    hrRunnableSegment =
                        GameLevels[propertyGame][propertyLevels][0]
                }
            }
        }
    }

    for (const property in GameDifficulty) {
        if (
            GameDifficulty[property].findIndex((element: string) => {
                return element.toLowerCase() == category
            })
        ) {
            hrDifficulty = GameDifficulty[property][0]
        }
    }

    let hrGameIndex = hrGeneralJson.Games.findIndex((element: any) => {
        return element.Name === hrGameName
    })

    let hrCategoryIndex = hrGeneralJson.Games[hrGameIndex].Categories.findIndex(
        (element: any) => {
            return element.Name === hrCategory
        }
    )

    let hrRunnableSegmentIndex = hrGeneralJson.Games[
        hrGameIndex
    ].RunnableSegments.findIndex((element: any) => {
        return element.Name === hrRunnableSegment
    })

    hrGameId = hrGeneralJson.Games[hrGameIndex].Id

    hrCategoryId =
        hrGeneralJson.Games[hrGameIndex].Categories[hrCategoryIndex].Id

    hrRunnableSegmentId =
        hrGeneralJson.Games[hrGameIndex].RunnableSegments[
            hrRunnableSegmentIndex
        ].Id

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
                leaderboardJson = JSON.parse(data)

                let wrTime: string = SecsToHMS(
                    parseInt(leaderboardJson.Entries[0].Duration, 10)
                )
                let wrUsernames: string = ""

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
                        } else {
                            wrUsernames += ` & ${leaderboardJson.Entries[0].Participants[0].Username}`
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
                    `The HaloRuns Record for ${hrGameName} ${hrCategory} ${hrRunnableSegment} ${hrDifficulty} is ${wrTime} by ${wrUsernames}`
                )
            })
        }
    )

    req.on("error", function (e: { message: any }) {
        SendMessage("!wr", `Failed to access HaloRuns Leaderboards`)
    })
}

function SendOdstFullGameWr() {}

export function GetHaloRunsPb(msg: TwitchPrivateMessage) {}
