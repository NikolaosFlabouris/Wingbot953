import { sleep, Between } from "./Utils"
import fs from "fs"
import {
    PublishAlltimeLeaderboard,
    PublishBimonthlyLeaderboard,
} from "../Integrations/Discord"

import { quizCategories } from "../../Data/QuizQuestions/QuizCategories"
import { sendChatMessage, Wingbot953Message } from "../MessageHandling"
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage"
import {
    apiClient,
    TwitchDisableSlowMode,
    TwitchEnableSlowMode,
} from "../Integrations/Twitch"

export let quizActive = false
let blockQuiz = false
let totalQuestionCount: number

let questionIndex: number
let categoryIndex: number
let categoryName: string
let question: string
let answer: string
let QuizAnswerHandler: Function
type quizUser = {
    Username: string
    Platform: string
}
let correctUsers: quizUser[] = []
const usedQuestions: number[] = []

let leaderboardsAllTime: any
let leaderboardsCurrentTime: any
const leaderboardsFilePath = "./Data/QuizLeaderboards/"
const leaderboardsAllTimeFileName = "QuizLeaderboards.json"
const leaderboardsCurrentTimeFileName = "2024MarApr-QuizLeaderboards.json"

export async function QuizSetup() {
    totalQuestionCount = 0

    for (let i = 0; i < quizCategories.length; i++) {
        totalQuestionCount += quizCategories[i].CategoryLength

        console.log(
            quizCategories[i].CategoryName +
                " Question count: " +
                quizCategories[i].CategoryLength
        )
    }

    console.log("Total question count: " + totalQuestionCount)
}

export async function StartQuiz() {
    if (Between(0, 99) > 80) {
        StartBasicQuiz()
    } else {
        StartMultiUserQuiz()
    }
}

export function ResetUsedQuestions() {
    while (usedQuestions.length > 0) {
        usedQuestions.pop()
    }
}

export async function RollBonusQuiz() {
    await sleep(2000)

    if (Between(0, 99) < 7) {
        let bonusQuizMessage = `BONUS QUIZ! LET'S GO!`

        let bonusQuizTwitchMessage = structuredClone(Wingbot953Message)
        bonusQuizTwitchMessage.platform = "twitch"
        bonusQuizTwitchMessage.message.text = `wingma14Think ${bonusQuizMessage} wingma14Think`

        let bonusQuizYouTubeMessage = structuredClone(Wingbot953Message)
        bonusQuizYouTubeMessage.platform = "youtube"
        bonusQuizYouTubeMessage.message.text = `${bonusQuizMessage}`

        sendChatMessage(bonusQuizTwitchMessage)

        sendChatMessage(bonusQuizYouTubeMessage)

        await sleep(2000)

        StartQuiz()
    }
}

export async function StartBasicQuiz() {
    if (!blockQuiz) {
        blockQuiz = true

        let quizTwitchMessage = structuredClone(Wingbot953Message)
        quizTwitchMessage.platform = "twitch"

        let quizYouTubeMessage = structuredClone(Wingbot953Message)
        quizYouTubeMessage.platform = "youtube"

        let findingNumber = true
        while (findingNumber) {
            questionIndex = Between(0, totalQuestionCount - 1)

            if (!usedQuestions.includes(questionIndex)) {
                usedQuestions.push(questionIndex)
                findingNumber = false
                console.log(questionIndex)
            }
        }

        for (let i = 0; i < quizCategories.length; i++) {
            if (questionIndex < quizCategories[i].CategoryLength) {
                question =
                    quizCategories[i].CategoryQuestions[questionIndex].Question
                answer =
                    quizCategories[i].CategoryQuestions[questionIndex]
                        .Answers[0]
                categoryName = quizCategories[i].CategoryName
                categoryIndex = i
                break
            }

            questionIndex -= quizCategories[i].CategoryLength
        }

        let quizNoticeMessage = `The next Quiz Question is in 20secs! Be the FIRST to answer correctly to earn a point. The topic will be ${categoryName}! Good luck!`

        quizTwitchMessage.message.text = `wingma14Think ${quizNoticeMessage}`
        sendChatMessage(quizTwitchMessage)

        quizYouTubeMessage.message.text = `${quizNoticeMessage}`
        sendChatMessage(quizYouTubeMessage, false)

        await sleep(17000)

        // quizMessage.message.text = `/slow 3`
        // sendChatMessage(quizMessage)

        ReadLeaderboardsFromFile()

        TwitchEnableSlowMode(3)

        await sleep(3000)

        QuizAnswerHandler = BasicQuizAnswer
        quizActive = true

        quizTwitchMessage.message.text = `wingma14Think ${question}`
        sendChatMessage(quizTwitchMessage)

        quizYouTubeMessage.message.text = `${question}`
        sendChatMessage(quizYouTubeMessage, false)

        await sleep(25000)

        if (quizActive) {
            quizActive = false

            let quizFailedMessage = structuredClone(Wingbot953Message)
            quizFailedMessage.platform = "all"
            quizFailedMessage.message.text = `No one successfully answered the question. The answer was: ${answer}`
            sendChatMessage(quizFailedMessage)

            await sleep(1000)

            TwitchDisableSlowMode()

            // quizMessage.message.text = `/slowoff`
            // sendChatMessage(quizMessage)

            blockQuiz = false
        }
    }
}

