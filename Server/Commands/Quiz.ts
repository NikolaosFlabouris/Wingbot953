import { sleep, Between } from "./Utils"
import fs from "fs"
import {
    PublishAlltimeLeaderboard,
    PublishBimonthlyLeaderboard,
} from "../Integrations/Discord"

import { quizCategories } from "../../Data/QuizQuestions/QuizCategories"
import { sendChatMessage, Wingbot953Message } from "../MessageHandling"
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage"

let blockQuiz = false
let quizActive = false
let totalQuestionCount: number

let questionIndex: number
let categoryIndex: number
let categoryName: string
let question: string
let answer: string
let QuizAnswerHandler: Function
let correctUsers: any[]
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
        let bonusQuizMessage = Wingbot953Message
        bonusQuizMessage.platform = "twitch"
        bonusQuizMessage.message.text =
            "wingma14Think BONUS QUIZ! LET'S GO! wingma14Think"

        sendChatMessage(bonusQuizMessage)

        await sleep(2000)

        StartQuiz()
    }
}

export async function StartBasicQuiz() {
    if (!blockQuiz) {
        blockQuiz = true

        let quizMessage = Wingbot953Message
        quizMessage.platform = "twitch"

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

        quizMessage.message.text = `wingma14Think The next Quiz Question is in 20secs! Be the FIRST to answer correctly to earn a point. The topic will be ${categoryName}! Good luck!`
        sendChatMessage(quizMessage)

        await sleep(17000)

        quizMessage.message.text = `/slow 3`
        sendChatMessage(quizMessage)

        ReadLeaderboardsFromFile()

        await sleep(3000)

        QuizAnswerHandler = BasicQuizAnswer
        quizActive = true

        quizMessage.message.text = `wingma14Think ${question}`
        sendChatMessage(quizMessage)

        await sleep(25000)

        if (quizActive) {
            quizActive = false

            quizMessage.message.text = `No one successfully answered the question. The answer was: ${answer}`
            sendChatMessage(quizMessage)

            await sleep(1000)

            quizMessage.message.text = `/slowoff`
            sendChatMessage(quizMessage)

            blockQuiz = false
        }
    }
}

async function BasicQuizAnswer(user: string, msg: UnifiedChatMessage) {
    const username = msg.author.displayName

    let quizMessage = Wingbot953Message
    quizMessage.platform = "twitch"

    if (
        quizCategories[categoryIndex].CategoryQuestions[
            questionIndex
        ].Answers.findIndex((element: string) => {
            return element.toLowerCase() == msg.message.text.toLowerCase()
        }) >= 0
    ) {
        quizActive = false
        UpdateQuizScore([username], 1)

        quizMessage.message.text = `Congratulations ${username}! You answered the question correctly! The answer was: ${answer}.`
        sendChatMessage(quizMessage)

        await sleep(1000)

        quizMessage.message.text = `/slowoff`
        sendChatMessage(quizMessage)

        blockQuiz = false

        RollBonusQuiz()
    }
}

export async function StartMultiUserQuiz() {
    if (!blockQuiz) {
        blockQuiz = true

        let quizMessage = Wingbot953Message
        quizMessage.platform = "twitch"

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
                console.log(
                    "*** DEBUGGING QUIZ QUESTION ERROR: ",
                    quizCategories[i].CategoryQuestions[questionIndex]
                )
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

        quizMessage.message.text = `wingma14Think The next Quiz Question is in 20secs! ALL ${users} who answer correctly before time runs out will earn a point! The topic will be ${categoryName}! Good luck!`
        sendChatMessage(quizMessage)

        await sleep(17000)

        quizMessage.message.text = `/slow 3`
        sendChatMessage(quizMessage)

        ReadLeaderboardsFromFile()

        await sleep(3000)

        correctUsers = []
        QuizAnswerHandler = MultiUserQuizAnswer
        quizActive = true

        quizMessage.message.text = `wingma14Think ${question}`
        sendChatMessage(quizMessage)

        await sleep(25000)

        quizActive = false

        let successfulAnswer = false

        if (correctUsers.length > 0) {
            const plural = correctUsers.length > 1 ? "users" : "user"

            let userList = ""
            for (let i = 0; i < correctUsers.length; i++) {
                if (i > 0) {
                    userList += ", " + correctUsers[i]
                } else {
                    userList += correctUsers[i]
                }
            }

            quizMessage.message.text = `${correctUsers.length} ${plural} (${userList}) successfully answered the question. The answer was: ${answer}`
            sendChatMessage(quizMessage)

            successfulAnswer = true
        } else {
            quizMessage.message.text = `No one successfully answered the question. The answer was: ${answer}`
            sendChatMessage(quizMessage)
        }

        UpdateQuizScore(correctUsers, 1)

        await sleep(1000)

        quizMessage.message.text = `/slowoff`
        sendChatMessage(quizMessage)

        correctUsers = []

        blockQuiz = false

        if (successfulAnswer) {
            RollBonusQuiz()
        }
    }
}

async function MultiUserQuizAnswer(user: string, msg: UnifiedChatMessage) {
    const username = msg.author.displayName

    if (
        quizCategories[categoryIndex].CategoryQuestions[
            questionIndex
        ].Answers.findIndex((element: string) => {
            return element.toLowerCase() == msg.message.text.toLowerCase()
        }) >= 0
    ) {
        if (!correctUsers.includes(username)) {
            correctUsers.push(username)
        }
    }
}

export async function onQuizHandler(user: string, msg: UnifiedChatMessage) {
    if (quizActive) {
        QuizAnswerHandler(user, msg)
    }
}

export function DisplayQuizLeaderboards() {
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

    let quizMessage = Wingbot953Message
    quizMessage.platform = "twitch"
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

    let quizMessage = Wingbot953Message
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
        UpdateQuizScore([user], 1)

        let quizMessage = Wingbot953Message
        quizMessage.platform = msg.platform
        quizMessage.message.text = `Score added for user: ${user}`
        sendChatMessage(quizMessage)
    }
}

function UpdateQuizScore(users: string[], pointsChange: number) {
    users.forEach((user) => {
        let currentTimeFound = false
        let allTimeFound = false

        for (let i = 0; i < leaderboardsCurrentTime.length; i++) {
            if (leaderboardsCurrentTime[i].Username == user) {
                leaderboardsCurrentTime[i].Score += pointsChange
                currentTimeFound = true
                break
            }
        }

        for (let i = 0; i < leaderboardsAllTime.length; i++) {
            if (leaderboardsAllTime[i].Username == user) {
                leaderboardsAllTime[i].Score += pointsChange
                allTimeFound = true
                break
            }
        }

        if (!currentTimeFound) {
            leaderboardsCurrentTime.push({
                Username: user,
                Score: pointsChange,
            })
        }

        if (!allTimeFound) {
            leaderboardsAllTime.push({ Username: user, Score: pointsChange })
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
