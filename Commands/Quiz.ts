import { sleep, Between } from "./Utils"
import { SendMessage } from "../Integrations/Twitch"
import fs from "fs"
import { TwitchPrivateMessage } from "@twurple/chat/lib/commands/TwitchPrivateMessage"
import { PublishAlltimeLeaderboard, PublishBimonthlyLeaderboard } from "../Integrations/Discord"

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
const leaderboardsCurrentTimeFileName = "2023JanFeb-QuizLeaderboards.json"

const quizQuestionFilePath = "./Data/QuizQuestions/"


let data = fs.readFileSync(quizQuestionFilePath + "HaloCE.json", "utf8")
const halo1Questions = JSON.parse(data)
data = fs.readFileSync(quizQuestionFilePath + "Halo2.json", "utf8")
const halo2Questions = JSON.parse(data)
data = fs.readFileSync(quizQuestionFilePath + "Halo3.json", "utf8")
const halo3Questions = JSON.parse(data)
data = fs.readFileSync(quizQuestionFilePath + "Halo3ODST.json", "utf8")
const odstQuestions = JSON.parse(data)
data = fs.readFileSync(quizQuestionFilePath + "HaloReach.json", "utf8")
const reachQuestions = JSON.parse(data)
data = fs.readFileSync(quizQuestionFilePath + "Halo4.json", "utf8")
const halo4Questions = JSON.parse(data)
data = fs.readFileSync(quizQuestionFilePath + "Halo5.json", "utf8")
const halo5Questions = JSON.parse(data)
// data = fs.readFileSync(quizQuestionFilePath + "HaloInfinite.json", "utf8")
// const haloInfiniteQuestions = JSON.parse(data)
data = fs.readFileSync(quizQuestionFilePath + "HaloFranchise.json", "utf8")
const franchiseQuestions = JSON.parse(data)
data = fs.readFileSync(quizQuestionFilePath + "HalorunsSpeedrunning.json", "utf8")
const halorunsQuestions = JSON.parse(data)

const quizCategories = [
    {
        CategoryQuestions: halo1Questions,
        CategoryName: "Halo: CE",
        CategoryLength: halo1Questions.length,
    },
    {
        CategoryQuestions: halo2Questions,
        CategoryName: "Halo 2",
        CategoryLength: halo2Questions.length,
    },
    {
        CategoryQuestions: halo3Questions,
        CategoryName: "Halo 3",
        CategoryLength: halo3Questions.length,
    },
    {
        CategoryQuestions: odstQuestions,
        CategoryName: "Halo 3:ODST",
        CategoryLength: odstQuestions.length,
    },
    {
        CategoryQuestions: reachQuestions,
        CategoryName: "Halo: Reach",
        CategoryLength: reachQuestions.length,
    },
    {
        CategoryQuestions: halo4Questions,
        CategoryName: "Halo 4",
        CategoryLength: halo4Questions.length,
    },
    {
        CategoryQuestions: halo5Questions,
        CategoryName: "Halo 5",
        CategoryLength: halo5Questions.length,
    },
    // {
    //     CategoryQuestions: haloInfiniteQuestions,
    //     CategoryName: "Halo Infinite",
    //     CategoryLength: haloInfiniteQuestions.length,
    // },
    {
        CategoryQuestions: franchiseQuestions,
        CategoryName: "Halo Franchise",
        CategoryLength: franchiseQuestions.length,
    },
    {
        CategoryQuestions: halorunsQuestions,
        CategoryName: "HaloRuns/Speedrunning",
        CategoryLength: halorunsQuestions.length,
    },
]

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

export async function StartBasicQuiz() {
    if (!blockQuiz) {
        blockQuiz = true

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

        SendMessage(
            "!quizcontroller",
            `wingma14Think The next Quiz Question is in 20secs! Be the FIRST to answer correctly to earn a point. The topic will be ${categoryName}! Good luck!`
        )

        await sleep(17000)

        SendMessage("!quizcontroller", `/slow 3`)

        ReadLeaderboardsFromFile()

        await sleep(3000)

        QuizAnswerHandler = BasicQuizAnswer
        quizActive = true

        SendMessage("!quizcontroller", `wingma14Think ${question}`)

        await sleep(25000)

        if (quizActive) {
            quizActive = false

            SendMessage(
                "!quizcontroller",
                `No one successfully answered the question. The answer was: ${answer}`
            )

            await sleep(1000)

            SendMessage("!quizcontroller", `/slowoff`)

            blockQuiz = false
        }
    }
}

