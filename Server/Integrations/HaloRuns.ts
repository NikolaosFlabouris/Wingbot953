import { ChatMessage } from "@twurple/chat/lib/commands/ChatMessage"
import https from "https"

import { CommandNaming } from "../../Data/Naming/CommandNaming"
import { SecsToHMS } from "../Commands/Utils"
import { sendChatMessage, Wingbot953Message } from "../MessageHandling"
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage"
import { TimeSpan } from "../TimeSpan"

const hrApiHostName = "https://haloruns.z20.web.core.windows.net"

const Wingman953HrId = "c6f4a6e2-b5b8-4012-acb5-53bbf9dc54f9"

const hrGeneralUrl = "/content/metadata/global.json"
const wingman953ProfileUrl = `/content/users/${Wingman953HrId}/career.json`

const OdstGameId = "4a100d57-0000-3000-8000-000000000000"

let hrGeneralJson: any
let wingman953ProfileJson: any

export interface HaloRunsTime {
    GameName: string
    Category: string
    RunnableSegment: string
    Difficulty: string
    Time: TimeSpan
    Usernames: string
    Video: string
}

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

export async function HandleHaloRunsWr(msg: UnifiedChatMessage) {
    let msgSplitArray = msg.message.text.toLowerCase().split(" ")

    if (
        msgSplitArray.length === 1 &&
        msg.message.text.toLowerCase() === "!wr"
    ) {
        let hrMessage = structuredClone(Wingbot953Message)
        hrMessage.platform = msg.platform

        let haloRunsTime = await GetHaloRunsWr(
            "Halo 3: ODST",
            "Solo",
            "Full Game",
            "Easy"
        )

        hrMessage.message.text = `The HaloRuns Record for ${haloRunsTime.GameName}, ${haloRunsTime.Category}, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${haloRunsTime.Time.string} by ${haloRunsTime.Usernames} | ${haloRunsTime.Video}`
        sendChatMessage(hrMessage)

        haloRunsTime = await GetHaloRunsWr(
            "Halo 3: ODST",
            "Solo",
            "Full Game",
            "Legendary"
        )
        hrMessage.message.text = `The HaloRuns Record for ${haloRunsTime.GameName}, ${haloRunsTime.Category}, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${haloRunsTime.Time.string} by ${haloRunsTime.Usernames} | ${haloRunsTime.Video}`
        sendChatMessage(hrMessage)
        return
    } else if (msgSplitArray.length != 5) {
        let hrMessage = structuredClone(Wingbot953Message)
        hrMessage.platform = msg.platform
        hrMessage.message.text = `Incorrect number of parameters for !wr command`
        sendChatMessage(hrMessage)
        return
    }

    let hrNames: string[] = FindHaloRunsCompatibleNames(
        msgSplitArray[1].trim().toLowerCase(), //gameName
        msgSplitArray[2].trim().toLowerCase(), //category
        msgSplitArray[3].trim().toLowerCase(), //runnableSegment
        msgSplitArray[4].trim().toLowerCase(), //difficulty
        msg
    )

    if (hrNames.length === 4) {
        const haloRunsTime = await GetHaloRunsWr(
            hrNames[0],
            hrNames[1],
            hrNames[2],
            hrNames[3]
        )

        let hrMessage = structuredClone(Wingbot953Message)
        hrMessage.platform = msg.platform

        if (haloRunsTime.Time === TimeSpan.zero) {
            hrMessage.message.text = `Failed to find HaloRuns Record. Please check the parameters and try again.`
        } else if (haloRunsTime.Time === TimeSpan.maxValue) {
            hrMessage.message.text = `There is no HaloRuns Record for ${haloRunsTime.GameName} ${haloRunsTime.Category} ${haloRunsTime.RunnableSegment} ${haloRunsTime.Difficulty}`
        } else {
            hrMessage.message.text = `The HaloRuns Record for ${haloRunsTime.GameName}, ${haloRunsTime.Category}, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${haloRunsTime.Time.string} by ${haloRunsTime.Usernames} | ${haloRunsTime.Video}`
        }
        sendChatMessage(hrMessage)
    }
}