async function BasicQuizAnswer(msg: UnifiedChatMessage) {
    if (
        quizCategories[categoryIndex].CategoryQuestions[
            questionIndex
        ].Answers.findIndex((element: string) => {
            return element.toLowerCase() == msg.message.text.toLowerCase()
        }) >= 0
    ) {
        const username = msg.author.displayName

        let quizMessage = structuredClone(Wingbot953Message)
        quizMessage.platform = `all`

        quizActive = false
        UpdateQuizScore([{ Username: username, Platform: msg.platform }], 1)

        let platform = ""
        if (msg.platform === "twitch") {
            platform = " from Twitch"
        }
        if (msg.platform === "youtube") {
            platform = " from YouTube"
        }

        quizMessage.message.text = `Congratulations ${username}${platform}! You answered the question correctly! The answer was: ${answer}.`
        sendChatMessage(quizMessage)

        await sleep(1000)

        TwitchDisableSlowMode()

        // quizMessage.message.text = `/slowoff`
        // sendChatMessage(quizMessage)

        blockQuiz = false

        RollBonusQuiz()
    }
}

export async function StartMultiUserQuiz() {
    if (!blockQuiz) {
        blockQuiz = true

        let quizTwitchMessage = structuredClone(Wingbot953Message)
        quizTwitchMessage.platform = "twitch"

        let quizYouTubeMessage = structuredClone(Wingbot953Message)
        quizYouTubeMessage.platform = "youtube"

        let findingNumber = true
        while (findingNumber) {
            questionIndex = Between(0, totalQuestionCount - 1)

            if (!usedQuestions.includes(questionIndex)) {
                usedQuestions.push(questionIndex)
                findingNumber = false
            }
        }

        for (let i = 0; i < quizCategories.length; i++) {
            if (questionIndex < quizCategories[i].CategoryLength) {
                question =
                    quizCategories[i].CategoryQuestions[questionIndex].Question
                answer =
                    quizCategories[i].CategoryQuestions[questionIndex]
                        .Answers[0]
                categoryName = quizCategories[i].CategoryName
                categoryIndex = i
                break
            }

            questionIndex -= quizCategories[i].CategoryLength
        }

        let users = "USERS"
        if (categoryName.includes("Halo Wars")) {
            users = "UNITS"
        }

        let quizNoticeMessage = `The next Quiz Question is in 20secs! ALL ${users} who answer correctly before time runs out will earn a point! The topic will be ${categoryName}! Good luck!`

        quizTwitchMessage.message.text = `wingma14Think ${quizNoticeMessage}`

        sendChatMessage(quizTwitchMessage)

        quizYouTubeMessage.message.text = `${quizNoticeMessage}`

        sendChatMessage(quizYouTubeMessage, false)

        await sleep(17000)

        // quizMessage.message.text = `/slow 3`
        // sendChatMessage(quizMessage)

        ReadLeaderboardsFromFile()

        TwitchEnableSlowMode(3)

        await sleep(3000)

        correctUsers = []
        QuizAnswerHandler = MultiUserQuizAnswer
        quizActive = true

        quizTwitchMessage.message.text = `wingma14Think ${question}`
        sendChatMessage(quizTwitchMessage)

        quizYouTubeMessage.message.text = `${question}`
        sendChatMessage(quizYouTubeMessage, false)

        await sleep(25000)

        quizActive = false

        let platformUserCount: number = 0
        let userList: string = ""
        for (let i = 0; i < correctUsers.length; i++) {
            if (correctUsers[i].Platform === "twitch") {
                platformUserCount++
                if (userList != "") {
                    userList += ", " + correctUsers[i].Username
                } else {
                    userList += correctUsers[i].Username
                }
            }
        }

        let plural = platformUserCount > 1 ? "users" : "user"

        if (userList != "") {
            quizTwitchMessage.message.text = `${correctUsers.length} Twitch ${plural} (${userList}) successfully answered the question. The answer was: ${answer}`
        } else {
            quizTwitchMessage.message.text = `No Twitch user successfully answered the question. The answer was: ${answer}`
        }

        sendChatMessage(quizTwitchMessage)

        platformUserCount = 0
        userList = ""
        for (let i = 0; i < correctUsers.length; i++) {
            if (correctUsers[i].Platform === "youtube") {
                platformUserCount++
                if (userList != "") {
                    userList += ", " + correctUsers[i].Username
                } else {
                    userList += correctUsers[i].Username
                }
            }
        }

        plural = platformUserCount > 1 ? "users" : "user"

        if (userList != "") {
            quizYouTubeMessage.message.text = `${correctUsers.length} YouTube ${plural} (${userList}) successfully answered the question. The answer was: ${answer}`
        } else {
            quizYouTubeMessage.message.text = `No YouTube user successfully answered the question. The answer was: ${answer}`
        }

        sendChatMessage(quizYouTubeMessage)

        if (correctUsers.length > 0) {
            UpdateQuizScore(correctUsers, 1)
        }

        await sleep(1000)

        TwitchDisableSlowMode()

        // quizMessage.message.text = `/slowoff`
        // sendChatMessage(quizMessage)

        correctUsers = []

        blockQuiz = false

        // Only roll bonus quiz if there are correct users
        if (correctUsers.length > 0) {
            RollBonusQuiz()
        }
    }
}