async function BasicQuizAnswer(user: string, msg: TwitchPrivateMessage) {
    const username = msg.userInfo.displayName

    if (
        quizCategories[categoryIndex].CategoryQuestions[
            questionIndex
        ].Answers.findIndex((element: string) => {
            return element.toLowerCase() == msg.content.value.toLowerCase()
        }) >= 0
    ) {
        quizActive = false
        UpdateQuizScore([username], 1)
        SendMessage(
            "!quizcontroller",
            `Congratulations ${username}! You answered the question correctly! The answer was: ${answer}.`
        )

        await sleep(1000)

        SendMessage("!quizcontroller", `/slowoff`)

        blockQuiz = false
    }
}

export async function StartMultiUserQuiz() {
    if (!blockQuiz) {
        blockQuiz = true

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

        SendMessage(
            "!quizcontroller",
            `wingma14Think The next Quiz Question is in 20secs! ALL USERS who answer correctly before time runs out will earn a point! The topic will be ${categoryName}! Good luck!`
        )

        await sleep(17000)

        SendMessage("!quizcontroller", `/slow 3`)

        ReadLeaderboardsFromFile()

        await sleep(3000)

        correctUsers = []
        QuizAnswerHandler = MultiUserQuizAnswer
        quizActive = true

        SendMessage("!quizcontroller", `wingma14Think ${question}`)

        await sleep(25000)

        quizActive = false

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

            SendMessage(
                "!quizcontroller",
                `${correctUsers.length} ${plural} (${userList}) successfully answered the question. The answer was: ${answer}`
            )
        } else {
            SendMessage(
                "!quizcontroller",
                `No one successfully answered the question. The answer was: ${answer}`
            )
        }

        UpdateQuizScore(correctUsers, 1)

        await sleep(1000)

        SendMessage("!quizcontroller", `/slowoff`)

        correctUsers = []

        blockQuiz = false
    }
}

async function MultiUserQuizAnswer(user: string, msg: TwitchPrivateMessage) {
    const username = msg.userInfo.displayName

    if (
        quizCategories[categoryIndex].CategoryQuestions[
            questionIndex
        ].Answers.findIndex((element: string) => {
            return element.toLowerCase() == msg.content.value.toLowerCase()
        }) >= 0
    ) {
        if (!correctUsers.includes(username)) {
            correctUsers.push(username)
        }
    }
}

export async function onQuizHandler(user: string, msg: TwitchPrivateMessage) {
    if (quizActive) {
        QuizAnswerHandler(user, msg)
    }
}

export function DisplayQuizLeaderboards() {
    ReadLeaderboardsFromFile()

    leaderboardsAllTime.sort(
        (firstItem: { Score: number }, secondItem: { Score: number }) => secondItem.Score - firstItem.Score
    )

    leaderboardsCurrentTime.sort(
        (firstItem: { Score: number }, secondItem: { Score: number }) => secondItem.Score - firstItem.Score
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

    SendMessage("!quizleaderboard", message)
    
    message = "BI-MONTHLY QUIZ TOP 5: "
    
    learboardSize =
        5 > leaderboardsCurrentTime.length ? leaderboardsCurrentTime.length : 5

    for (let i = 0; i < learboardSize; i++) {
        message +=
            leaderboardsCurrentTime[i].Username +
            " - " +
            leaderboardsCurrentTime[i].Score +
            "pts | "
    }

    SendMessage("!quizleaderboard", message)
}

export function GetMyQuizScore(msg: TwitchPrivateMessage) {
    ReadLeaderboardsFromFile()

    const originalMessage = msg.content.value
    let user = msg.userInfo.displayName

    let scoreMessage = ""
    let scoreFound = false

    if (originalMessage.split(" ").length >= 2) {
        user = originalMessage.split(" ")[1].trim()
    }

    for (let i = 0; i < leaderboardsAllTime.length; i++) {
        if (
            leaderboardsAllTime[i].Username.toLowerCase() == user.toLowerCase()
        ) {
            scoreMessage =
                `${leaderboardsAllTime[i].Username}'s All-time Quiz Score is: ` +
                leaderboardsAllTime[i].Score
            scoreFound = true
        }
    }

    for (let i = 0; i < leaderboardsCurrentTime.length; i++) {
        if (
            leaderboardsCurrentTime[i].Username.toLowerCase() ==
            user.toLowerCase()
        ) {
            scoreMessage +=
                ` | Bi-Monthly Quiz Score is: ` +
                leaderboardsCurrentTime[i].Score
        }
    }

    if (!scoreFound) {
        scoreMessage = `No score found for user: ${user}`
    }

    SendMessage("!quizscore", scoreMessage)
}

function UpdateQuizScore(users: string[], pointsChange: number) {

    users.forEach(user => {
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
            leaderboardsCurrentTime.push({ Username: user, Score: pointsChange })
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