export async function GetHaloRunsWr(
    hrGameName: string,
    hrCategory: string,
    hrRunnableSegment: string,
    hrDifficulty: string
): Promise<HaloRunsTime> {
    // Search HaloRuns global.json for Game, Category and Runnable Segment IDs

    let wrHaloRunsTime: HaloRunsTime = {
        GameName: hrGameName,
        Category: hrCategory,
        RunnableSegment: hrRunnableSegment,
        Difficulty: hrDifficulty,
        Time: TimeSpan.zero,
        Usernames: "",
        Video: "",
    }

    console.log(hrGameName, hrCategory, hrRunnableSegment, hrDifficulty)

    let hrGameIndex = hrGeneralJson.Games.findIndex((element: any) => {
        return element.Name === hrGameName
    })

    if (hrGameIndex < 0) {
        // hrMessage.message.text = "Failed to find game on HaloRuns"
        return wrHaloRunsTime
    }

    let hrCategoryIndex = hrGeneralJson.Games[hrGameIndex].Categories.findIndex(
        (element: any) => {
            return element.Name === hrCategory
        }
    )

    if (hrCategoryIndex < 0) {
        // hrMessage.message.text = "Failed to find category on HaloRuns"
        return wrHaloRunsTime
    }

    let hrRunnableSegmentIndex = hrGeneralJson.Games[
        hrGameIndex
    ].RunnableSegments.findIndex((element: any) => {
        return element.Name === hrRunnableSegment
    })

    if (hrRunnableSegmentIndex < 0) {
        // hrMessage.message.text = "Failed to find runnable segment on HaloRuns"
        return wrHaloRunsTime
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

    return new Promise((resolve, reject) => {
        const req = https.get(
            apiUrl,
            function (res: {
                on: (arg0: string, arg1: { (stream: string): void }) => void
            }) {
                let data = ""

                res.on("data", function (stream: string) {
                    data += stream
                })

                req.on("error", function (e: { message: any }) {
                    console.log(e.message)
                    resolve(wrHaloRunsTime)
                    return
                })

                res.on("end", function () {
                    // Parse leaderboard for WR info

                    try {
                        leaderboardJson = JSON.parse(data)

                        if (leaderboardJson.Entries.length === 0) {
                            // hrMessage.message.text = `There is no HaloRuns Record for ${hrGameName} ${hrCategory} ${hrRunnableSegment} ${hrDifficulty}`
                            wrHaloRunsTime.Time = TimeSpan.maxValue
                            return wrHaloRunsTime
                        }

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
                                        leaderboardJson.Entries[0]
                                            .Participants[0].Username

                                    wrVideo =
                                        leaderboardJson.Entries[0]
                                            .Participants[0].EvidenceLink
                                } else {
                                    wrUsernames += ` & ${leaderboardJson.Entries[entriesIndex].Participants[0].Username}`
                                }

                                for (
                                    let i = 1;
                                    i <
                                    leaderboardJson.Entries[entriesIndex]
                                        .Participants.length;
                                    i++
                                ) {
                                    wrUsernames += `, ${leaderboardJson.Entries[0].Participants[i].Username}`
                                }

                                entriesIndex++
                            } else {
                                stillWrTime = false
                            }
                        }

                        wrHaloRunsTime.Time = TimeSpan.fromSeconds(
                            parseInt(leaderboardJson.Entries[0].Duration, 10)
                        )
                        wrHaloRunsTime.Usernames = wrUsernames
                        wrHaloRunsTime.Video = wrVideo

                        resolve(wrHaloRunsTime)
                    } catch {
                        // hrMessage.message.text = `Failed to access HaloRuns Leaderboards`
                        console.log("Failed to access HaloRuns Leaderboards")
                        resolve(wrHaloRunsTime)
                    }
                })
            }
        )
    })
}

