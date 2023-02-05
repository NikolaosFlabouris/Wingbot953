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
const leaderboardsFilePath = "./Data/"
const leaderboardsAllTimeFileName = "QuizLeaderboards.json"
const leaderboardsCurrentTimeFileName = "2023JanFeb-QuizLeaderboards.json"

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
        ].Answers.findIndex((element) => {
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
        ].Answers.findIndex((element) => {
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

const halo1Questions = [
    {
        Question: "What year was Halo: CE released on the Xbox?",
        Answers: ["2001"],
    },
    {
        Question: "What year was Halo: CE Anniversary released on the Xbox 360?",
        Answers: ["2011"],
    },
    {
        Question: "Which Halo ring is discovered at the start of Halo CE?",
        Answers: [
            "Installation 04",
            "Alpha Halo",
            "Alpha",
            "Installation 4",
            "04",
            "4",
        ],
    },
    {
        Question: "On which level can the Megg Easter Egg be found?",
        Answers: ["Pillar of Autumn", "the Pillar of Autumn", "PoA"],
    },
    {
        Question: "Carol Rawley is better known by what call sign?",
        Answers: ["Foe Hammer", "FoeHammer", "Foe-Hammer"],
    },
    {
        Question:
            "Which is the only level where a player cannot use the Magnum?",
        Answers: [
            "The Truth and Reconciliation",
            "Truth and Reconciliation",
            "TNR",
        ],
    },
    {
        Question:
            "Which is the only weapon or vehicle missing from the mission Assault on the Control Room?",
        Answers: ["Shotgun"],
    },
    {
        Question:
            "Which is the only level to feature a drivable Scorpion tank?",
        Answers: ["Assault on the Control Room", "AotCR"],
    },
    {
        Question:
            "In Halo: CE the Siege of Madrigal Easter Egg is found on which level?",
        Answers: ["Assault on the Control Room", "AotCR"],
    },
    {
        Question:
            "How many Hunters are there in the mission Assault on the Control Room?",
        Answers: ["20", "twenty"],
    },
    {
        Question:
            "How many Hunters are there in all of Halo: CE?",
        Answers: ["47"],
    },
    {
        Question:
            "During the 'Warthog Run' on The Maw on the Legendary difficulty, how many minutes until the fusion drives detonate?",
        Answers: ["5 minutes", "5 mins", "5mins", "5min", "5 min", "5", "five"],
    },
    {
        Question:
            "What is the name of the grunt found at the very end of the level The Maw?",
        Answers: ["Thirsty Grunt", "Thirsty"],
    },
    {
        Question:
            "What is the name of the Skull which removes one element of the HUD every respawn?",
        Answers: ["Malfunction"],
    },
    {
        Question:
            "What is the name of the Skull which makes every shot use two rounds?",
        Answers: ["Recession"],
    },
    {
        Question:
            "What is the name of the Skull which disables auto-aim?",
        Answers: ["Eye Patch"],
    },
    {
        Question:
            "What is the name of the Skull which makes enemies drop plasma grenades with each melee?",
        Answers: ["Piñata", "Pinata"],
    },
    {
        Question:
            "What is the name of the Skull which makes Grunts explode when killed?",
        Answers: ["Grunt Funeral"],
    },
    {
        Question:
            "What 3 letters are written on the underside of Master Chief's boot?",
        Answers: ["MRL"],
    },
    {
        Question:
            "How many Skulls launched with the original version of Halo: CE?",
        Answers: ["0", "Zero"],
    },
    // Achievements
    {
        Question:
            "What is the name of the MCC Achievement for completing Halo: CE on Legendary in under 3hrs?",
        Answers: ["Goat Roped", "Goatroped"],
    },
    {
        Question:
            "The 'How Pedestrian' Achievement is awarded upon completing which mission without entering a vehicle?",
        Answers: ["Halo"],
    },
    {
        Question:
            "The 'Pacifist' Achievement is awarded upon completing which mission without shooting, grenades, melee, dying or restarting?",
        Answers: ["The Silent Cartographer", "Silent Cartographer", "SC"],
    },
    {
        Question:
            `The "Would It've Killed You To Take The Elevator" Achievement is awarded when the player beats the Par Time on which level?`,
        Answers: ["Assault on the Control Room", "AotCR"],
    },
    {
        Question:
            `The "TLDR" Achievement is awarded when the player beats the Par Time on which level?`,
        Answers: ["The Library", "Library"],
    },
    {
        Question:
            `The "That Just Happened" Achievement is awarded when the player beats which level on Heroic or Legendary deathless?`,
        Answers: ["The Library", "Library"],
    },
    {
        Question:
            `The "Scurty Bump" Achievement is awarded when the player beats the Par Time on which level?`,
        Answers: ["Keyes"],
    },
    {
        Question:
            `The "Tying Up Loose Ends" Achievement is awarded when the player kills every Elite on Heroic or Legendary on which level?`,
        Answers: ["Keyes"],
    },
    {
        Question:
            `The "All You Can Eat" Achievement is awarded when the player beats the Par Time on which level?`,
        Answers: ["The Maw", "Maw"],
    },
    {
        Question:
            `The "Back In the Day" Achievement was originally awarded when the player played a Capture the Flag game with 4-player splitscreen on which map?`,
        Answers: ["Blood Gulch"],
    },
    // Quotes
    {
        Question: `Complete this quote (4 words): "Cortana, all I need to know is ___ ___ ___ ___?"`,
        Answers: ["did we lose them", "did we lose them?"],
    },
    {
        Question: `Complete this quote (5 words): "This cave ____ ____ ____ ____ ____."`,
        Answers: ["is not a natural formation"],
    },
    {
        Question: `Complete this quote (4 words): "The Corps issued me ___ ___, ___ ___."`,
        Answers: ["a rifle, not wings", "a rifle not wings"],
    },
    {
        Question: `Complete this quote (2 words): "You know our motto: ___ ___."`,
        Answers: ["We Deliver"],
    },
    {
        Question: `Complete this quote (2 words): "Greetings. I am the Monitor of Installation 04. I am ___ ___ ___."`,
        Answers: ["343 Guilty Spark"],
    },
    {
        Question: `Complete this quote (2 words): "Halo doesn't kill Flood, it kills ___ ___.`,
        Answers: ["their food"],
    },
    {
        Question: `Complete this quote (2 words): "This is it, baby. ___ ___.`,
        Answers: ["Hold me"],
    },
    {
        Question: `Who says the following quote: "Sir! The Captain needs you on the bridge, ASAP! You better follow me."`,
        Answers: [
            "Chips Dubbo",
            "Chips",
            "Chipps Dubbo",
            "Chipps Dubo",
            "Chips Dubo",
        ],
    },
    {
        Question: `Who says the following quote: "Don't let them lock the doors!"`,
        Answers: ["Cortana"],
    },
    {
        Question: `Who says the following quote: "You may now retrieve the Index."`,
        Answers: ["343 Guilty Spark", "343GS", "Guilty Spark"],
    },
    {
        Question: `Who says the following quote: "No... I think we're just getting started."`,
        Answers: ["Master Chief", "Chief", "John-117", "John", "John 117"],
    },
    // Multiplayer
    {
        Question: `How many multiplayer maps launched with Halo: CE?`,
        Answers: ["13", "Thirteen"],
    },
    {
        Question: `How many sets of two-way teleporters are there on the Multiplayer map Chiron TL-34?`,
        Answers: ["15", "Fifteen"],
    },
    {
        Question: `The "DMM 2003" Easter Egg is found on which Multiplayer map?`,
        Answers: ["Timberland"],
    },
]

const halo2Questions = [
    {
        Question: "What year was Halo 2 released on the Xbox?",
        Answers: ["2004"],
    },
    {
        Question:
            'Who made the following quote about Halo 2? "Halo 2 is a lot like Halo 1, only it\'s Halo 1 on fire, going 130 miles per hour through a hospital zone, being chased by helicopters and ninjas. And, the ninjas are all on fire, too."',
        Answers: ["Jason Jones", "Jones"],
    },
    {
        Question: "Which Halo ring is seen during the Halo 2 Campaign?",
        Answers: [
            "Installation 05",
            "Delta Halo",
            "Delta",
            "Installation 5",
            "05",
            "5",
        ],
    },
    {
        Question: `The "HI BEN" Easter Egg is found on which level?`,
        Answers: ["Regret"],
    },
    {
        Question: `How many terminals are there in Halo 2: Anniversary?`,
        Answers: ["15", "Fifteen"],
    },
    {
        Question: `How many dolls are there in Halo 2: Anniversary?`,
        Answers: ["8", "Eight"],
    },
    {
        Question: `How many Jackal Snipers are there in level Outskirts?`,
        Answers: ["22", "twenty-two", "twenty two"],
    },
    {
        Question: `In how many missions can the Master Chief drive a vehicle?`,
        Answers: ["3", "Three"],
    },
    {
        Question: `Upon picking up the IWHBYD Skull the player must fight how a total of how many Elites?`,
        Answers: ["28", "twenty-eight", "twenty eight"],
    },
    {
        Question: `What does Tartarus brand the Arbiter with?`,
        Answers: ["the Mark of Shame", "Mark of Shame"],
    },
    {
        Question: `How many waves of attacks are required to kill Regret on the Legendary difficulty?`,
        Answers: ["5", "Five"],
    },
    {
        Question: `What weapon drops from the Prophet of Regret after his death?`,
        Answers: ["Plasma Pistol"],
    },
    {
        Question: `Only on which level can Jackals be found as allies?`,
        Answers: ["Sacred Icon", "SI"],
    },
    {
        Question: `On the mission Quarantine Zone a Sentinel can be found wielding not a Sentinel beam but which weapon?`,
        Answers: ["Needler"],
    },
    {
        Question: `By distance from start to end, which is the longest level?`,
        Answers: ["Quarantine Zone", "QZ"],
    },
    {
        Question: `How many Hunters are there in the level Gravemind?`,
        Answers: ["8", "eight"],
    },
    {
        Question: `In which level does Master Chief fight the flood?`,
        Answers: ["High Charity", "HC"],
    },
    {
        Question: `Two Sergeants are with Johnson during the events of The Great Journey, one is Sergeant Banks, who is the other?`,
        Answers: ["Sergeant Stacker", "Stacker"],
    },
    {
        Question: `How many Halo 2 levels feature endless enemy spawns?`,
        Answers: ["8", "Eight"],
    },
    {
        Question: `Name a level which feature a ladder?`,
        Answers: [
            "Outskirts, Metropolis, High Charity",
            "Metropolis",
            "Metro",
            "High Charity",
            "HC",
            "Outskirts",
        ],
    },
    // Achievements
    {
        Question:
            "What is the name of the MCC Achievement for completing Halo 2 on Legendary in under 3hrs?",
        Answers: ["Monopolized", "Monopolised"],
    },
    {
        Question: `The "Betcha can't stick it" achievement is awarded once the player sticks a Stealth Elite with a plasma grenade on which level?`,
        Answers: ["Outskirts"],
    },
    {
        Question: "On what level can you find a large soccer ball?",
        Answers: ["Metropolis", "Metro"],
    },
    {
        Question: `The "YOLO Strats" achievement is awarded once the player beats the par time on which level?`,
        Answers: ["The Arbiter", "Arbiter"],
    },
    {
        Question: `The "Needs More Whammy Bar" achievement is awarded once the player beats the mission Regret with which skull active?`,
        Answers: ["Prophet Birthday Skull", "Prophet Birthday", "Prophets Birthday Skull"],
    },
    // Characters
    {
        Question: `What is the name of the Arbiter in Halo 2?`,
        Answers: ["Thel 'Vadam", "Thel Vadam", "Thel 'Vadamee", "Thel Vadamee"],
    },
    {
        Question: `Who voices the Arbiter?`,
        Answers: ["Keith David"],
    },
    {
        Question: `Rtas 'Vadumee is given what nickname?`,
        Answers: ["Half-Jaw", "Half Jaw", "Halfjaw"],
    },
    {
        Question: `The Cowardly Grunt is found on which level?`,
        Answers: ["Uprising"],
    },
    {
        Question: `Which member of the UNSC speaks in Halo 2:Anniversary part of The Heretic cutscene?`,
        Answers: ["Locke", "Jameson Locke", "Spartan Locke"],
    },
    {
        Question: `Who is the monitor of Installation 05?`,
        Answers: ["2401 Penitent Tangent", "Penitent Tangent"],
    },
    // Weapons
    {
        Question: `What is the name of Tartarus' Hammer?`,
        Answers: ["Fist of Rukt"],
    },
    {
        Question: `What is the name of the hidden Easter Egg weapon on Metropolis?`,
        Answers: ["Scarab Gun", "the Scarab Gun"],
    },
    {
        Question: `What is the name of the Easter Egg Energy Sword found on the mission Outskirts?`,
        Answers: ["Rex Sword", "Rex", "Excalibur"],
    },
    {
        Question: `In which Halo 2 level can you find Elites wielding Plasma Pistols?`,
        Answers: ["Cairo Station", "Cairo"],
    },
    // Vehicles/Location
    {
        Question: `What is the name of the Forerunner ship that Master Chief travels back to Earth on?`,
        Answers: [
            "Dreadnought/Anodyne Spirit",
            "Dreadnought",
            "Anodyne Spirit",
            "Forerunner Dreadnought",
        ],
    },
    {
        Question: `What is the name of the hotel found in the mission Outskirts?`,
        Answers: ["Hotel Zanzibar", "Zanzibar"],
    },
    {
        Question: `What is the name of the vehicle only found on the mission Outskirts?`,
        Answers: ["Shadow", "Ruwaa-pattern Shadow"],
    },
    {
        Question: `How many Shadows can be found on the mission Outskirts?`,
        Answers: ["7", "Seven"],
    },
    {
        Question: `The first instance in the franchise of the Gauss Hog is on which Halo 2 level?`,
        Answers: ["Metropolis", "Metro"],
    },
    {
        Question: `The Forerunner Gas mine set in the levels The Arbiter and The Oracle is mining gas from which planet?`,
        Answers: ["Threshold", "Soell VII", "Soell"],
    },
    {
        Question: `In which level can you drive a UNSC vehicle as the Arbiter?`,
        Answers: ["Quarantine Zone", "QZ"],
    },
    {
        Question: `The Spectre is a usable vehicle in how many levels?`,
        Answers: ["3"],
    },
    // Quotes
    {
        Question: `Complete this quote (6 words): "When you first saw Halo, ___ ___ ___ ___ ___ ___?"`,
        Answers: ["were you blinded by its majesty"],
    },
    {
        Question: `Complete this quote (7 words): "Well, ___ ___ ___ ___ ___ ___ ___"`,
        Answers: ["I guess it was all obsolete anyway"],
    },
    {
        Question: `Complete this quote (2 words): "Alert! ___ ___!"`,
        Answers: ["Boarders inbound"],
    },
    {
        Question: `Complete this quote (1 word): "Come on, is that a weapon or a _____?"`,
        Answers: ["flashlight"],
    },
    {
        Question: `Complete this quote (2 words): "For a brick... ___ ___ ___ ___!"`,
        Answers: ["he flew pretty good"],
    },
    {
        Question: `Complete this quote (1 word): "Could we possibly make any more ____?!"`,
        Answers: ["noise"],
    },
    {
        Question: `Complete this quote (4 words): "I...? I am a monument ___ ___ ___ ___."`,
        Answers: ["to all your sins"],
    },
    {
        Question: `Complete this quote (4 words): "Take ___ ___ ___."`,
        Answers: ["my banshee Arbiter"],
    },
    {
        Question: `Complete this quote (4 words): "Sir. ___ ___ ___."`,
        Answers: ["Finishing this fight"],
    },
    {
        Question: `Who says the following quote: "When you first saw Halo, were you blinded by its majesty?"`,
        Answers: ["Prophet of Regret", "Regret"],
    },
    {
        Question: `Who says the following quote: "Would it help if I said 'Please'?"`,
        Answers: [
            "Sergeant Avery Johnson",
            "Sergeant Johnson",
            "Avery Johnson",
            "Johnson",
            "Sgt Johnson",
        ],
    },
    {
        Question: `Who says the following quote: "If they came to hear me beg, they will be disappointed."`,
        Answers: [
            "the Arbiter",
            "Arbiter",
            "Thel 'Vadamee",
            "Thel 'Vadam",
            "Thel Vadamee",
            "Thel Vadam",
        ],
    },
    {
        Question: `Who says the following quote: "When I joined the Corps, we didn't have any fancy-shmancy tanks. We had sticks! Two sticks, and a rock for the whole platoon - and we had to share the rock! Buck up, boy, you're one very lucky Marine!"`,
        Answers: [
            "Sergeant Avery Johnson",
            "Sergeant Johnson",
            "Avery Johnson",
            "Johnson",
            "Sgt Johnson",
        ],
    },
    {
        Question: `Who says the following quote: "The tasks you must undertake as the Arbiter are perilous, suicidal. You will die, as each Arbiter has before you. The Council will have their corpse."`,
        Answers: ["Prophet of Mercy", "Mercy"],
    },
    {
        Question: `Who says the following quote: "We are the arm of the Prophets, Arbiter, and you are the blade. Be silent and swift, and we shall quell this heresy without incident."`,
        Answers: [
            "Half-Jaw",
            "Half Jaw",
            "Halfjaw",
            "Rtas 'Vadumee",
            "Rtas Vadumee",
            "Rtas 'Vadum",
            "Rtas Vadum",
        ],
    },
    {
        Question: `Who says the following quote: "That... is another Halo."`,
        Answers: ["Cortana"],
    },
    {
        Question: `Who says the following quote: "Whoa...it's like a postcard! 'Dear Sarge: kicking ass in outer space, wish you were here.'"`,
        Answers: [
            "Chips Dubbo",
            "Chips",
            "Chipps Dubbo",
            "Chipps Dubo",
            "Chips Dubo",
        ],
    },
    {
        Question: `Who says the following quote: "Forward, warriors! And fear not pain nor death."`,
        Answers: [
            "Half-Jaw",
            "Half Jaw",
            "Halfjaw",
            "Rtas 'Vadumee",
            "Rtas Vadumee",
            "Rtas 'Vadum",
            "Rtas Vadum",
        ],
    },
    {
        Question: `Who says the following quote: "By the rings, Arbiter!?"`,
        Answers: [
            "Half-Jaw",
            "Half Jaw",
            "Halfjaw",
            "Rtas 'Vadumee",
            "Rtas Vadumee",
            "Rtas 'Vadum",
            "Rtas Vadum",
        ],
    },
    {
        Question: `Who says the following quote: "Fool. They ordered me to do it."`,
        Answers: ["Tartarus"],
    },
    {
        Question: `Who says the following quote: "Fate had us meet as foes, but this ring will make us brothers."`,
        Answers: ["Gravemind", "the Gravemind"],
    },
    {
        Question: `Who says the following quote: "Boo."`,
        Answers: ["Master Chief", "Chief", "John-117", "John", "John 117"],
    },
    {
        Question: `Who says the following quote: "There are those who said this day would never come. What have they to say now?"`,
        Answers: ["Prophet of Truth", "Truth"],
    },
    // Multiplayer
    {
        Question: `Including DLC, how many Halo 2 Multiplayer maps are there for the original version of the game?"`,
        Answers: ["23", "twenty-three", "twenty three"],
    },
    {
        Question: `What was the name of Martin O'Donnell's sound studio at Bungie?`,
        Answers: ["Ivory Tower"],
    },
    {
        Question: `The words "Why am I here" can be found on which Halo 2 Multiplayer map?`,
        Answers: ["Beaver Creek"],
    },
    {
        Question: `Rooster Teeth logos can be found on which Multiplayer map?`,
        Answers: ["Turf"],
    },
    {
        Question: `What Halo 2 map is the only map to feature 8 territory locations?`,
        Answers: ["Tombstone"],
    },
    {
        Question: `Name one of the two multiplayer maps that were only included with Halo 2 Vista.`,
        Answers: ["District, Uplift", "District", "Uplift"],
    },
]

const halo3Questions = [
    {
        Question: "What year was Halo 3 released on the Xbox 360?",
        Answers: ["2007"],
    },
    {
        Question:
            "When carrying over a Skull from Tsavo Highway to The Storm, which weapon is given to the player in place of the skull?",
        Answers: ["Plasma Pistol"],
    },
    {
        Question:
            "When carrying over a Skull from Cortana to Halo, which weapon is given to the player in place of the skull?",
        Answers: ["Spartan Laser", "Laser"],
    },
    {
        Question:
            "The mission Sierra 117 takes place on the slopes of which mountain?",
        Answers: [
            "Mount Kilimanjaro",
            "Kilimanjaro",
            "Mt Kilimanjaro",
            "Mt. Kilimanjaro",
            "Shira Peak",
        ],
    },
    {
        Question: "Nathan Fillion voices which character in Halo 3?",
        Answers: ["Gunnery Sergeant Reynolds", "Reynolds", "Sergeant Reynolds"],
    },
    {
        Question:
            "The Caveman Easter Egg is a series of ape-like figures bearing a face resembling who?",
        Answers: ["Marcus Lehto", "Lehto"],
    },
    {
        Question:
            "In Halo 3, what is the only level in which the player does not start with a weapon?",
        Answers: ["Crows Nest", "Crows"],
    },
    {
        Question: "In which Halo 3 level is the Arbiter never seen?",
        Answers: ["Tsavo Highway", "Tsavo"],
    },
    {
        Question: "What is the name of the only grunt found on the level Halo?",
        Answers: [
            "Final Grunt",
            "jerk store Grunt",
            "Seinfeld Grunt",
            "Final",
            "jerk store",
            "Seinfeld",
        ],
    },
    {
        Question:
            "An internal Halo 3 build released to Microsoft employees in August 2007 was given what name?",
        Answers: ["Halo 3 Epsilon", "Epsilon", "H3 Epsilon"],
    },
    {
        Question: "The mission The Storm is set in which city?",
        Answers: ["Voi"],
    },
    {
        Question: "On what mission does the player defeat Cethegus?",
        Answers: ["The Ark", "Ark"],
    },
    {
        Question: "The Microsoft Sam Easter Egg is found on which level?",
        Answers: ["The Covenant", "Covenant", "Covie"],
    },
    {
        Question: "The Siege of Madrigal Easter Egg is found on which level?",
        Answers: ["The Covenant", "Covenant", "Covie"],
    },
    {
        Question:
            "The Warthog, Ghost and which other vehicle can be driven on the mission Halo?",
        Answers: ["Mongoose", "Goose"],
    },
    {
        Question:
            "The Password-lacking Marine Easter Egg is found on which level?",
        Answers: ["Crows Nest", "Crows"],
    },
    {
        Question: "How many terminals are the in the Halo 3 campaign?",
        Answers: ["7", "seven"],
    },
    {
        Question:
            "How many Cortana/Gravemind 'slowdown' moments are there in the Halo 3 campaign?",
        Answers: ["24"],
    },
    {
        Question:
            "How many Skulls were included in the original release of Halo 3?",
        Answers: ["13", "Thirteen"],
    },
    {
        Question: "How many unique pieces of Equipment are there in Halo 3?",
        Answers: ["11", "Eleven"],
    },
    {
        Question:
            "Which Covenant vehicle did not return to the series after it's inclusion in Halo 3?",
        Answers: ["Prowler"],
    },
    {
        Question:
            "What was the name of the Halo 3 Multiplayer disc included alongside Halo 3:ODST?",
        Answers: [
            "Halo 3: Mythic",
            "Halo 3 Mythic",
            "H3 Mythic",
            "Halo 3:Mythic",
        ],
    },
    {
        Question:
            "Access to the Halo 3 Beta was granted through purchase of specially marked copies of which video game?",
        Answers: ["Crackdown"],
    },
    {
        Question:
            "What is the name given to the set of 3 promotional live-action shorts released prior to the launch of Halo 3?",
        Answers: ["Halo: Landfall", "Halo Landfall", "Landfall"],
    },
    // Music
    {
        Question:
            "What is the name of the music track that plays when the player faces 2 Scarabs on the mission The Covenant?",
        Answers: ["One Final Effort"],
    },
    // Achievements
    {
        Question: "How many achievements launched with Halo 3?",
        Answers: ["49"],
    },
    {
        Question:
            "The Vidmaster Challenge: Annual required all 4 co-op players to be in what vehicle at the end of the mission Halo?",
        Answers: ["Ghost", "Ghosts"],
    },
    {
        Question:
            "Completing the Vidmaster Challenges unlocked what multiplayer armour piece?",
        Answers: ["Recon Helmet", "Recon", "Recon Armour", "Recon Armor"],
    },
    {
        Question: `The MCC achievement "Can't Keep Him Down" requires the player to fight alongside which character?`,
        Answers: [
            "Chips Dubbo",
            "Chips",
            "Chipps Dubbo",
            "Chipps Dubo",
            "Chips Dubo",
        ],
    },
    // Quotes
    {
        Question: `On what mission is the following quote said: "What's that sound?"`,
        Answers: ["The Storm", "Storm"],
    },
    {
        Question:
            'Who says the following quote: "They let me pick. Did I ever tell you that? Choose whichever Spartan I wanted."',
        Answers: ["Cortana"],
    },
    {
        Question:
            'Who says the following quote: "This place will become your tomb."',
        Answers: ["Cortana"],
    },
    {
        Question: 'Who says the following quote: "Were it so easy."',
        Answers: [
            "the Arbiter",
            "Arbiter",
            "Thel 'Vadamee",
            "Thel 'Vadam",
            "Thel Vadamee",
            "Thel Vadam",
        ],
    },
    {
        Question: `Who says the following quote: "First Squad, you're my scouts. Move out! Quiet as you can."`,
        Answers: [
            "Sergeant Avery Johnson",
            "Sergeant Johnson",
            "Avery Johnson",
            "Johnson",
            "Sgt Johnson",
        ],
    },
    {
        Question: `Who says the following quote: "Do you or do you not want to finish the fight?"`,
        Answers: [
            "Sergeant Avery Johnson",
            "Sergeant Johnson",
            "Avery Johnson",
            "Johnson",
            "Sgt Johnson",
        ],
    },
    {
        Question: `Who says the following quote: "Marines? The Prophet of Truth doesn't know it yet, but he's about to get kicked right off his throne. We will take our city back. And drive our enemy into the grave they've been so happily digging. One final effort is all that remains."`,
        Answers: ["Lord Hood", "Hood", "Terrance Hood"],
    },
    {
        Question: `Who says the following quote: "Chief! Hood's ships are closing fast! Destroy that gun; we're out of time."`,
        Answers: ["Miranda Keyes", "Miranda", "Keyes"],
    },
    {
        Question: `Who says the following quote: "Worse."`,
        Answers: ["Master Chief", "Chief", "John-117", "John", "John 117"],
    },
    {
        Question: `Who says the following quote: "Hail, humans, and take heed."`,
        Answers: [
            "Shipmaster Rtas 'Vadum",
            "Shipmaster",
            "Half-Jaw",
            "Half Jaw",
            "Halfjaw",
            "Rtas 'Vadumee",
            "Rtas Vadumee",
            "Rtas 'Vadum",
            "Rtas Vadum",
        ],
    },
    {
        Question: `Who says the following quote: "You were weak. And gods must be strong."`,
        Answers: ["Prophet of Truth", "Truth"],
    },
    {
        Question: `Who says the following quote: "Thought I'd try shooting my way out - mix things up a little."`,
        Answers: ["Master Chief", "Chief", "John-117", "John", "John 117"],
    },
    {
        Question: `Who says the following quote: "Protocol dictates action! I see now that helping you was wrong!"`,
        Answers: ["343 Guilty Spark", "Guilty Spark"],
    },
    {
        Question: `Complete this quote (3 words): "Banshees! ___ ___ ___!"`,
        Answers: ["Fast and low"],
    },
    {
        Question: `Complete this quote (1 word): "To ___."`,
        Answers: ["war"],
    },
    {
        Question: `Complete this quote (1 word): "Ma'am, I've got ____. Above and below."`,
        Answers: ["movement"],
    },
    {
        Question: `Complete this quote (2 words): "There's something in the crater, Ma'am. Something beneath ___ ___."`,
        Answers: ["the storm"],
    },
    {
        Question: `Complete this quote (2 words): "___ ___, my brothers! Only our enemies should fear this raging storm!"`,
        Answers: ["Take heart", "They cough"],
    },
    {
        Question: `Complete this quote (3 words): "Wretched parasite! Rise up and I will kill you! ___ ___ ___!"`,
        Answers: ["Again and again", "Again and again!"],
    },
    {
        Question: `Complete this quote (1 word): "Tank beats ___!"`,
        Answers: ["Ghost/Hunter/Everything", "ghost", "hunter", "everything"],
    },
    {
        Question: `Complete this quote (2 words): "I count ___ ___! Repeat: ___ ___!"`,
        Answers: ["two Scarabs", "2 scarabs"],
    },
    {
        Question: `Complete this quote (3 words): "A collection of lies; that's all I am! Stolen ___ ___ ___!"`,
        Answers: ["thoughts and memories"],
    },
    {
        Question: `Complete this quote (3 words): "Send me out ___ ___ ___"`,
        Answers: ["with a bang"],
    },
    // Multiplayer
    {
        Question: "What is the name of the max rank in Halo 3 Multiplayer?",
        Answers: ["5 Star General", "General"],
    },
    {
        Question:
            "In Halo 3 Multiplayer what medal is awarded when the player wins by atleast 20 kills?",
        Answers: ["Steaktacular"],
    },
    {
        Question:
            "In Halo 3 Multiplayer what medal is awarded when the player seizes control of an enemy aircraft?",
        Answers: ["Skyjacker", "Skyjack"],
    },
    {
        Question:
            "In Halo 3 Multiplayer what medal is awarded when the player kills the last alive player on the opposing team with at least an Overkill?",
        Answers: ["Extermination"],
    },
    {
        Question:
            "The vehicle the 'Elephant' was initially only found on which Halo 3 multiplayer map?",
        Answers: ["Sandtrap", "Sand Trap"],
    },
    {
        Question: `Halo 2's multiplayer map 'Zanzibar' was remade and given what name in Halo 3 Multiplayer?`,
        Answers: ["Last Resort"],
    },
]

const odstQuestions = [
    {
        Question: "Oni",
        Answers: ["Pog"],
    },
    {
        Question:
            "When watching Adversary and Heroic_Robb streams, Wingman953 coined what term?",
        Answers: ["Oni Pog", "onipog"],
    },
    // Characters
    // {
    //     Question:
    //         "During the events of Halo 3:ODST what is Buck's military rank?",
    //     Answers: ["Gunnery Sergeant"],
    // },
    {
        Question: "On what planet was Buck born?",
        Answers: ["Draco III", "Draco", "Draco 3"],
    },
    {
        Question: "On what planet was Dutch born?",
        Answers: ["Mars"],
    },
    {
        Question: "Who does Dutch marry?",
        Answers: ["Gretchen Ketola", "Gretchen"],
    },
    {
        Question: "On what planet was Romeo born?",
        Answers: ["Madrigal"],
    },
    {
        Question: "Where was Mickey born?",
        Answers: ["Luna"],
    },
    {
        Question: "Where was The Rookie born?",
        Answers: ["Luna"],
    },
    {
        Question: "What is The Rookie's name?",
        Answers: ["Jonathan Doherty"],
    },
    {
        Question: "Who killed The Rookie?",
        Answers: ["Captain Ingridson", "Ingridson"],
    },
    // {
    //     Question: "What is Dare's middle name?",
    //     Answers: ["Ann"],
    // },
    {
        Question: "What is Dutch's name?",
        Answers: [
            "Taylor Miles",
            "Corporal Taylor Miles",
            "Taylor Henry Miles",
            "Corporal Taylor Henry Miles",
        ],
    },
    // {
    //     Question:
    //         "During the events of Halo 3:ODST what is Dutch's military rank?",
    //     Answers: ["Corporal"],
    // },
    {
        Question: "What is Mickey's name?",
        Answers: ["Michael Crespo", "Private First Class Michael Crespo"],
    },
    // {
    //     Question:
    //         "During the events of Halo 3:ODST what is Mickey's military rank?",
    //     Answers: ["Private First Class"],
    // },
    {
        Question: "What is Romeo's name?",
        Answers: ["Kojo Agu", "Lance Corporal Kojo Agu"],
    },
    // {
    //     Question:
    //         "During the events of Halo 3:ODST what is Romeo's military rank?",
    //     Answers: ["Lance Corporal"],
    // },
    {
        Question:
            "What is the full name of the engineer that goes by 'Virgil'?",
        Answers: ["Quick to Adjust"],
    },
    {
        Question: "What was the name of the ODST Fireteam in Halo 3:ODST?",
        Answers: ["Alpha-9", "Alpha 9", "Alpha Nine", "Alpha-Nine"],
    },
    {
        Question: "Who is the voice actor for Buck?",
        Answers: ["Nathan Fillion"],
    },
    {
        Question: "Who is the voice actress for Dare?",
        Answers: ["Tricia Helfer", "Helfer"],
    },
    {
        Question: "Who is the voice actor for Dutch?",
        Answers: ["Adam Baldwin", "Baldwin"],
    },
    {
        Question: "Who is the voice actor for Mickey?",
        Answers: ["Alan Tudyk", "Tudyk"],
    },
    {
        Question: "Who is the voice actor for Romeo?",
        Answers: ["Nolan North"],
    },
    {
        Question: "Who is the voice actor for the Superintendent?",
        Answers: ["Joseph Staten", "Staten"],
    },
    {
        Question: "What is The Rookie's signature weapon?",
        Answers: ["Silence SMG", "SMG"],
    },
    {
        Question: "What is Buck's signature weapon?",
        Answers: ["Assault Rifle", "AR"],
    },
    {
        Question: "What is Dutch's signature weapon?",
        Answers: ["Spartan Laser", "Laser"],
    },
    {
        Question: "What is Mickey's signature weapon?",
        Answers: ["Rocket Launcher", "Rocket", "Rockets"],
    },
    {
        Question: "What is Romeo's signature weapon?",
        Answers: ["Sniper Rifle", "Sniper"],
    },
    {
        Question: "What is Dare's signature weapon?",
        Answers: ["Automag", "Pistol"],
    },
    {
        Question: "The in-game audio logs tell the story of which young lady?",
        Answers: ["Sadie Endesha", "Sadie"],
    },
    // {
    //     Question:
    //         "In pounds (lb), how heavy is Jonas the Butcher from the audio log story?",
    //     Answers: ["800lbs", "800", "800 lbs", "800lb", "800 lb", "800 pounds"],
    // },
    {
        Question:
            "In the audio log story, what food is Jonas the Butcher handing out for free?",
        Answers: ["Kebab", "Kebabs"],
    },
    // Weapons, vehicles, equipment
    {
        Question:
            "What is the name of the type of garbage trucks that operate in New Mombasa?",
        Answers: ["Olifant", "Olifants"],
    },
    {
        Question: "A Silenced SMG with full ammo has how many bullets?",
        Answers: ["240", "two hundred and forty"],
    },
    {
        Question: "An Automag with full ammo has how many bullets?",
        Answers: ["72", "seventy-two", "seventytwo", "seventy two"],
    },
    {
        Question: "What does VISR stand for?",
        Answers: [
            "Visual Intelligence System, Reconnaissance",
            "Visual Intelligence System Reconnaissance",
        ],
    },
    // Lore/World Building/Meta-trivia
    {
        Question: "What year was Halo 3:ODST released on the Xbox 360?",
        Answers: ["2009"],
    },
    {
        Question:
            "What was the name originally given to game Halo 3:ODST before release?",
        Answers: ["Halo 3:Recon", "Halo 3: Recon", "Halo 3 Recon", "Recon"],
    },
    {
        Question:
            "Which Firefight character was a Halo 3:ODST pre-order bonus?",
        Answers: [
            "Sergeant Major Avery Johnson",
            "Sergeant Johnson",
            "Avery Johnson",
            "Johnson",
        ],
    },
    {
        Question:
            "Nathan Fillion (voice of Buck) and Tricia Helfer (voice of Dare) both star in a TV series called what?",
        Answers: ["The Rookie"], //The Rookie (Season 4, Episode 2) https://youtu.be/bHmRHWdnKP0
    },
    {
        Question: "What is the alternative name for the Coastal Highway?",
        Answers: ["Waterfront Highway", "the Waterfront Highway"],
    },
    {
        Question:
            "The Covenant refer to Master Chief as the 'Demon', what name do they have for The Rookie and the other ODSTs?",
        Answers: ["Imp", "Imps"],
    },
    // Gameplay
    {
        Question:
            "Which UNSC ship can be seen going through the slipspace rupture in Prepare to Drop?",
        Answers: ["In Amber Clad"],
    },
    {
        Question:
            "The cutscene at the end of Uplift Reserve changes depending if the player is driving a Warthog, a Ghost or which other vehicle?",
        Answers: ["Chopper"],
    },
    {
        Question:
            "Which flashback mission has a different end cutscene when played on the Legendary difficulty?",
        Answers: ["NMPD HQ", "NMPD", "NMPDHQ"],
    },
    {
        Question:
            "How many audio logs are required to alter the events in the mission Data Hive?",
        Answers: ["29", "twenty-nine", "twenty nine", "twentynine"],
    },
    {
        Question:
            "When starting on Open Streets, what is contained with the extra supply cache that is unlocked?",
        Answers: ["Mongoose", "Mongeese", "Mongooses", "a Mongoose"],
    },
    {
        Question:
            "2 skulls where cut from the original release of Halo 3:ODST, one provided a 'directors style' commentary, what did the other skull do?",
        Answers: ["3rd person camera", "third person camera"], //More info here: https://youtu.be/9InGqBDgff8"
    },
    {
        Question:
            "How many skulls launched with the original version of Halo 3:ODST?",
        Answers: ["12", "twelve"],
    },
    {
        Question:
            "Halo 3 launched with 13 skulls, one was removed for the launch of Halo 3:ODST, which skull was removed?",
        Answers: ["Fog"],
    },
    {
        Question:
            "In Halo 3:ODST how many needles are required to supercombine?",
        Answers: ["12", "twelve"],
    },
    {
        Question:
            "On the mission Coastal Highway, The Rookie, Buck, Dare and Virgil hold out for pickup out the front of which facility?",
        Answers: [
            "Uplift Nature Reserve",
            "The Uplift Nature Reserve",
            "Uplift Reserve",
        ],
    },
    {
        Question:
            "On the mission Kikowani Station, on Legendary difficulty, on MCC, what character appears when triggering the sound que?",
        Answers: ["Hamish Beamish", "Beamish"],
    },
    {
        Question: "Which campaign level has the most Hunter spawns?",
        Answers: ["Mombasa Streets", "Streets"],
    },
    {
        Question:
            "How many unique Hunter spawns are there in the ODST campaign?",
        Answers: ["11", "eleven"],
    },
    {
        Question:
            "How many grunts spawn on the first highway section in Coastal Highway?",
        Answers: ["23", "twenty-three", "twentythree", "twenty three"],
    },
    {
        Question: "What word is written by hand on Mickey's helmet?",
        Answers: ["Mickey"],
    },
    // Achievements
    {
        Question:
            "What is the name of the MCC Achievement for completing Halo 3:ODST on Legendary in under 3hrs?",
        Answers: ["Nagato Makes Moving Easy"],
    },
    {
        Question:
            "What is the name of the MCC achievement that requires you to kill a drone with a flame grenade on Data Hive?",
        Answers: ["Firefly"],
    },
    {
        Question:
            "What is the name of the achievement to fly a banshee on Kizingo Blvd.?",
        Answers: ["Shiny...", "Shiny"],
    },
    {
        Question:
            'The MCC achievement "Two Places, Same Time" requires the player to interact with which other character?',
        Answers: [
            "Chips Dubbo",
            "Chips",
            "Chipps Dubbo",
            "Chipps Dubo",
            "Chips Dubo",
        ],
    },
    {
        Question:
            "To help complete the Deja Vu Vidmaster Challenge, players are provided with how much additional rocket ammunition?",
        Answers: ["4004"],
    },
    // Firefight
    {
        Question:
            "What is the name of the Firefight map set in the level Tayari Plaza?",
        Answers: ["Crater", "Crater (Day)", "Crater Day"],
    },
    {
        Question:
            "What is the name of the Firefight map set in the level Uplift Reserve?",
        Answers: ["Lost Platoon"],
    },
    {
        Question:
            "What is the name of the Firefight map set in the level Kizingo Blvd.?",
        Answers: ["Rally Point", "Rally Point (Day)", "Rally Point Day"],
    },
    {
        Question:
            "Alpha Site and which other Firefight map are set in the level ONI Alpha Site?",
        Answers: ["Security Zone"],
    },
    {
        Question:
            "Security Zone and which other Firefight map are set in the level ONI Alpha Site?",
        Answers: ["Alpha Site"],
    },
    {
        Question:
            "What is the name of the Firefight map set in the level NMPD HQ?",
        Answers: ["Windward"],
    },
    {
        Question:
            "What is the name of the Firefight map set in the level Data Hive?",
        Answers: ["Chasm Ten", "Chasm 10"],
    },
    {
        Question:
            "What is the name of the Firefight map set in the level Coastal Highway?",
        Answers: ["Last Exit"],
    },
    {
        Question:
            "The flamethrower and which other UNSC weapon from the campaign do not appear in standard Firefight settings on any map?",
        Answers: ["Assault Rifle", "AR"],
    },
    {
        Question:
            "Which campaign level is not represented with a Firefight map?",
        Answers: ["Kikowani Station", "Kikowani", "Kiko"],
    },
    {
        Question:
            "With standard Firefight settings, which skull is enabled from the start of Round 1?",
        Answers: ["Tough Luck"],
    },
    {
        Question:
            "With standard Firefight settings, which additional skull is enabled from the start of Round 2?",
        Answers: ["Catch"],
    },
    {
        Question:
            "With standard Firefight settings, which additional skull is enabled from the start of Round 3?",
        Answers: ["Black Eye"],
    },
    {
        Question:
            "With standard Firefight settings, which skull is enabled from the start of Set 2?",
        Answers: ["Tilt"],
    },
    {
        Question:
            "With standard Firefight settings, which additional skull is enabled from the start of Set 3?",
        Answers: ["Famine"],
    },
    {
        Question:
            "With standard Firefight settings, which additional skull is enabled from the start of Set 4?",
        Answers: ["Mythic"],
    },
    {
        Question:
            "In the original version of Firefight, which was the only skull that could not be enabled?",
        Answers: ["Thunderstorm"],
    },
    {
        Question:
            "The Vidmaster Challenge: Endure achievement requires 4 players to survive Heroic or Legendary firefight for how many rounds?",
        Answers: ["16", "sixteen"],
    },
    {
        Question:
            "With standard Firefight settings the player spawns with an SMG and an Automag on all maps except for one, which map is this?",
        Answers: ["Windward"],
    },
    // Quotes
    {
        Question:
            'On what mission is the following quote said: "Look out! Chieftain!"',
        Answers: ["NMPD HQ", "NMPD"],
    },
    {
        Question:
            "On what mission is the following quote said: \"Trooper, we're pinned down! Flank through this building, hit 'em from behind!\"",
        Answers: ["Tayari Plaza", "Tayari"],
    },
    {
        Question:
            'On what mission is the following quote said: "Wanna live? Then get your ass out of the street!"',
        Answers: [
            "Kizingo Blvd.",
            "Kizingo",
            "Kizingo Blvd",
            "Kizingo Boulevard",
        ],
    },
    {
        Question:
            "On what mission is the following quote said: \"What are you doing down here, anyway? Don't want to tell me? That's all right...we all have secrets.\"",
        Answers: ["Data Hive"],
    },
    {
        Question:
            'On what mission is the following quote said: "Whew! Lord, that thing stinks. Kinda reminds me of my-"',
        Answers: ["Coastal Highway", "Coastal"],
    },
    {
        Question:
            'Who says the following quote: "You know the music, time to dance."',
        Answers: ["Buck"],
    },
    {
        Question:
            'Who says the following quote: "Your mama never loved ya and she dresses you funny."',
        Answers: ["Mickey"],
    },
    {
        Question:
            'Who says the following quote: "I saw my life flash before me. It sucked."',
        Answers: ["Mickey"],
    },
    {
        Question:
            "Who says the following quote: \"It ain't logical. I mean, hell, I'll kill a man in a fair fight... or if I think he's gonna start a fair fight, or if he bothers me, or if there's a woman... (sniffs) or if I'm gettin' paid - mostly only when I'm gettin' paid.\"",
        Answers: ["Dutch"],
    },
    {
        Question:
            "Who says the following quote: \"Uh, Lord? I didn't train to be a pilot. Tell me I don't have any more flying to do today.\"",
        Answers: ["Dutch"],
    },
    {
        Question:
            'Who says the following quote: "I\'m gonna kill you! With light!"',
        Answers: ["Romeo"],
    },
    {
        Question:
            'Who says the following quote: "We went through hell for that?"',
        Answers: ["Romeo"],
    },
    {
        Question:
            'Who says the following quote: "I recommend trying a lot harder."',
        Answers: ["Dare"],
    },
    {
        Question:
            'Who says the following quote: "Trooper! Over here! I saw your pod hit... You\'re one lucky S.O.B."',
        Answers: [
            "Chips Dubbo",
            "Chips",
            "Chipps Dubbo",
            "Chipps Dubo",
            "Chips Dubo",
        ],
    },
    {
        Question: `Complete this quote (1 word): "Wake up, _______"`,
        Answers: ["Buttercup"],
    },
    {
        Question: `Complete this quote (2 words): "Got a little _____ _____"`,
        Answers: ["Jackal problem"],
    },
    {
        Question: `Complete this quote (1 word): "Careful. I think you just strained a ______."`,
        Answers: ["metaphor"],
    },
    {
        Question: `Complete this quote (4 words): "I'll draw the turret's fire, ___ ___ ___ ___"`,
        Answers: ["you kill the operator"],
    },
    {
        Question: `Complete this quote (3 words): "Gunny, I can fly a Pelican, ___ ___ ___?"`,
        Answers: ["but a Phantom"],
    },
    {
        Question: `Complete this quote (2 words): "Ah! This is the best ___ ___"`,
        Answers: ["mission ever"],
    },
    {
        Question: `Complete this quote (3 words): "Too busy building ___ ___ ___"`,
        Answers: ["fancy spit house"],
    },
    {
        Question: `Complete this quote (3 words): "No time to explain but do not, I repeat, do not ____ ____ ____"`,
        Answers: ["shoot anything pink"],
    },
    // Other/General
    {
        Question:
            "References to which game were removed in the re-release of Halo 3:ODST on Halo: The Master Chief Collection?",
        Answers: ["Destiny"],
    },
    {
        Question:
            "The Prepare to Drop cutscenes occurs inside which UNSC ship?",
        Answers: ["UNSC Say My Name", "Say My Name"],
    },
]

const reachQuestions = [
    {
        Question: "What year was Halo: Reach released on the Xbox 360?",
        Answers: ["2010"],
    },
    {
        Question:
            "What is the name of the MCC Achievement for completing Halo: Reach on Legendary in under 3hrs?",
        Answers: ["Keep Your Foot on the Pedrogas"],
    },
    {
        Question: `The "KEEP IT CLEAN" Achievement is awarded to the player once they kill 7 what?`,
        Answers: ["Moa", "Moas"],
    },
    {
        Question:
            "What is the name of the achievement for performing an assassination against an Elite to survive a fall that would've been fatal?",
        Answers: ["If They Came to Hear Me Beg"],
    },
    {
        Question:
            "What is the name of the achievement for keeping the Scorpion intact in the mission The Package on Legendary?",
        Answers: ["Tank Beats Everything"],
    },
    {
        Question: `The achievement "An Elegant Weapon" is awarded to the player once they kill 10 enemies with which weapon?`,
        Answers: ["DMR", "Designated Marksman Rifle"],
    },
    {
        Question: `The achievement to "hear a familiar voice on New Alexandria" is awarded when the player hears the voice of which character?`,
        Answers: ["Gunnery Sergeant Buck", "Buck"],
    },
    {
        Question: `The achievement "Collection Eligibility Confirmed" is award once the player sees which character?`,
        Answers: ["Master Chief", "Chief", "John-117", "John", "John 117"],
    },
    {
        Question:
            "In the original version of the game what is the name of the max commendation rank?",
        Answers: ["Onyx", "Onyx Rank"],
    },
    {
        Question:
            "Which Halo: Reach level is the only level in the game to feature the Gauss Warthog.",
        Answers: ["ONI: Sword Base", "Oni Sword Base", "Oni", "Sword Base"],
    },
    {
        Question:
            "Which Halo: Reach level is the only level in the game to feature the Troop Transport Warthog.",
        Answers: ["ONI: Sword Base", "Oni Sword Base", "Oni", "Sword Base"],
    },
    {
        Question:
            "On which mission does your starting ammo change depending on the difficulty?",
        Answers: ["Nightfall"],
    },
    {
        Question:
            "All together, how many Main and Side Objectives are there in the mission New Alexandria?",
        Answers: ["15", "Fifteen"],
    },
    {
        Question:
            "How many cutscenes are there in the mission Long Night of Solace?",
        Answers: ["7", "Seven"],
    },
    {
        Question: "Which Halo: Reach level is the only mission without Elites?",
        Answers: ["Exodus"],
    },
    {
        Question:
            "Instead of a Falcon, the player was original going to be operating which vehicle around the city of New Alexandria?",
        Answers: ["Scarab"],
    },
    {
        Question:
            "In the mission New Alexandria, Club Errera features the same layout as which Firefight map?",
        Answers: ["Crater"],
    },
    {
        Question: `The weapon call The Magnectic Accelerator Cannon or "mass driver" at the end of the mission Pillar of Autumn also goes by which other name?`,
        Answers: ["Onager"],
    },
    {
        Question: "What does BOB stand for?",
        Answers: ["Born on Board"],
    },
    {
        Question: `Complete this quote (1 word): "Damn, __________"`,
        Answers: ["Lieutenant"],
    },
    {
        Question: `Complete this quote (2 words): "Listen up, Noble Team. We're looking at a downed relay outpost, ____ ____ from Visegrad."`,
        Answers: ["fifty klicks", "50 klicks", "50 clicks", "fifty clicks"],
    },
    {
        Question: `Complete this quote (7 words): "Kat, Six: ___ ___ ___ ___ ___ ___ ___, find out what we're dealing with."`,
        Answers: ["push back the attack on Sword Base"],
    },
    {
        Question: `Complete this quote (2 words): "Noble Five, ONI believes those spires to be ______ ______."`,
        Answers: ["teleportation terminals"],
    },
    {
        Question: `Complete this quote (2 words): "Romeo Company, be advised: we have reports of Covenant _____ _____."`,
        Answers: ["suicide squads"],
    },
    {
        Question: `Complete this quote (5 words): "Command: ___ ___ ___ ___ ___ with the 11th ODST, over."`,
        Answers: ["this is Gunnery Sergeant Buck"],
    },
    {
        Question: `Complete this quote (3 words): "Stay low, let me draw the heat. You just ____ ____ ____."`,
        Answers: ["deliver that Package"],
    },
    {
        Question: `Complete this quote (2 words): "You're on your own, Noble... ____ ____."`,
        Answers: ["Carter out"],
    },
    {
        Question: `Who says the following quote: "So, where are all the troopers?"`,
        Answers: ["Jorge"],
    },
    {
        Question: `Who says the following quote: "Is there any place the Covenant isn't?"`,
        Answers: ["Jorge"],
    },
    {
        Question: `Who says the following quote: "Tell 'em to make it count."`,
        Answers: ["Jorge"],
    },
    {
        Question: `Who says the following quote: "Recon Bravo to Noble Two, stand by for contact report."`,
        Answers: ["Jun"],
    },
    {
        Question: `Who says the following quote: "During my last psych eval they asked me what I felt while reducing civilian unrest. I told them, slight recoil."`,
        Answers: ["Jun"],
    },
    {
        Question: `Who says the following quote: "Affirmative. It's the Winter Contingency."`,
        Answers: ["Carter", "Noble One", "Noble 1"],
    },
    {
        Question: `Who says the following quote: "A Zealot? We're onto something big, Commander."`,
        Answers: ["Kat", "Catherine"],
    },
    {
        Question: `Who says the following quote: "First glassing? Me too. Don't worry, I'm on it."`,
        Answers: ["Kat", "Catherine"],
    },
    {
        Question: `Who says the following quote: "You're scary, you know that?"`,
        Answers: ["Emile"],
    },
    {
        Question: `Who says the following quote: "I'm ready! How 'bout you?!"`,
        Answers: ["Emile"],
    },
    {
        Question: `Who says the following quote: "Negative. I have the gun."`,
        Answers: [
            "Noble Six",
            "Noble 6",
            "SPARTAN-B312",
            "SPARTAN B312",
            "B312",
        ],
    },
    {
        Question: `Who says the following quote: "Yes, well, as they say... news of my death has been greatly exaggerated."`,
        Answers: [
            "Catherine Halsey",
            "Halsey",
            "Dr. Halsey",
            "Dr Halsey",
            "Dr Catherine Halsey",
            "Dr. Catherine Halsey",
            "Doctor Catherine Halsey",
            "Doctor Halsey",
        ],
    },
    {
        Question: `Who says the following quote: "They'll be remembered."`,
        Answers: ["Keyes"],
    },
    {
        Question: "How many Data Pads are there?",
        Answers: ["19", "Nineteen", "Nine-teen"],
    },
    {
        Question: "What is the name of the civilian flat bed truck?",
        Answers: ["Spade"],
    },
    {
        Question: "What is the name of first Noble Six?",
        Answers: ["Thom"],
    },
    {
        Question:
            "What is the name of the tusked creature native to the planet Reach?",
        Answers: ["Guta"],
    },
    {
        Question:
            "What is the name of the AI that assists Noble Team during the Fall of Reach?",
        Answers: ["Auntie Dot"],
    },
    {
        Question:
            "During the mission Long Night of Solace, which UNSC Frigate assists with the assault of the Corvette?",
        Answers: ["Savannah"],
    },
    {
        Question:
            "What language does Jorge speak when communicating with the inhabitants of Reach?",
        Answers: ["Hungarian"],
    },
    {
        Question:
            "What is the name of the ODST squad specialising in the use of Jetpacks?",
        Answers: ["Bullfrogs", "the bullfrogs", "bull-frogs", "bull frogs"],
    },
    {
        Question:
            "What is the name given to the only member of the Covenant to speak English during the Halo: Reach campaign?",
        Answers: ["Dreaming Grunt"],
    },
    {
        Question: "Who in Noble Team was a SPARTAN-II?",
        Answers: ["Jorge"],
    },
    {
        Question: "On which plant was Jorge born on?",
        Answers: ["Reach"],
    },
    {
        Question: "On which plant was Emile born on?",
        Answers: ["Eridanus II", "Eridanus"],
    },
    {
        Question: `In universe, who developed the Spartan Sprint Armour Ability?`,
        Answers: ["Kat", "Catherine"],
    },
    {
        Question: `Which Armour Ability in not available in the campaign?`,
        Answers: ["Evade"],
    },
    {
        Question: `Which Armour Ability's pick-up colour is Green?`,
        Answers: ["Sprint"],
    },
    {
        Question: `Which Armour Ability's pick-up colour is White?`,
        Answers: ["Jet Pack"],
    },
    {
        Question: `Which Armour Ability's pick-up colour is Yellow?`,
        Answers: ["Hologram"],
    },
    {
        Question: `Which Armour Ability's pick-up colour is Blue?`,
        Answers: ["Drop Shield"],
    },
    {
        Question: `Which Armour Ability's pick-up colour is Orange?`,
        Answers: ["Armour Lock", "Armor Lock"],
    },
    {
        Question: `Which Armour Ability's pick-up colour is Cyan?`,
        Answers: ["Active Camouflage", "Active camo", "camouflage"],
    },
    {
        Question: `How many Armour Abilities are there in Halo: Reach?`,
        Answers: ["7", "seven"],
    },
    {
        Question: `How many Ally Fireteam names are there in the original version of Halo: Reach?`,
        Answers: ["193"], // 8 added in MCC, 1 added then removed?
    },
    {
        Question: `To the nearest whole number, the Long Night of Solace is approximately how many kilometers long?`,
        Answers: ["29km", "29", "twenty-nine", "twenty nine"], // 18miles
    },
    {
        Question: `How many missiles strike the designated area from a Target Locator?`,
        Answers: ["7", "seven"],
    },
    {
        Question: `From all modes, how many medals are there in Halo: Reach?`,
        Answers: ["113"],
    },
    {
        Question: `Exodus`,
        Answers: ["Exodus"],
    },
    {
        Question: `On the mission The Package, activiting the two switches spawns 4 of which vehicle?`,
        Answers: ["Banshee", "Banshees"],
    },
    {
        Question: `How many dead Spartans can be found on the mission Lone Wolf?`,
        Answers: ["13", "Thirteen"],
    },
    {
        Question: `The Grunt in a Barrel Easter Egg is found on which Multiplayer map?`,
        Answers: ["Penance"],
    },
    {
        Question: `In the original release of Halo: Reach, what is the name of the highest Multiplayer rank?`,
        Answers: ["Inheritor"],
    },
    {
        Question: `What is the name of the Firefight map set in the level Exodus?`,
        Answers: ["Beachhead"],
    },
    {
        Question: `What is the name of the Firefight map set in the level Long Night of Solace?`,
        Answers: ["Corvette"],
    },
    {
        Question: `What is the name of the Firefight map set in the level ONI: Sword Base?`,
        Answers: ["Courtyard"],
    },
    {
        Question: `Outpost and which other Firefight map is set in the level The Package?`,
        Answers: ["Glacier"],
    },
    {
        Question: `Glacier and which other Firefight map is set in the level The Package?`,
        Answers: ["Outpost"],
    },
    {
        Question: `What is the name of the Firefight map set in the level The Pillar of Autumn?`,
        Answers: ["Holdout"],
    },
    {
        Question: `What is the name of the Firefight map set in the level Winter Contingency?`,
        Answers: ["Overlook"],
    },
    {
        Question: `What is the name of the Firefight map set in the level Nightfall?`,
        Answers: ["Waterfront"],
    },
    {
        Question: `What is the name of the Multiplayer map set in the level Exodus?`,
        Answers: ["Boardwalk"],
    },
    {
        Question: `What is the name of the Multiplayer map set in the launch facility in the level Long Night of Solace?`,
        Answers: ["Countdown"],
    },
    {
        Question: `What is the name of the Multiplayer map set in the Corvette in the level Long Night of Solace?`,
        Answers: ["Zealot"],
    },
    {
        Question: `What is the name of the Multiplayer map set in the level ONI: Sword Base?`,
        Answers: ["Sword Base"],
    },
    {
        Question: `What is the name of the Multiplayer map set in the level New Alexandria?`,
        Answers: ["Reflection"],
    },
    {
        Question: `What is the name of the Multiplayer map set in the level The Pillar of Autumn?`,
        Answers: ["Boneyard"],
    },
    {
        Question: `What is the name of the Multiplayer map set in the level Tip of the Spear?`,
        Answers: ["Spire"],
    },
    {
        Question: `What is the name of the Multiplayer map set in the level Nightfall?`,
        Answers: ["Powerhouse"],
    },
]

const halo4Questions = [
    {
        Question: "What year was Halo 4 released on the Xbox 360?",
        Answers: ["2012"],
    },
    // Characters
    {
        Question: "What is Lasky's first name?",
        Answers: ["Thomas", "Tom"],
    },
    {
        Question: "What is Captain Del Rio's first name?",
        Answers: ["Andrew"],
    },
    {
        Question: "What is Palmer's first name?",
        Answers: ["Sarah"],
    },
    {
        Question: "What is the Didact's birth name?",
        Answers: ["Shadow-of-Sundered-Star"],
    },
    {
        Question:
            "What is the name of the Researcher Master Chief meets in the mission Composer?",
        Answers: [
            "Doctor Tillson",
            "Doctor Tilson",
            "Dr Tillson",
            "Dr Tilson",
            "Tilson",
            "Sandra Tillson",
        ],
    },
    // Weapons and Vehicles
    {
        Question: "What does SAW stand for?",
        Answers: ["Squad Automatic Weapon"],
    },
    {
        Question:
            "The Energy Sword and which other weapon prevents slowdown when sprinting?",
        Answers: ["Gravity Hammer", "Hammer"],
    },
    {
        Question:
            "The Gravity Hammer and which other weapon prevents slowdown when sprinting?",
        Answers: ["Energy Sword", "Sword"],
    },
    {
        Question:
            "What is the name of the vehicle you fly at the start of Midnight?",
        Answers: ["Broadsword", "Broad sword"],
    },
    {
        Question: "How many Armour Abilities are there in Halo 4?",
        Answers: ["8", "eight"],
    },
    {
        Question:
            "During the campaign, what is the first Armour Ability availble to the player to use?",
        Answers: [
            "Active Camouflage",
            "Active Camo",
            "Active Camou",
            "Camouflage",
            "Camo",
        ],
    },
    {
        Question:
            "A Legendary-only Easter Egg on Forerunner lets the player spawn in 9 of which weapon?",
        Answers: ["Incineration Cannon", "Incineration Cannons"],
    },
    {
        Question:
            "A Legendary-only Easter Egg on Shutdown lets the player spawn in 4 of which weapon?",
        Answers: ["Gravity Hammer", "Gravity Hammers", "Hammer", "Hammers"],
    },
    {
        Question:
            "On Legendary difficulty, on the mission Midnight, how many pillars must the player destroy to spawn in a bonus Gravity Hammer?",
        Answers: ["8", "eight"],
    },
    {
        Question:
            "What is the name of the Covenant vehicle that temporarily disables the Mammoth in the level Reclaimer?",
        Answers: ["Lich"],
    },
    // General
    {
        Question:
            "How long does Master Chief stay in cryosleep for? (Format: X years, Y months, Z days)",
        Answers: [
            "4 years, 7 months, 10 days",
            "4 years 7 months 10 days",
            "4years, 7months, 10days",
            "4years 7months 10days",
        ],
    },
    {
        Question:
            "What condition does Cortana suffer from during the events of Halo 4?",
        Answers: ["Rampancy"],
    },
    {
        Question: "Who composed the music for Halo 4?",
        Answers: ["Neil Davidge", "Davidge"],
    },
    {
        Question: "What is the only Halo 4 mission to not have a terminal?",
        Answers: ["Dawn"],
    },
    {
        Question:
            "What is the name of the five episode live-action series released alongside Halo 4?",
        Answers: ["Forward Unto Dawn"],
    },
    {
        Question: "Which Halo ring is seen at the start of Composer?",
        Answers: [
            "Installation 03",
            "Gamma Halo",
            "Gamma",
            "Installation 3",
            "03",
            "3",
        ],
    },
    {
        Question: "What is the name of shield world in Halo 4?",
        Answers: ["Requiem"],
    },
    {
        Question:
            "What is the name of the Forerunner artifact that the Didact was held captive in?",
        Answers: ["Cryptum"],
    },
    {
        Question: "What is the name of the Didact's personal flagship?",
        Answers: ["Mantle's Approach", "Mantles Approach"],
    },
    {
        Question: "What does IFF stand for?",
        Answers: ["Identification Friend or Foe", "Identification Friend Foe"],
    },
    {
        Question:
            "What is the name of the UNSC Research Facility that has the Composer?",
        Answers: ["Ivanoff Station"],
    },
    {
        Question:
            "In which mission does Master Chief not start with an Assault Rifle?",
        Answers: ["Midnight"],
    },
    {
        Question: "In which mission does Master Chief not fight any Covenant?",
        Answers: ["Midnight"],
    },
    {
        Question:
            "MCC launches with a glitched that told the player to press which button at the end of Midnight?",
        Answers: ["RT", "Right trigger"],
    },
    {
        Question: "What city gets composed?",
        Answers: ["New Phoenix"],
    },
    {
        Question:
            "The final cutscene of the mission Reclaimer was remade for the 2012 Spike Video Game Awards. with which actor taking the place of Cortana?",
        Answers: [
            "Samuel L. Jackson",
            "Samuel L Jackson",
            "Samuel Jackson",
            "Sam Jackson",
        ], //https://www.youtube.com/watch?v=iCLFu_Gt25Q
    },
    // Achievements
    {
        Question:
            "What is the name of the MCC Achievement for completing Halo 4 on Legendary in under 3hrs?",
        Answers: ["You're Joking", "You are Joking"],
    },
    // Spartan Ops
    {
        Question:
            "What is the name of the Fireteam you play in during the Spartan Ops campaign?",
        Answers: ["Fireteam Crimson", "Crimson"],
    },
    {
        Question:
            "Name a Fireteam that you meet (and do not play as) in the Spartan Ops campaign.",
        Answers: [
            "Castle, Majestic, Ivy, Domino, Tower",
            "Castle",
            "Majestic",
            "Ivy",
            "Domino",
            "Tower",
        ],
    },
    {
        Question: "How many Spartan Ops missions are there?",
        Answers: ["50", "Fifty"],
    },
    {
        Question:
            "What episode from Spartan Ops shares an name with a main mission from the Halo FPS series?",
        Answers: ["Exodus"],
    },
    {
        Question: "Who shot Halsey causing the lose of her left arm?",
        Answers: [
            "Commander Palmer",
            "Palmer",
            "Sarah Palmer",
            "Commander Sarah Palmer",
        ],
    },
    // Quotes
    {
        Question: `Complete this quote (2 words): "Uh, I'm sorry - did I miss orbiting a ______ _____ at some point?"`,
        Answers: ["Forerunner planet"],
    },
    {
        Question: `Complete this quote (2 words):  "So far, I've pulled multiple strings referring to the big ones as "_____ _____"`,
        Answers: ["Promethean Knights"],
    },
    {
        Question: `Complete this quote (1 word):  "I thought you'd be ____."`,
        Answers: ["taller"],
    },
    {
        Question: `Complete this quote (4 word):  "It worked. You did it. Just ___ ___ ___ ___."`,
        Answers: ["like you always do"],
    },
    {
        Question: `Who says the following quote: "So fades the great harvest of my betrayal."`,
        Answers: ["Didact", "Ur-Didact"],
    },
    {
        Question: `Who says the following quote: "Afraid we'll have to give you an IOU on that welcome home party."`,
        Answers: ["Thomas Lasky", "Lasky", "Tom Lasky"],
    },
    {
        Question: `Who says the following quote: "Well. Someone's overcompensating."`,
        Answers: ["Cortana"],
    },
    // Multiplayer
    {
        Question: `In the original version of the game, how many Commendations were there?`,
        Answers: ["121"],
    },
    {
        Question: `In Halo 4, what was the name of the highest Commendation rank?`,
        Answers: ["Master"],
    },
    {
        Question: `In Halo 4, what was the highest Spartan (Multiplayer) Rank?`,
        Answers: ["SR130", "130"],
    },
    {
        Question: `In Halo 4 multiplayer, how many Specialisations were there?`,
        Answers: ["8"],
    },
    {
        Question: `How many medals are there in Halo 4 Multiplayer?`,
        Answers: ["176"],
    },
    {
        Question: `What is the name of the Oddball-variant gametype that first appeared in Halo 4 DLC?`,
        Answers: ["Ricochet"],
    },
    {
        Question: `What is the name of the CTF gametype unique to Halo 4?`,
        Answers: ["Mini CTF"],
    },
    {
        Question: `In Halo 4, the gametype typically known as 'Infection' is given what name?`,
        Answers: ["Flood"],
    },
    {
        Question: `In Halo 4, what is the name of the FFA-variant gametype that declares the leading scorer the "king" until they are killed?`,
        Answers: ["Regicide"],
    },
    {
        Question: `In Halo 4, what is the name of the 5v5 gametype that requires players to plant beacons to secure Slipspace crates?`,
        Answers: ["Extraction"],
    },
    {
        Question: `In Halo 4, what is the name of the 6v6 gametype that requires players to capture and hold bases from the opposite team?`,
        Answers: ["Dominion"],
    },
    {
        Question: `How many multiplayer maps are there in Halo 4?`,
        Answers: ["25"],
    },
    {
        Question: `Which multiplayer map is the setting for the cutscene where Master Chief meets the Librarian?`,
        Answers: ["Haven"],
    },
    {
        Question: `Halo 3's multiplayer map 'The Pit' was remade and given what name in Halo 4 Multiplayer?`,
        Answers: ["Pitfall"],
    },
    {
        Question: `Halo 3's multiplayer map 'Valhalla' was remade and given what name in Halo 4 Multiplayer?`,
        Answers: ["Ragnarok"],
    },
]

const halo5Questions = [
    // General
    {
        Question: "What year was Halo 5 released on the Xbox One?",
        Answers: ["2015"],
    },
    {
        Question: `What was the name of the Halo 5 marketing campaign featuring audio logs, blog posts and other media posted online?`,
        Answers: ["Hunt the Truth"],
    },
    {
        Question: `The mission 'Osiris' is set on which planet?`,
        Answers: ["Kamchatka", "Caspar V"],
    },
    {
        Question: `Osiris team utilise the prototype ATS tool during the events of Halo 5, what does ATS stand for?`,
        Answers: ["Artemis Tracking System"],
    },
    {
        Question: `How many Mission Intel pieces are there in the Halo 5 campaign?`,
        Answers: ["117"],
    },
    {
        Question: `What is the first mission in which the player can fight the Warden Eternal?`,
        Answers: ["Osiris"],
    },
    {
        Question: `A soccer ball can be spawned on which level?`,
        Answers: ["Meridian Station"],
    },
    {
        Question: `Who attacked first, Chief or Locke?`,
        Answers: ["Master Chief", "Chief"],
    },
    {
        Question: `On which level can the Halo Kart Easter Egg be activated?`,
        Answers: ["Evacuation"],
    },
    {
        Question: `On which level can the player interact with a friendly Unggoy (Grunt)?`,
        Answers: ["Alliance"],
    },
    {
        Question: `Exuberant Witness will aid the player in combat after the player teabags a Crawler how many times?`,
        Answers: ["117"],
    },
    {
        Question: `How many missions are played as Fireteam Osiris?`,
        Answers: ["12"],
    },
    {
        Question: `How many missions are played as Blue Team?`,
        Answers: ["3"],
    },
    {
        Question: `2 missions are tied for the longest Par Time, name one?`,
        Answers: ["Blue Team", "Battle of Sunaion", "BoS"],
    },
    {
        Question: `Which mission has the shortest Par Time?`,
        Answers: ["Osiris"],
    },
    // Characters
    {
        Question: `What is Locke's first name?`,
        Answers: ["Jameson"],
    },
    {
        Question: `Which actor plays as Spartan Locke?`,
        Answers: ["Ike Amadi"],
    },
    {
        Question: `What is Tanaka's first name?`,
        Answers: ["Holly"],
    },
    {
        Question: `What is Vale's first name?`,
        Answers: ["Olympia"],
    },
    {
        Question: `During development which Spartan did Buck replace on Fireteam Osiris?`,
        Answers: ["Gabriel Thorne", "Thorne", "Gabriel"],
    },
    {
        Question: `What is the name of the monitor of the Genesis Installation?`,
        Answers: ["031 Exuberant Witness", "Exuberant Witness"],
    },
    {
        Question: `How many Wardens can the player encounter through all of the Halo 5 campaign?`,
        Answers: ["10", "Ten"],
    },
    // Weapons
    {
        Question: `In Halo 5, what is the name of Arbiter Thel 'Vadam's personal energy sword?`,
        Answers: [
            "Prophets' Bane",
            "Prophet's Bane",
            "Prophets Bane",
            "End of Night",
        ],
    },
    {
        Question: `Which weapon/weapon type gives the player a movement speed buff when held?`,
        Answers: ["Energy Sword", "Sword"],
    },
    {
        Question: `In the campaign, which weapon can be picked up from the ground with 0 ammo?`,
        Answers: ["Energy Sword", "Sword"],
    },
    {
        Question: `What is the name of Kelly's Shotgun?`,
        Answers: ["Oathsworn"],
    },
    {
        Question: `What is the name of Linda's Sniper Rifle?`,
        Answers: ["Nornfang", "Norn fang", "Norn-fang"],
    },
    {
        Question: `The Nornfang Sniper Rifle allows the user to see which HUD element while scoped in?`,
        Answers: ["Motion Tracker", "Radar"],
    },
    {
        Question: `The 'Pro Pipe' is a variant of which weapon?`,
        Answers: [
            "Grenade Launcher",
            "Individual Grenade Launcher",
            "M319 Individual Grenade Launcher",
            "M319 grenade launcher",
        ],
    },
    {
        Question: `What is the name of the burst fire magnum in Halo 5?`,
        Answers: ["Whispered Truth"],
    },
    // Vehicles
    {
        Question: `What is the name of the airborne Forerunner weapon-ship?`,
        Answers: ["Phaeton"],
    },
    // Achievements
    {
        Question: `The Halo 5 achievement "Worms Don't Surf" is awarded once the player knocks two of which enemy into the ocean?`,
        Answers: ["Hunter", "Hunters"],
    },
    {
        Question: `The Halo 5 achievement "Fire Drill" is awarded once the player completes which mission on Heroic, deathless and under 18mins?`,
        Answers: ["Evacuation"],
    },
    {
        Question: `The Halo 5 achievement "Tank Still Beats Everything" is a call-back to an achievement in which game?`,
        Answers: ["Halo: Reach", "Halo Reach", "Reach"],
    },
    // Multiplayer
    {
        Question: `In total, how many multiplayer maps were released for Halo 5?`,
        Answers: ["39"],
    },
    {
        Question: `Halo 4's multiplayer map 'Haven' was remade and given what name in Halo 5 Multiplayer?"`,
        Answers: ["Mercy"],
    },
    {
        Question: `Halo 5's multiplayer map 'Mercy' was remixed and given what name in Halo 5 Multiplayer?"`,
        Answers: ["Regret"],
    },
    {
        Question: `Halo 2's multiplayer map 'Midship' was remade and given what name in Halo 5 Multiplayer?"`,
        Answers: ["Truth"],
    },
    {
        Question: `'Oscar's House' is a callout in which Halo 5 Multiplayer map?"`,
        Answers: ["Plaza"],
    },
    {
        Question: `The 'sand monster' Easter Egg can be activated on which Halo 5 Multiplayer map?"`,
        Answers: ["The Rig", "Rig"],
    },
    {
        Question: `What was the max Spartan Rank in Halo 5 multiplayer?"`,
        Answers: ["SR152", "152"],
    },
    {
        Question: `What was the name of the 4v4 CTF game mode where each player was given one life per round?`,
        Answers: ["Breakout", "Arena Breakout", "Community Breakout"],
    },
    {
        Question: `What was the name of the 12v12 game mode where each players raced to capture bases, kill bosses, and destroy the oppising side's core?"`,
        Answers: ["Warzone", "Warzone Assault", "Warzone Turbo"],
    },
    // Quotes
    {
        Question: `Complete this quote (4 words):  "Negative, Infinity. ___ ___ ___ ___."`,
        Answers: ["I don't like it"],
    },
    {
        Question: `Complete this quote (2 words):  "If it's gonna fall, won't be because Spartans are using it as a ____ ___."`,
        Answers: ["jungle gym"],
    },
    {
        Question: `Complete this quote (1 word):  "Welcome. Have you also come to stop Cortana from claiming the _____?"`,
        Answers: ["Mantle"],
    },
    {
        Question: `Who says the following quote: "We could've taken 'em."`,
        Answers: ["Edward Buck", "Buck", "Spartan Edward Buck", "Spartan Buck"],
    },
    {
        Question: `Who says the following quote: "This might be hard to believe, seeing as how I'm a model of stoicism and courage today, but... When I was a kid, I-I was afraid of heights. So...there's that."`,
        Answers: ["Edward Buck", "Buck", "Spartan Edward Buck", "Spartan Buck"],
    },
    {
        Question: `Who says the following quote: "The Covenant glassed this planet in '48. It was a UNSC colony then, but we never came back. Run by a private corp now. Chipping away the glass, making her livable."`,
        Answers: [
            "Holly Tanaka",
            "Tanaka",
            "Spartan Holly Tanaka",
            "Spartan Tanaka",
        ],
    },
    {
        Question: `Who says the following quote: "They have a tank. Why do they have a tank?"`,
        Answers: [
            "Olympia Vale",
            "Vale",
            "Spartan Olympia Vale",
            "Spartan Vale",
        ],
    },
    {
        Question: `Who says the following quote: "I have welcomed you to my home. Do not be so rude as to make my health a point of conversation."`,
        Answers: ["Governor Sloan", "Sloan"],
    },
    {
        Question: `Who says the following quote: "The other humans are approved for passage. Regretfully, you are not."`,
        Answers: ["Warden Eternal", "Warden"],
    },
    {
        Question: `Who says the following quote: "You're not the only one here because of him."`,
        Answers: [
            "Jameson Locke",
            "Locke",
            "Spartan Jameson Locke",
            "Spartan Locke",
        ],
    },
    {
        Question: `Who says the following quote: "No one is entitled to honor. You earn it."`,
        Answers: [
            "Jameson Locke",
            "Locke",
            "Spartan Jameson Locke",
            "Spartan Locke",
        ],
    },
    {
        Question: `Who says the following quote: "Stop her. But please. Bring John home to me."`,
        Answers: [
            "Catherine Halsey",
            "Halsey",
            "Dr. Halsey",
            "Dr Halsey",
            "Dr Catherine Halsey",
            "Dr. Catherine Halsey",
            "Doctor Catherine Halsey",
            "Doctor Halsey",
        ],
    },
]

const haloInfiniteQuestions = [
    {
        Question: "",
        Answers: [],
    },
]

const franchiseQuestions = [
    {
        Question:
            "What is the name of the species commonly referred to as the Prophets?",
        Answers: ["San'Shyuum", "San Shyuum", "SanShyuum", "San 'Shyuum"],
    },
    {
        Question:
            "What is the name of the species commonly referred to as Elites?",
        Answers: ["Sangheili"],
    },
    {
        Question:
            "What is the name of the species commonly referred to as Grunts?",
        Answers: ["Unggoy"],
    },
    {
        Question:
            "What is the name of the species commonly referred to as Jackals?",
        Answers: ["Kig-Yar", "Kigyar", "Kig Yar"],
    },
    {
        Question:
            "What is the name of the species commonly referred to as Hunters?",
        Answers: ["Mgalekgolo", "Lekgolo"],
    },
    {
        Question:
            "What is the name of the species commonly referred to as Brutes?",
        Answers: ["Jiralhanae"],
    },
    {
        Question:
            "What is the name of the species commonly referred to as Drones?",
        Answers: ["Yanme'e", "Yanmee", "Yanme"],
    },
    {
        Question: "Which Skull gives the largest points score multiplier?",
        Answers: ["Iron Skull", "Iron"],
    },
    {
        Question:
            "What is the name of the community challenge for completing LASO with no deaths and no Save & Quit?",
        Answers: ["Mythic Difficulty", "Mythic"],
    },
    // Gameplay Features
    {
        Question:
            "The night-vision mechanic was first used in which Halo game?",
        Answers: [
            "Halo: Combat Evolved",
            "Halo: CE",
            "Halo:CE",
            "Halo 1",
            "H:CE",
            "HCE",
            "CE",
        ],
    },
    {
        Question: "Dual Wielding was first included in which Halo game?",
        Answers: ["Halo 2", "H2"],
    },
    {
        Question: "Theatre was first included in which Halo game?",
        Answers: ["Halo 3", "H3"],
    },
    // Vehicles
    {
        Question:
            "The vehicle called the Mongoose was first introduced in which Halo game?",
        Answers: ["Halo 3", "H3"],
    },
    {
        Question:
            "The vehicle called the Hornet was first introduced in which Halo game?",
        Answers: ["Halo 3", "H3"],
    },
    {
        Question:
            "The vehicle called the Wasp was first introduced in which Halo game?",
        Answers: ["Halo 5: Guardians", "Halo 5", "H5", "Halo 5 Guadrians"],
    },
    // Multiplayer
    {
        Question:
            "What is the name of the variant of the multiplayer gamemode Assault where players wield a Gravity Hammer and an Energy Sword?",
        Answers: ["Grifball"],
    },
    {
        Question:
            "King of the Hill was first included as an official multiplayer gamemode in which Halo game?",
        Answers: [
            "Halo: Combat Evolved",
            "Halo: CE",
            "Halo:CE",
            "Halo 1",
            "H:CE",
            "HCE",
            "CE",
        ],
    },
    {
        Question:
            "SWAT/Tactical Slayer was first included as an official multiplayer gamemode in which Halo game?",
        Answers: ["Halo 2", "H2"],
    },
    {
        Question:
            "Territories was first included as an official multiplayer gamemode in which Halo game?",
        Answers: ["Halo 2", "H2"],
    },
    {
        Question:
            "Infection was first included as an official multiplayer gamemode in which Halo game?",
        Answers: ["Halo 3", "H3"],
    },
    {
        Question:
            "Headhunter was first included as an official multiplayer gamemode in which Halo game?",
        Answers: ["Halo: Reach", "Reach", "Halo:Reach"],
    },
    {
        Question:
            "What is the name of the melee weapon which is functionally identical to the Gravity Hammer?",
        Answers: ["7 wood"],
    },
    // Non-FPS Games
    {
        Question:
            "What is the name of the first isometric 'twin stick' shooter Halo game developed in collaboration with Vanguard Games?",
        Answers: ["Halo: Spartan Assualt", "Halo Spartan Assualt", "Spartan Assualt"],
    },
    {
        Question:
            "What year was Halo: Spartan Assualt released?",
        Answers: ["2013"],
    },
    {
        Question:
            "Halo: Spartan Assault is set around the battle of which planet and its moon?",
        Answers: ["Draetheus V", "Draetheus 5", "Draetheus"],
    },
    {
        Question:
            "Halo: Spartan Assault features two protagonists, Spartan Sarah Palmer and which other Spartan?",
        Answers: ["Spartan Edward Davis", "Edward Davis", "Spartan Davis", "Davis"],
    },
    {
        Question:
            "Halo: Spartan Assault features two protagonists, Spartan Edward Davis and which other Spartan?",
        Answers: ["Spartan Sarah Palmer", "Sarah Palmer", "Spartan Palmer", "Palmer"],
    },
    {
        Question: `Complete this Halo: Spartan Assault quote (1 word): "Yeah! Nice work ____!"`,
        Answers: ["dawg", "dawg!"],
    },
    {
        Question:
            "What is the name of the second isometric 'twin stick' shooter Halo game developed in collaboration with Vanguard Games?",
        Answers: ["Halo: Spartan Strike", "Halo Spartan Strike", "Spartan Strike"],
    },
    {
        Question:
            "What year was Halo: Spartan Strike released?",
        Answers: ["2015"],
    },
    {
        Question:
            "Original planned for Halo: CE, what is the name of the UNSC hover vehicle which made it's first appearance in Halo: Spartan Strike?",
        Answers: ["AV-30 Kestrel", "Kestrel", "AV-30", "AV30 Kestrel"],
    },
    {
        Question:
            "What is the name of the Halo game that is a co-operative arcade shooter?",
        Answers: ["Halo: Fireteam Raven", "Halo Fireteam Raven", "Fireteam Raven"],
    },
    {
        Question:
            "What year was Halo: Fireteam Raven released?",
        Answers: ["2018"],
    },
]

const halorunsQuestions = [
    {
        Question: "What year was HaloRuns founded?",
        Answers: ["2014"],
    },
    {
        Question: "Did someone say...?",
        Answers: ["Haloruns.com", "Haloruns dot com"],
    },
    // Submissions & WR Stats
    {
        Question:
            "Who has the longest unbroken streak as a Full Game World Record holder?",
        Answers: ["GarishGoblin", "Garish"],
    },
    {
        Question:
            "Who held the single longest unbroken Full Game World Record time?",
        Answers: ["c0ry123", "cory123", "cory", "c0ry"],
    },
    {
        Question:
            "In Halo CE Speedrunning, Keyes and which other IL has more Legendary submissions than Easy?",
        Answers: ["Assault of the Control Room", "Aotcr"],
    },
    {
        Question:
            "In Halo 3:ODST Speedrunning, which IL has the most submissions on the Easy difficulty?",
        Answers: ["Tayari Plaza", "Tayari"],
    },
    {
        Question:
            "In Halo 3:ODST Speedrunning, which IL has the most submissions on the Legendary difficulty?",
        Answers: ["Uplift Reserve", "Uplift"],
    },
    {
        Question: "Who holds the slowest IL WR?",
        Answers: ["Wingman953", "Wingman"],
    },
    {
        Question:
            "The NMPD HQ Easy IL WR stood for 4.5yrs until Adversary beat it by 1 sec on 19th Jan 2020. Who previously held the WR?",
        Answers: ["HLGNagato", "Nagato"],
    },
    {
        Question:
            "The first sub-1hr Halo 3:ODST solo time was achieved by who?",
        Answers: ["Harc", "HarcTehShark"],
    },
    {
        Question:
            "The first sub-1hr Halo: Reach solo time was achieved by who?",
        Answers: ["Seclusive", "Reculsive"],
    },
    {
        Question: "The first sub-1hr Halo 3 solo time was achieved by who?",
        Answers: ["byNailz"],
    },
    {
        Question:
            "Wingman953 set his first IL WR on ONI Alpha Site. What was the next level that he set a WR on?",
        Answers: ["Coastal Highway", "Coastal"],
    },
    {
        Question:
            "Wingman953, SkilledGames_ & Zombie343 set the ONI Alpha Site Easy Co-op WR in an RTA time of 10:42, what was the In-Game time?",
        Answers: ["7:46"],
    },
    {
        Question:
            "Whow as the first person to achieve a sub-9min on H2A Regret Legendary?",
        Answers: ["Synyster"],
    },
    // GDQ
    {
        Question: "In 2022 Halo CE was run at AGDQ by which speedrunner?",
        Answers: ["ChronosReturns", "Chronos"],
    },
    {
        Question: "In 2022 Halo 5 was run at AGDQ by which speedrunner?",
        Answers: ["DistroTV", "Distro"],
    },
    {
        Question: "In 2021 Halo 2 was run at SGDQ by which speedrunner?",
        Answers: ["Monopoli"],
    },
    {
        Question: "In 2021 Halo 3 was run at AGDQ by which speedrunner?",
        Answers: ["SasquatchSensei", "Sasquatch"],
    },
    {
        Question: "In 2021 Halo 3:ODST was run at AGDQ by which speedrunner?",
        Answers: ["Heroic Robb", "Heroic_Robb", "Robb"],
    },
    {
        Question:
            "In 2019 Halo: Reach was run at AGDQ by 2 speedrunners, name one of them.",
        Answers: ["WoLfy, Pedrogras", "Wolfy", "Pedrogas", "Pedro"],
    },
    {
        Question: "In 2018 Halo 5 was run at AGDQ by which speedrunner?",
        Answers: ["DistroTV", "Distro"],
    },
    {
        Question: "In 2017 Halo CE was run at SGDQ by which speedrunner?",
        Answers: ["GarishGoblin", "Garish"],
    },
    {
        Question: "In 2017 Halo 2 was run at AGDQ by which speedrunner?",
        Answers: ["Cryphon"],
    },
    {
        Question: "In 2016 Halo 4 was run at AGDQ by which speedrunner?",
        Answers: ["ProAceJoker", "Joker", "ProAcedJoker"],
    },
    {
        Question: "In 2015 Halo 3 was run at SGDQ by which speedrunner?",
        Answers: ["TheBlazeJp", "BlazeJp"],
    },
    {
        Question:
            "In 2015 Halo 2 was run at AGDQ by 2 speedrunners, name one of them.",
        Answers: ["Monopoli & Ruudyt", "Monopoli", "Ruudyt", "Rudy", "Ruudy"],
    },
    {
        Question: "In 2014 Halo CE was run at SGDQ by which speedrunner?",
        Answers: ["Goatrope", "Goat"],
    },
    {
        Question: "In 2014 Halo 2 was run at AGDQ by which speedrunner?",
        Answers: ["Monopoli"],
    },
    // Relay Races
    {
        Question: "Which team won the HaloRuns Legendary Relay Race in 2022?",
        Answers: ["Red Team", "Red"],
    },
    {
        Question:
            "Which team won the HaloRuns Legendary Relay Race at the end of 2021?",
        Answers: ["Green Team", "Green"],
    },
    {
        Question:
            "Which team won the HaloRuns Legendary Relay Race at the start of 2021?",
        Answers: ["Green Team", "Green"],
    },
    {
        Question:
            "Which team won the HaloRuns Legendary Relay Race at the start of 2020?",
        Answers: ["Red Team", "Red"],
    },
    {
        Question: "Which team won the HaloRuns Easy Relay Race in 2022?",
        Answers: ["Green Team", "Green"],
    },
    {
        Question: "Which team won the HaloRuns Easy Relay Race in 2021?",
        Answers: ["Red Team", "Red"],
    },
    {
        Question: "Which team won the HaloRuns Easy Relay Race in 2020?",
        Answers: ["Gold Team", "Gold", "Yellow Team", "Yellow"],
    },
    {
        Question: "Which team won the HaloRuns Easy Relay Race in 2019?",
        Answers: ["Green Team", "Green"],
    },
    {
        Question: "Which team won the HaloRuns Easy Relay Race in 2018?",
        Answers: ["Red Team", "Red"],
    },
    {
        Question: "Which team won the HaloRuns Easy Relay Race in 2017?",
        Answers: ["Red Team", "Red"],
    },
    {
        Question: "Which team won the HaloRuns Easy Relay Race in 2016?",
        Answers: ["Green Team", "Green"],
    },
    {
        Question: "Which team won the HaloRuns Easy Relay Race in 2015?",
        Answers: ["Blue Team", "Blue"],
    },
    // Surpise WRs
    {
        Question:
            "In March 2016 SkilledGames_ set the Legendary IL WR for which level?",
        Answers: ["NMPD HQ", "NMPD"],
    },
    {
        Question: '2019 was named the "Year of ODST" by which speedrunner?',
        Answers: ["Adversary"],
    },
    {
        Question:
            "Adversary achieved his first Legendary IL WR ever on which level?",
        Answers: ["Kikowani Station", "Kikowani", "Kiko"],
    },
    {
        Question:
            "In 2020 SkilledGames_ set a new Uplift Easy WR with a time of 2:12, which runner previously held the WR?",
        Answers: ["Sorix", "TehSorix"],
    },
    {
        Question:
            "Who was the first person to get the Two Bertrayals IL WR with the Banshee out of Level strategy?",
        Answers: ["Sorix", "TehSorix"],
    },
    {
        Question:
            "In 2016 a_royal_hobo battled out with which other runner for Kikowani Station WR?",
        Answers: ["Hoshka"],
    },
    // Pinoeers of the level
    {
        Question: "Welshevo79 is known to be a fan of which level?",
        Answers: ["Coastal Highway", "Coastal"],
    },
    {
        Question: "Harc is known to be a fan of which Halo 3:ODST level?",
        Answers: ["NMPD HQ", "NMPD"],
    },
    {
        Question: "Wingman953 is known to be a fan of which level?",
        Answers: ["ONI Alpha Site", "Oni Pog", "Oni", "Alpha Site"],
    },
    {
        Question: "Forerunner ILs",
        Answers: ["Exodus"],
    },
    // Strats
    {
        Question: "For Halo 2, what does AUP stand for?",
        Answers: ["Arbitrary Unit Possession"],
    },
    {
        Question:
            'The trick known as "The Charpet" is named after which speedrunner?',
        Answers: ["Chappified", "Chappy", "Chapp"],
    },
    {
        Question: "In Halo 3:ODST Speedrunning, what does BPL stand for?",
        Answers: ["Brute Pressure Launch"],
    },
    {
        Question: "In Halo 3:ODST Speedrunning, what does HCB stand for?",
        Answers: ["Hunter Car Boost", "Hunter-Car Boost"],
    },
    {
        Question: "In Halo 3:ODST Speedrunning, what does RCB stand for?",
        Answers: ["Rocket Car Boost", "Rocket-Car Boost"],
    },
    {
        Question:
            "In Halo 3:ODST Speedrunning, if I was performing the Robb Special I would be on which level?",
        Answers: [
            "Mombasa Streets",
            "Streets",
            "Mombasa Streets 3",
            "Streets 3",
            "MS3",
        ],
    },
    {
        Question:
            "In Halo 3:ODST Speedrunning, if I was performing the Catwalk Launch I would be on which level?",
        Answers: ["Data Hive"],
    },
    {
        Question: "In Halo: Reach Speedrunning, what does DVODUBS stand for?",
        Answers: ["Dyse's Variant of Dayton's Unnamed Bridge Skip"],
    },
    {
        Question: "In Halo: Reach Speedrunning, what does TEIDFSEF stand for?",
        Answers: ["Two EEzy's Improved Dyse's Faster Slow Early Falcon"],
    },
    {
        Question: "In Halo 4 Speedrunning, what does ASS POD stand for?",
        Answers: [
            "Area Specific Standing Point Of Despawn",
            "Alley Specific Standing Point Of Despawn",
            "Ally Specific Standing Point Of Despawn",
        ],
    },
    {
        Question:
            "In Halo 4 Speedrunning, if I was performing the Button Jump I would be on which level?",
        Answers: ["Forerunner"],
    },
    // Achievements
    {
        Question:
            "The achievement 'Goat Roped' is named after which speedrunner?",
        Answers: ["Goatrope", "Goat"],
    },
    {
        Question:
            "The achievement 'Monopolized' is named after which speedrunner?",
        Answers: ["Monopoli", "Mister Monopoli", "Mr Monopoli", "Mono"],
    },
    {
        Question:
            "The achievement 'Devastating' is named after which speedrunner?",
        Answers: [
            "Dark Devastation",
            "DarkDevastation",
            "Dark",
            "Bark Bevastation",
            "BarkBevastation",
            "Bark",
        ],
    },
    {
        Question:
            "The achievement 'You're Joking' is named after which speedrunner?",
        Answers: ["ProAceJoker", "Joker", "ProAcedJoker"],
    },
    {
        Question:
            "The achievement 'Keep You're Foot on the Pedrogas' is named after which speedrunner?",
        Answers: ["Pedrogas", "Pedro"],
    },
    {
        Question:
            "The achievement 'Nagato Makes Moving Easy' is named after which speedrunner?",
        Answers: ["Nagato", "HLGNagato"],
    },
    {
        Question:
            "The achievement 'Easy as One Two Three' is named after which speedrunner?",
        Answers: ["c0ry123", "cory123", "cory", "c0ry"],
    },
    {
        Question:
            "The achievement 'Piece of Cake' is named after which speedrunner?",
        Answers: ["HaoleCake"],
    },
    {
        Question: `The "Vetro Strike" achievement for beating the Assault on the Control Room Par Score is named after which speedrunner?`,
        Answers: ["Vetroxity", "Vetro"],
    },
    {
        Question: `The "Whistle Stop Tour" achievement for beating the Two Betrayals Par Time is named after which speedrunner?`,
        Answers: ["sub_WHISTLE", "WHISTLE", "sub", "sub WHISTLE"],
    },
    {
        Question: `The "Scurty Bump" achievement for beating the Keyes Par Time is named after which speedrunner?`,
        Answers: ["Scurty", "Scurty_"],
    },
    {
        Question: `The "Force of Will" achievement for beating the Gravemind Par Time is named after which speedrunner?`,
        Answers: ["Willzorss", "Willzors"],
    },
    {
        Question: `The "Reed the Strategy" achievement for beating The Oracle Par Time is named after which speedrunner?`,
        Answers: ["Stylo", "Reed Tiburon", "Tiburon"],
    },
    {
        Question: `The "Making History" achievement for beating the Cortana Par Time is named after which speedrunner?`,
        Answers: ["History100", "History"],
    },
    {
        Question: `The "Time Shift" achievement for beating the Crow's Nest Par Time is named after which speedrunner?`,
        Answers: ["SHIFTY", "SHIFTY time", "SHIFTY_time"],
    },
    {
        Question: `The "Naked Tyrant" achievement for beating the Halo 4 LASO Campaign Playlist is named after two speedrunners, name one of them.`,
        Answers: ["Naked Eli & Mythic Tyrant", "Mythic Tyrant", "Naked Eli", "Eli", "Nak3d Eli"],
    },
    {
        Question: `What is the name of the achievement for beating the par times on all Halo: CE levels?`,
        Answers: ["Did Somebody Say...", "Did Somebody Say", "Did Someone Say...", "Did Someone Say"],
    },
    {
        Question: `What is the name of the achievement for beating the par times on all Halo 2:Anniversary levels?`,
        Answers: ["Going Nowhere Fast"],
    },
    // Other
    {
        Question: "Which game in MCC has the longest sum of par times?",
        Answers: ["Halo 2", "Halo2"],
    },
    {
        Question: "Which game in MCC has the shortest sum of par times?",
        Answers: ["Halo 3:ODST", "ODST"],
    },
    {
        Question: "Which mission in Halo 2 has the longest par time?",
        Answers: ["The Oracle", "Oracle"],
    },
    {
        Question: "Which mission in Halo CE has the longest par time?",
        Answers: ["The Library", "Library"],
    },
]

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