async function MultiUserQuizAnswer(msg: UnifiedChatMessage) {
    const username = msg.author.displayName

    if (
        quizCategories[categoryIndex].CategoryQuestions[
            questionIndex
        ].Answers.findIndex((element: string) => {
            return element.toLowerCase() == msg.message.text.toLowerCase()
        }) >= 0
    ) {
        let found = false
        correctUsers.forEach((element) => {
            if (
                element.Username === username &&
                element.Platform === msg.platform
            ) {
                found = true
            }
        })

        if (!found) {
            correctUsers.push({ Username: username, Platform: msg.platform })
        }
    }
}

export async function onQuizHandler(msg: UnifiedChatMessage) {
    if (quizActive) {
        QuizAnswerHandler(msg)
    }
}

export function DisplayQuizLeaderboards(msg: UnifiedChatMessage) {
    ReadLeaderboardsFromFile()

    leaderboardsAllTime.sort(
        (firstItem: { Score: number }, secondItem: { Score: number }) =>
            secondItem.Score - firstItem.Score
    )

    leaderboardsCurrentTime.sort(
        (firstItem: { Score: number }, secondItem: { Score: number }) =>
            secondItem.Score - firstItem.Score
    )

    let message = "ALL-TIME QUIZ TOP 5: "

    let learboardSize =
        5 > leaderboardsAllTime.length ? leaderboardsAllTime.length : 5

    for (let i = 0; i < learboardSize; i++) {
        message +=
            leaderboardsAllTime[i].Username +
            " - " +
            leaderboardsAllTime[i].Score +
            "pts | "
    }

    let quizMessage = structuredClone(Wingbot953Message)
    quizMessage.platform = msg.platform
    quizMessage.message.text = message
    sendChatMessage(quizMessage)

    // TODO: Bi-monthly Quiz
    // message = "BI-MONTHLY QUIZ TOP 5: "

    // learboardSize =
    //     5 > leaderboardsCurrentTime.length ? leaderboardsCurrentTime.length : 5

    // for (let i = 0; i < learboardSize; i++) {
    //     message +=
    //         leaderboardsCurrentTime[i].Username +
    //         " - " +
    //         leaderboardsCurrentTime[i].Score +
    //         "pts | "
    // }

    // SendMessage("!quizleaderboard", message)
}

export function GetMyQuizScore(msg: UnifiedChatMessage) {
    ReadLeaderboardsFromFile()

    const originalMessage = msg.message.text
    let user = msg.author.displayName

    let quizMessage = structuredClone(Wingbot953Message)
    quizMessage.platform = msg.platform

    let scoreFound = false

    if (originalMessage.split(" ").length >= 2) {
        user = originalMessage.split(" ")[1].trim()
    }

    for (let i = 0; i < leaderboardsAllTime.length; i++) {
        if (
            leaderboardsAllTime[i].Username.toLowerCase() == user.toLowerCase()
        ) {
            quizMessage.message.text =
                `${leaderboardsAllTime[i].Username}'s All-time Quiz Score is: ` +
                leaderboardsAllTime[i].Score
            scoreFound = true
        }
    }

    // TODO: Bi-monthly Quiz
    // for (let i = 0; i < leaderboardsCurrentTime.length; i++) {
    //     if (
    //         leaderboardsCurrentTime[i].Username.toLowerCase() ==
    //         user.toLowerCase()
    //     ) {
    //         scoreMessage +=
    //             ` | Bi-Monthly Quiz Score is: ` +
    //             leaderboardsCurrentTime[i].Score
    //     }
    // }

    if (!scoreFound) {
        quizMessage.message.text = `No score found for user: ${user}`
    }

    sendChatMessage(quizMessage)
}