export function HandleWingman953Pb(msg: UnifiedChatMessage) {
    let msgSplitArray = msg.message.text.toLowerCase().split(" ")

    if (
        msgSplitArray.length === 1 &&
        msg.message.text.toLowerCase() === "!pb"
    ) {
        let hrMessage = structuredClone(Wingbot953Message)
        hrMessage.platform = msg.platform

        let haloRunsTime = GetHaloRunsPb(
            "Halo 3: ODST",
            "Solo",
            "Full Game",
            "Easy"
        )

        hrMessage.message.text = `The HaloRuns Record for ${haloRunsTime.GameName}, ${haloRunsTime.Category}, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${haloRunsTime.Time.string} by ${haloRunsTime.Usernames} | ${haloRunsTime.Video}`
        sendChatMessage(hrMessage)

        haloRunsTime = GetHaloRunsPb(
            "Halo 3: ODST",
            "Solo",
            "Full Game",
            "Legendary"
        )
        hrMessage.message.text = `The HaloRuns Record for ${haloRunsTime.GameName}, ${haloRunsTime.Category}, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${haloRunsTime.Time.string} by ${haloRunsTime.Usernames} | ${haloRunsTime.Video}`
        sendChatMessage(hrMessage)
        return
    } else if (msgSplitArray.length != 5) {
        let hrMessage = structuredClone(Wingbot953Message)
        hrMessage.platform = msg.platform
        hrMessage.message.text = `Incorrect number of parameters for !pb command`
        sendChatMessage(hrMessage)
        return
    }

    let hrNames: string[] = FindHaloRunsCompatibleNames(
        msgSplitArray[1].trim().toLowerCase(), //gameName
        msgSplitArray[2].trim().toLowerCase(), //category
        msgSplitArray[3].trim().toLowerCase(), //runnableSegment
        msgSplitArray[4].trim().toLowerCase(), //difficulty
        msg
    )

    if (hrNames.length === 4) {
        const haloRunsTime = GetHaloRunsPb(
            hrNames[0],
            hrNames[1],
            hrNames[2],
            hrNames[3]
        )

        let hrMessage = structuredClone(Wingbot953Message)
        hrMessage.platform = msg.platform

        if (haloRunsTime.Time === TimeSpan.zero) {
            hrMessage.message.text = `Failed to find HaloRuns Record. Please check the parameters and try again.`
        } else if (haloRunsTime.Time === TimeSpan.maxValue) {
            hrMessage.message.text = `There is no HaloRuns Record for ${haloRunsTime.GameName} ${haloRunsTime.Category} ${haloRunsTime.RunnableSegment} ${haloRunsTime.Difficulty}`
        } else {
            hrMessage.message.text = `The HaloRuns Record for ${haloRunsTime.GameName}, ${haloRunsTime.Category}, ${haloRunsTime.RunnableSegment}, ${haloRunsTime.Difficulty} is ${haloRunsTime.Time.string} by ${haloRunsTime.Usernames} | ${haloRunsTime.Video}`
        }
        sendChatMessage(hrMessage)
    }
}

