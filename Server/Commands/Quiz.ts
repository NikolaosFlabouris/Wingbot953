import { sleep, Between } from "./Utils"
import fs from "fs"
import {
    PublishTwitchAllTimeLeaderboard as PublishTwitchAllTimeLeaderboard,
    PublishYouTubeAllTimeLeaderboard,
} from "../Integrations/Discord"

import { quizCategories } from "../../Data/QuizQuestions/QuizCategories"
import { sendChatMessage, Wingbot953Message } from "../MessageHandling"
import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage"
import {
    apiClient,
    TwitchDisableSlowMode,
    TwitchEnableSlowMode,
} from "../Integrations/Twitch"
import { setChatPollingInterval } from "../Integrations/YouTube"

export let quizActive: boolean = false
let blockQuiz: boolean = false
let quizQueue: number = 0

let totalQuestionCount: number

let questionIndex: number
let categoryIndex: number
let categoryName: string
let question: string
let answer: string
let QuizAnswerHandler: Function
interface QuizUser {
    Username: string
    UserId?: string
    Platform: string
    Score?: number
}
let correctUsers: QuizUser[] = []
const usedQuestions: number[] = []

let leaderboardsAllTime: any
const leaderboardsFilePath = "./Data/QuizLeaderboards/"
const leaderboardsAllTimeFileName = "QuizLeaderboards.json"

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

    setInterval(CheckQuizQueue, 2000)

    console.log("Total question count: " + totalQuestionCount)
}

async function CheckQuizQueue() {
    if (quizQueue < 0) {
        quizQueue = 0
    } else if (quizQueue > 0 && !blockQuiz) {
        quizQueue--
        if (Between(0, 99) > 80) {
            StartBasicQuiz()
        } else {
            StartMultiUserQuiz()
        }
    }
}

export function StartQuiz() {
    quizQueue++
}

export function ResetUsedQuestions() {
    while (usedQuestions.length > 0) {
        usedQuestions.pop()
    }
}

export async function RollBonusQuiz() {
    await sleep(2000)

    const roll = Between(0, 99)

    if (roll < 7) {
        console.log(`Successful Bonus Quiz Roll: ${roll}`)

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
    } else {
        console.log(`Unsuccessful Bonus Quiz Roll: ${roll}`)
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

        ReadLeaderboardsFromFile()

        TwitchEnableSlowMode(3)

        await sleep(3000)

        QuizAnswerHandler = BasicQuizAnswer
        quizActive = true

        quizTwitchMessage.message.text = `wingma14Think ${question}`
        sendChatMessage(quizTwitchMessage)

        // Set YouTube chat polling interval to be faster for the quiz
        setChatPollingInterval(1000)

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
        const userId = msg.author.id

        let quizMessage = structuredClone(Wingbot953Message)
        quizMessage.platform = `all`

        quizActive = false
        UpdateQuizScore(
            [{ Username: username, UserId: userId, Platform: msg.platform }],
            1
        )

        let platform = ""
        if (msg.platform === "twitch") {
            platform = " from Twitch"
        }
        if (msg.platform === "youtube") {
            platform = " from YouTube"
        }

        quizMessage.message.text = `Congratulations ${username}${platform}! You answered the question correctly! The answer was: ${answer}.`
        sendChatMessage(quizMessage)

        // Set YouTube chat polling interval to be normal post quiz
        setChatPollingInterval()

        await sleep(1000)

        TwitchDisableSlowMode()

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

        ReadLeaderboardsFromFile()

        TwitchEnableSlowMode(3)

        await sleep(3000)

        correctUsers = []
        QuizAnswerHandler = MultiUserQuizAnswer
        quizActive = true

        quizTwitchMessage.message.text = `wingma14Think ${question}`
        sendChatMessage(quizTwitchMessage)

        // Set YouTube chat polling interval to be faster for the quiz
        setChatPollingInterval(1000)

        quizYouTubeMessage.message.text = `${question}`
        sendChatMessage(quizYouTubeMessage, false)

        await sleep(25000)

        quizActive = false

        let twitchUserCount: number = 0
        let twitchUserList: string = ""
        for (let i = 0; i < correctUsers.length; i++) {
            if (correctUsers[i].Platform === "twitch") {
                twitchUserCount++
                if (twitchUserList != "") {
                    twitchUserList += ", " + correctUsers[i].Username
                } else {
                    twitchUserList += correctUsers[i].Username
                }
            }
        }

        let twitchUserPlural: string = twitchUserCount > 1 ? "users" : "user"

        let youtubeUserCount: number = 0
        let youtubeUserList: string = ""
        for (let i = 0; i < correctUsers.length; i++) {
            if (correctUsers[i].Platform === "youtube") {
                youtubeUserCount++
                if (youtubeUserList != "") {
                    youtubeUserList += ", " + correctUsers[i].Username
                } else {
                    youtubeUserList += correctUsers[i].Username
                }
            }
        }

        let youtubeUserPlural: string = youtubeUserCount > 1 ? "users" : "user"

        let quizMessage = structuredClone(Wingbot953Message)
        quizMessage.platform = "all"

        if (twitchUserList != "" && youtubeUserList != "") {
            quizMessage.message.text = `${twitchUserCount} Twitch ${twitchUserPlural} (${twitchUserList}) & ${youtubeUserCount} YouTube ${youtubeUserPlural} (${youtubeUserList}) successfully answered the question. The answer was: ${answer}`
        } else if (twitchUserList != "") {
            quizMessage.message.text = `${twitchUserCount} Twitch ${twitchUserPlural} (${twitchUserList}) successfully answered the question. The answer was: ${answer}`
        } else if (youtubeUserList != "") {
            quizMessage.message.text = `${youtubeUserCount} YouTube ${youtubeUserPlural} (${youtubeUserList}) successfully answered the question. The answer was: ${answer}`
        } else {
            quizMessage.message.text = `No user successfully answered the question. The answer was: ${answer}`
        }

        sendChatMessage(quizMessage)

        // Set YouTube chat polling interval to be normal post quiz
        setChatPollingInterval()

        if (correctUsers.length > 0) {
            UpdateQuizScore(correctUsers, 1)
        }

        await sleep(1000)

        TwitchDisableSlowMode()

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
    const userId = msg.author.id

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
                element.UserId === userId &&
                element.Platform === msg.platform
            ) {
                found = true
            }
        })

        if (!found) {
            correctUsers.push({
                Username: username,
                UserId: userId,
                Platform: msg.platform,
            })
        }
    }
}