export function AddQuizScore(msg: UnifiedChatMessage) {
    var originalMessage = msg.message.text
    originalMessage.split(" ")[0].trim()

    if (originalMessage.split(" ").length === 2) {
        var user = originalMessage.split(" ")[1].trim()
        ReadLeaderboardsFromFile()
        UpdateQuizScore([{ Username: user, Platform: msg.platform }], 1)

        let quizMessage = structuredClone(Wingbot953Message)
        quizMessage.platform = msg.platform
        quizMessage.message.text = `Score added for user: @${user}`
        sendChatMessage(quizMessage)
    }
}

function UpdateQuizScore(users: quizUser[], pointsChange: number) {
    users.forEach((user) => {
        let currentTimeFound = false
        let allTimeFound = false

        for (let i = 0; i < leaderboardsCurrentTime.length; i++) {
            if (
                leaderboardsCurrentTime[i].Username == user.Username &&
                leaderboardsCurrentTime[i].Platform == user.Platform
            ) {
                leaderboardsCurrentTime[i].Score += pointsChange
                currentTimeFound = true
                break
            }
        }

        for (let i = 0; i < leaderboardsAllTime.length; i++) {
            if (
                leaderboardsAllTime[i].Username == user.Username &&
                leaderboardsAllTime[i].Platform == user.Platform
            ) {
                leaderboardsAllTime[i].Score += pointsChange
                allTimeFound = true
                break
            }
        }

        if (!currentTimeFound) {
            leaderboardsCurrentTime.push({
                Username: user.Username,
                Platform: user.Platform,
                Score: pointsChange,
            })
        }

        if (!allTimeFound) {
            leaderboardsAllTime.push({
                Username: user.Username,
                Platform: user.Platform,
                Score: pointsChange,
            })
        }
    })

    WriteLeaderboardsToFile()
}

function ReadLeaderboardsFromFile() {
    try {
        const data = fs.readFileSync(
            leaderboardsFilePath + leaderboardsAllTimeFileName,
            "utf8"
        )
        leaderboardsAllTime = JSON.parse(data)
    } catch (err) {
        console.error(err)
    }

    try {
        const data = fs.readFileSync(
            leaderboardsFilePath + leaderboardsCurrentTimeFileName,
            "utf8"
        )
        leaderboardsCurrentTime = JSON.parse(data)
    } catch (err) {
        console.error(err)
    }
}

function WriteLeaderboardsToFile() {
    if (process.env.DEBUG === "TRUE") {
        return
    }

    try {
        const data = fs.writeFileSync(
            leaderboardsFilePath + leaderboardsAllTimeFileName,
            JSON.stringify(leaderboardsAllTime)
        )

        PublishAlltimeLeaderboard(leaderboardsAllTime)
    } catch (err) {
        console.error(err)
    }

    try {
        const data = fs.writeFileSync(
            leaderboardsFilePath + leaderboardsCurrentTimeFileName,
            JSON.stringify(leaderboardsCurrentTime)
        )

        PublishBimonthlyLeaderboard(leaderboardsCurrentTime)
    } catch (err) {
        console.error(err)
    }
}

export function PublishLeaderboards() {
    ReadLeaderboardsFromFile()
    PublishAlltimeLeaderboard(leaderboardsAllTime)
    PublishBimonthlyLeaderboard(leaderboardsCurrentTime)
}

export function PublishNewLeaderboard() {
    ReadLeaderboardsFromFile()
    PublishBimonthlyLeaderboard(leaderboardsCurrentTime, true)
}

async function UpdateLeaderboardsWithIds() {
    ReadLeaderboardsFromFile()
    console.log("Updating leaderboards with IDs...")
    for (let i = 0; i < leaderboardsAllTime.length; i++) {
        console.log(`Updating ID for user ${leaderboardsAllTime[i].Username}`)
        let user = await apiClient.users.getUserByName(
            leaderboardsAllTime[i].Username
        )
        if (user) {
            console.log(
                `ID for user ${leaderboardsAllTime[i].Username} is ${user.id}`
            )
            leaderboardsAllTime[i].UserId = user.id
        }
    }
    WriteLeaderboardsToFile()
}