export function GetHaloRunsPb(
    hrGameName: string,
    hrCategory: string,
    hrRunnableSegment: string,
    hrDifficulty: string
): HaloRunsTime {
    let wrHaloRunsTime: HaloRunsTime = {
        GameName: hrGameName,
        Category: hrCategory,
        RunnableSegment: hrRunnableSegment,
        Difficulty: hrDifficulty,
        Time: TimeSpan.zero,
        Usernames: "",
        Video: "",
    }

    console.log(hrGameName, hrCategory, hrRunnableSegment, hrDifficulty)

    // Search HaloRuns global.json for Game and Runnable Segment IDs
    let hrGameIndex = hrGeneralJson.Games.findIndex((element: any) => {
        return element.Name === hrGameName
    })

    if (hrGameIndex < 0) {
        // hrMessage.message.text = "Failed to find game on HaloRuns"
        console.log("Failed to find game on HaloRuns")
        return wrHaloRunsTime
    }

    let hrRunnableSegmentIndex = hrGeneralJson.Games[
        hrGameIndex
    ].RunnableSegments.findIndex((element: any) => {
        return element.Name === hrRunnableSegment
    })

    if (hrRunnableSegmentIndex < 0) {
        // hrMessage.message.text = "Failed to find runnable segment on HaloRuns"
        console.log("Failed to find runnable segment on HaloRuns")
        return wrHaloRunsTime
    }

    let hrGameId: string = hrGeneralJson.Games[hrGameIndex].Id

    let hrRunnableSegmentId: string =
        hrGeneralJson.Games[hrGameIndex].RunnableSegments[
            hrRunnableSegmentIndex
        ].Id

    let pbRuns = wingman953ProfileJson.RunsByCategory.Solo

    if (!hrCategory.includes("Coop")) {
        pbRuns = wingman953ProfileJson.RunsByCategory[hrCategory]

        for (let runIndex = 0; runIndex < pbRuns.length; runIndex++) {
            if (
                pbRuns[runIndex].GameId === hrGameId &&
                pbRuns[runIndex].RunnableSegmentId === hrRunnableSegmentId &&
                pbRuns[runIndex].Difficulty === hrDifficulty
            ) {
                let pbVideo: string =
                    pbRuns[runIndex].Participants[0].EvidenceLink

                wrHaloRunsTime.Time = TimeSpan.fromSeconds(
                    parseInt(pbRuns[runIndex].Duration, 10)
                )
                wrHaloRunsTime.Usernames =
                    pbRuns[runIndex].Participants[0].Username
                wrHaloRunsTime.Video = pbVideo

                return wrHaloRunsTime
            }
        }
    }

    if (hrCategory.includes("Coop")) {
        pbRuns = wingman953ProfileJson.RunsByCategory[hrCategory]

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
            // hrMessage.message.text = `Wingman953's PB for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty} is ${pbTime}${coopUsernames} | ${pbVideo}`

            wrHaloRunsTime.Time = TimeSpan.fromString(pbTime)
            wrHaloRunsTime.Usernames = coopUsernames
            wrHaloRunsTime.Video = pbVideo

            return wrHaloRunsTime
        }
    }

    // hrMessage.message.text = `Wingman953 does not have a submitted time for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty}`
    console.log(
        `Wingman953 does not have a submitted time for ${hrGameName}, ${hrCategory}, ${hrRunnableSegment}, ${hrDifficulty}`
    )
    return wrHaloRunsTime
}

function FindHaloRunsCompatibleNames(
    gameName: string,
    category: string,
    runnableSegment: string,
    difficulty: string,
    msg: UnifiedChatMessage
) {
    let hrGameName = FindCommandMatch(CommandNaming.Games, gameName)

    let hrMessage = structuredClone(Wingbot953Message)
    hrMessage.platform = msg.platform

    if (hrGameName === "") {
        hrMessage.message.text = "Failed to parse game"
        sendChatMessage(hrMessage)
        return []
    }

    let hrCategory = FindCommandMatch(CommandNaming.Categories, category)

    if (hrCategory === "") {
        hrMessage.message.text = "Failed to parse category"
        sendChatMessage(hrMessage)
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
        hrMessage.message.text = "Failed to parse runnable segment"
        sendChatMessage(hrMessage)
        return []
    }

    let hrDifficulty = FindCommandMatch(CommandNaming.Difficulty, difficulty)

    if (hrDifficulty === "") {
        hrMessage.message.text = "Failed to parse difficulty"
        sendChatMessage(hrMessage)
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
