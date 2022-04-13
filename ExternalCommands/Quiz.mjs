import { sleep, Between } from "./Utils.mjs"
import { SendMessage } from "../Wingbot953.js"

var quizActive = false
var questionIndex

export async function StartQuiz() {
    // (track monthly scores)

    if (!quizActive) {
        questionIndex = Between(0, odstQuestions.length - 1)

        SendMessage(
            "!quizcontroller",
            "/me QUIZ: The next Quiz Question is in 30secs! Be the first to answer the upcoming question to earn a point (monthly leaderboards comming soon)!"
        )

        await sleep(20000)

        SendMessage(
            "!quizcontroller",
            `/me QUIZ: The next Quiz is in 10secs and the topic will be Halo 3:ODST! Good luck!`
        )

        await sleep(10000)

        quizActive = true

        SendMessage(
            "!quizcontroller",
            `/me QUIZ: ${odstQuestions[questionIndex].Question}`
        )

        await sleep(30000)

        if (quizActive) {
            quizActive = false

            SendMessage(
                "!quizcontroller",
                `/me QUIZ: No one successfully answered the question. The answer was: ${odstQuestions[questionIndex].Answers[0]}`
            )
        }
    }
}

export function onQuizHandler(target, context, msg, self) {
    if (quizActive && !self) {
        if (
            odstQuestions[questionIndex].Answers.findIndex((element) => {
                return element.toLowerCase() === msg.toLowerCase()
            }) >= 0
        ) {
            SendMessage(
                "!quizcontroller",
                `/me Congratulations ${context["display-name"]}! You answered the question correctly! The answer was: ${odstQuestions[questionIndex].Answers[0]}.`
            )
            quizActive = false
        }
    }
}

var halo1Questions = [
    {
        Question: "",
        Answers: [],
    },
]

var halo2Questions = [
    {
        Question: "",
        Answers: [],
    },
]

var halo3Questions = [
    {
        Question: "",
        Answers: [],
    },
]

var odstQuestions = [
    {
        Question: "Oni",
        Answers: ["Pog"],
    },
    {
        Question:
            "During the events of Halo 3:ODST what is Buck's military rank?",
        Answers: ["Gunnery sergeant"],
    },
    {
        Question: "On what planet was Buck born?",
        Answers: ["Draco III", "Draco"],
    },
    {
        Question: "On what planet was Dutch born?",
        Answers: ["Mars"],
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
        Question: "What is The Rookie's full name?",
        Answers: ["Jonathan Doherty"],
    },
    {
        Question: "What is Dare's middle name?",
        Answers: ["Ann"],
    },
    {
        Question: "What is Dutch's full name?",
        Answers: [
            "Taylor Miles",
            "Corporal Taylor Miles",
            "Taylor Henry Miles",
            "Corporal Taylor Henry Miles",
        ],
    },
    {
        Question:
            "During the events of Halo 3:ODST what is Dutch's military rank?",
        Answers: ["Corporal"],
    },
    {
        Question: "What is Mickey's full name?",
        Answers: ["Michael Crespo", "Private First Class Michael Crespo"],
    },
    {
        Question:
            "During the events of Halo 3:ODST what is Mickey's military rank?",
        Answers: ["Private First Class"],
    },
    {
        Question: "What is Romeo's full name?",
        Answers: ["Kojo Agu", "Lance Corporal Kojo Agu"],
    },
    {
        Question:
            "During the events of Halo 3:ODST what is Romeo's military rank?",
        Answers: ["Lance Corporal"],
    },
    {
        Question:
            "What is the full name of the engineer that goes by 'Virgil'?",
        Answers: ["Quick to Adjust"],
    },
    {
        Question: "Who is the voice actor for the Superintendent?",
        Answers: ["Joseph Staten"],
    },
    {
        Question: "What is the alternative name for the Coastal Highway?",
        Answers: ["Waterfront Highway", "the Waterfront Highway"],
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
        Answers: ["29"],
    },
    {
        Question:
            "What is the name of the TV show that stars both Nathan Fillian (voice of Buck) and Tricia Helfer (voice of Dare)?",
        Answers: ["The Rookie"], //The Rookie (Season 4, Episode 2) https://www.youtube.com/watch?v=bHmRHWdnKP0
    },
    {
        Question:
            "When starting on Open Streets, what is contained with the extra supply cache that is unlocked?",
        Answers: ["Mongoose", "Mongeese", "Mongooses", "a Mongoose"],
    },
    {
        Question:
            "2 skulls where cut from the original release of Halo 3:ODST, one provided a 'directors style' commentary, what did the other skull do?",
        Answers: ["3rd person camera", "third person camera"], //More info here: https://www.youtube.com/watch?v=9InGqBDgff8"
    },
    {
        Question:
            "How many skulls launched with the original version of Halo 3:ODST?",
        Answers: ["12"],
    },
    {
        Question:
            "Halo 3 launched with 13 skulls, one was removed for the launch of Halo 3:ODST, which skull was removed?",
        Answers: ["Fog"],
    },
    {
        Question:
            "In Halo 3:ODST how many needles are required to supercombine?",
        Answers: ["12"],
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
            "On what mission is the following quote said: \"Trooper, we're pinned down! Flank through this building, hit 'em from behind!\"",
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
            'Who says the following quote: "Your mama never loved ya and she dresses you funny."',
        Answers: ["Mickey", "Michael Crespo"],
    },
    {
        Question:
            "Who says the following quote: \"It ain't logical. I mean, hell, I'll kill a man in a fair fight... or if I think he's gonna start a fair fight, or if he bothers me, or if there's a woman... (sniffs) or if I'm gettin' paid - mostly only when I'm gettin' paid.\"",
        Answers: ["Dutch"],
    },
    {
        Question:
            'Who says the following quote: "Trooper! Over here! I saw your pod hit... You\'re one lucky S.O.B."',
        Answers: ["Chips Dubbo"],
    },
]

var reachQuestions = [
    {
        Question: "",
        Answers: [],
    },
]

var halo4Questions = [
    {
        Question: "",
        Answers: [],
    },
]

var halo5Questions = [
    {
        Question: "",
        Answers: [],
    },
]

var haloInfiniteQuestions = [
    {
        Question: "",
        Answers: [],
    },
]

var franchiseQuestions = [
    {
        Question: "",
        Answers: [],
    },
]