export async function onQuizHandler(msg: UnifiedChatMessage) {
    if (quizActive) {
        QuizAnswerHandler(msg)
    }
}

export function GetQuizLeaderboards(msg: UnifiedChatMessage) {
    ReadLeaderboardsFromFile()

    const platformLeaderboardsAllTime = leaderboardsAllTime
        .filter((user: any) => user.Platform === msg.platform)
        .sort(
            (firstItem: { Score: number }, secondItem: { Score: number }) =>
                secondItem.Score - firstItem.Score
        )

    let message = `${msg.platform.toUpperCase()} ALL-TIME QUIZ TOP 5: `

    // Get the top 5 users (or fewer if there aren't 5 YouTube users)
    const userCount = Math.min(platformLeaderboardsAllTime.length, 5)

    for (let i = 0; i < userCount; i++) {
        message +=
            platformLeaderboardsAllTime[i].Username +
            " - " +
            platformLeaderboardsAllTime[i].Score +
            "pts | "
    }

    let quizMessage = structuredClone(Wingbot953Message)
    quizMessage.platform = msg.platform
    quizMessage.message.text = message
    sendChatMessage(quizMessage)
}

export function GetQuizScore(msg: UnifiedChatMessage) {
    ReadLeaderboardsFromFile()

    let quizMessage = structuredClone(Wingbot953Message)
    quizMessage.platform = msg.platform

    const originalMessage = msg.message.text
    const platform = msg.platform
    const userId = msg.author.id
    let user = msg.author.displayName
    let scoreFound = false

    // Check if a specific username was provided as the second word
    if (originalMessage.split(" ").length >= 2) {
        user = originalMessage.split(" ")[1].trim()

        // First search: Match by provided username and platform
        for (let i = 0; i < leaderboardsAllTime.length; i++) {
            if (
                leaderboardsAllTime[i].Username.toLowerCase() ===
                    user.toLowerCase() &&
                leaderboardsAllTime[i].Platform === platform
            ) {
                quizMessage.message.text =
                    `${leaderboardsAllTime[i].Username}'s All-time Quiz Score is: ` +
                    leaderboardsAllTime[i].Score
                scoreFound = true
                break
            }
        }
    } else {
        // No specific username provided, search by userId and platform
        for (let i = 0; i < leaderboardsAllTime.length; i++) {
            if (
                leaderboardsAllTime[i].UserId === userId &&
                leaderboardsAllTime[i].Platform === platform
            ) {
                quizMessage.message.text =
                    `${leaderboardsAllTime[i].Username}'s All-time Quiz Score is: ` +
                    leaderboardsAllTime[i].Score
                scoreFound = true
                break
            }
        }
    }

    // If still not found, try searching by author's display name and platform
    if (!scoreFound) {
        for (let i = 0; i < leaderboardsAllTime.length; i++) {
            if (
                leaderboardsAllTime[i].Username.toLowerCase() ===
                    msg.author.displayName.toLowerCase() &&
                leaderboardsAllTime[i].Platform === platform
            ) {
                quizMessage.message.text =
                    `${leaderboardsAllTime[i].Username}'s All-time Quiz Score is: ` +
                    leaderboardsAllTime[i].Score
                scoreFound = true
                break
            }
        }
    }

    // If no score is found after all searches
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

function UpdateQuizScore(users: QuizUser[], pointsChange: number) {
    users.forEach((user) => {
        let allTimeFound = false

        for (let i = 0; i < leaderboardsAllTime.length; i++) {
            if (
                leaderboardsAllTime[i].Username == user.Username &&
                leaderboardsAllTime[i].UserId == user.UserId &&
                leaderboardsAllTime[i].Platform == user.Platform
            ) {
                leaderboardsAllTime[i].Score += pointsChange
                allTimeFound = true
                break
            } else if (
                leaderboardsAllTime[i].Username == user.Username &&
                leaderboardsAllTime[i].Platform == user.Platform
            ) {
                leaderboardsAllTime[i].Score += pointsChange
                allTimeFound = true
                break
            }
        }

        if (!allTimeFound) {
            leaderboardsAllTime.push({
                Username: user.Username,
                UserId: user.UserId,
                Platform: user.Platform,
                Score: pointsChange,
            })
        }
    })

    WriteLeaderboardsToFile()
    PublishLeaderboards()
}

function ReadLeaderboardsFromFile() {
    try {
        const data = fs.readFileSync(
            leaderboardsFilePath + leaderboardsAllTimeFileName,
            "utf8"
        )
        leaderboardsAllTime = JSON.parse(data) as QuizUser[]
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
    } catch (err) {
        console.error(err)
    }
}

export function PublishLeaderboards() {
    ReadLeaderboardsFromFile()
    PublishTwitchAllTimeLeaderboard(leaderboardsAllTime)
    PublishYouTubeAllTimeLeaderboard(leaderboardsAllTime)
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
    PublishLeaderboards()
}
