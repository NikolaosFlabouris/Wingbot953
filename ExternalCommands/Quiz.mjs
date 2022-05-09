import { sleep, Between } from "./Utils.mjs"
import { SendMessage } from "../Wingbot953.js"
import fs from "fs"

var quizActive = false
var questionIndex
var leaderboards = []
var leaderboardsFilePath = "./Data/"
var leaderboardsFileName = "QuizLeaderboards.json"

export async function StartQuiz() {
    if (!quizActive) {
        questionIndex = Between(0, odstQuestions.length - 1)

        SendMessage(
            "!quizcontroller",
            "/announce QUIZ: The next Quiz Question is in 20secs! Be the first to answer to earn a point. The topic will be Halo 3:ODST! Good luck!"
        )

        // await sleep(20000)

        // SendMessage(
        //     "!quizcontroller",
        //     `/announce QUIZ: The next Quiz is in 10secs. The topic will be Halo 3:ODST! Good luck!`
        // )

        await sleep(17000)

        SendMessage("!quizcontroller", `/slow 3`)

        ReadLeaderboardsFromFile()

        await sleep(3000)

        quizActive = true

        SendMessage(
            "!quizcontroller",
            `/announce QUIZ: ${odstQuestions[questionIndex].Question}`
        )

        await sleep(35000)

        if (quizActive) {
            quizActive = false

            SendMessage(
                "!quizcontroller",
                `/announce QUIZ: No one successfully answered the question. The answer was: ${odstQuestions[questionIndex].Answers[0]}`
            )

            await sleep(1000)

            SendMessage("!quizcontroller", `/slowoff`)
        }
    }
}

export async function onQuizHandler(target, context, msg, self) {
    if (quizActive && !self) {
        if (
            odstQuestions[questionIndex].Answers.findIndex((element) => {
                return element.toLowerCase() === msg.toLowerCase()
            }) >= 0
        ) {
            UpdateQuizScore(context["display-name"], 1)
            SendMessage(
                "!quizcontroller",
                `/announce Congratulations ${context["display-name"]}! You answered the question correctly! The answer was: ${odstQuestions[questionIndex].Answers[0]}.`
            )

            await sleep(1000)

            SendMessage("!quizcontroller", `/slowoff`)
            quizActive = false
        }
    }
}

export function DisplayQuizLeaderboards() {
    ReadLeaderboardsFromFile()

    leaderboards.sort(
        (firstItem, secondItem) => secondItem.Score - firstItem.Score
    )

    var message = "QUIZ LEADERBOARDS Top 5: "

    var learboardSize = 5 > leaderboards.length ? leaderboards.length : 5

    for (var i = 0; i < learboardSize; i++) {
        message +=
            leaderboards[i].Username + " - " + leaderboards[i].Score + "pts | "
    }
    SendMessage("!quizleaderboard", message)
}

export function GetMyQuizScore(originalMessage, messageUsername) {
    ReadLeaderboardsFromFile()

    var score = 0
    var user = messageUsername

    if (originalMessage.split(" ").length >= 2) {
        user = originalMessage.split(" ")[1].trim()
    }

    for (var i = 0; i < leaderboards.length; i++) {
        if (leaderboards[i].Username == user) {
            score = leaderboards[i].Score
            SendMessage("!quizscore", `${user}'s Quiz Score is: ` + score)
            return
        }
    }

    SendMessage("!quizscore", `No score found for user: ${user}`)
}

function UpdateQuizScore(user, pointsChange) {
    for (var i = 0; i < leaderboards.length; i++) {
        if (leaderboards[i].Username == user) {
            leaderboards[i].Score += pointsChange
            WriteLeaderboardsToFile()
            return
        }
    }

    leaderboards.push({ Username: user, Score: pointsChange })
    WriteLeaderboardsToFile()
}

function ReadLeaderboardsFromFile() {
    try {
        const data = fs.readFileSync(
            leaderboardsFilePath + leaderboardsFileName,
            "utf8"
        )
        leaderboards = JSON.parse(data)
    } catch (err) {
        console.error(err)
    }
}

function WriteLeaderboardsToFile() {
    try {
        const data = fs.writeFileSync(
            leaderboardsFilePath + leaderboardsFileName,
            JSON.stringify(leaderboards)
        )
    } catch (err) {
        console.error(err)
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
            "When watching Adversary and Heroic_Robb streams, Wingman953 coined what term?",
        Answers: ["Oni Pog"],
    },
    // Characters
    {
        Question:
            "During the events of Halo 3:ODST what is Buck's military rank?",
        Answers: ["Gunnery Sergeant"],
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
    {
        Question: "What is Dare's middle name?",
        Answers: ["Ann"],
    },
    {
        Question: "What is Dutch's name?",
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
        Question: "What is Mickey's name?",
        Answers: ["Michael Crespo", "Private First Class Michael Crespo"],
    },
    {
        Question:
            "During the events of Halo 3:ODST what is Mickey's military rank?",
        Answers: ["Private First Class"],
    },
    {
        Question: "What is Romeo's name?",
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
        Question: "What was the name of the ODST Fireteam in Halo 3:ODST?",
        Answers: ["Alpha-9", "Alpha 9", "Alpha Nine", "Alpha-Nine"],
    },
    {
        Question: "Who is the voice actor for Buck?",
        Answers: ["Nathan Fillion"],
    },
    {
        Question: "Who is the voice actress for Dare?",
        Answers: ["Tricia Helfer"],
    },
    {
        Question: "Who is the voice actor for Dutch?",
        Answers: ["Adam Baldwin"],
    },
    {
        Question: "Who is the voice actor for Mickey?",
        Answers: ["Alan Tudyk"],
    },
    {
        Question: "Who is the voice actor for Romeo?",
        Answers: ["Nolan North"],
    },
    {
        Question: "Who is the voice actor for the Superintendent?",
        Answers: ["Joseph Staten"],
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
    {
        Question:
            "In pounds (lb), how heavy is Jonas the Butcher from the audio log story?",
        Answers: ["800lbs", "800", "800 lbs", "800lb", "800 lb", "800 pounds"],
    },
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
    // Lore/World Building/Meta-trivia
    {
        Question:
            "When was Halo 3:ODST released on the Xbox 360? (Answer in YYYY-MM-DD format)",
        Answers: ["2009-09-22", "2009-9-22"],
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
        Question: "What is the alternative name for the Coastal Highway?",
        Answers: ["Waterfront Highway", "the Waterfront Highway"],
    },
    {
        Question:
            "Nathan Fillion (voice of Buck) and Tricia Helfer (voice of Dare) both stare in a TV series called what?",
        Answers: ["The Rookie"], //The Rookie (Season 4, Episode 2) https://youtu.be/bHmRHWdnKP0
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
        Answers: ["Uplift Nature Reserve", "The Uplift Nature Reserve"],
    },
    {
        Question:
            "On the mission Kikowani Station, legendary difficulty, MCC, what character appears when triggering the sound que?",
        Answers: ["Hamish Beamish", "Beamish"],
    },
    {
        Question: "Which campaign level has the most Hunter spawns?",
        Answers: ["Mombasa Streets", "Streets"],
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
    {
        Question: "What is painted on Dutch's helmet?",
        Answers: ["a skull", "skull"],
    },
    // Music/Soundtrack
    {
        Question:
            "After completing the mission Tayari Plaza, what is the name of the music track that plays on Mombasa Streets?",
        Answers: [
            "Deference for Darkness (Rain)",
            "Deference for Darkness",
            "Rain",
        ],
    },
    {
        Question:
            "After complete the mission Uplift Reserve, what is the name of the music track that plays on Mombasa Streets?",
        Answers: [
            "Asphalt and Ablution (Still Grounded)",
            "Asphalt and Ablution",
            "Still Grounded",
        ],
    },
    {
        Question:
            "What is the name of the music track that plays at the end of NMPD HQ?",
        Answers: [
            "Skyline (Air Traffic Control)",
            "Skyline",
            "Air Traffic Control",
        ],
    },
    // Speedrunning/Haloruns
    {
        Question: "Which IL has the most submissions on the Easy difficulty?",
        Answers: ["Tayari Plaza", "Tayari"],
    },
    {
        Question:
            "Which IL has the most submissions on the Legendary difficulty?",
        Answers: ["Uplift Reserve", "Uplift"],
    },
    {
        Question: "Halo 3:ODST was run at GDQ by which speedrunner?",
        Answers: ["Heroic Robb", "Heroic_Robb", "Robb"],
    },
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
            "In 2016 a_royal_hobo battled out with which other runner for Kikowani Station WR?",
        Answers: ["Hoshka"],
    },
    {
        Question: "Welshevo79 is known to be a fan of which level?",
        Answers: ["Coastal Highway", "Coastal"],
    },
    {
        Question: "Harc is known to be a fan of which level?",
        Answers: ["NMPD HQ", "NMPD"],
    },
    {
        Question: "Wingman953 is known to be a fan of which level?",
        Answers: ["ONI Alpha Site", "Oni Pog", "Oni", "Alpha Site"],
    },
    {
        Question: "Wingman953 is known to be a fan of which level?",
        Answers: ["ONI Alpha Site", "Oni Pog", "Oni", "Alpha Site"],
    },
    {
        Question:
            'The trick known as "The Charpet" is named after which speedrunner?',
        Answers: ["Chappified", "Chappy"],
    },
    {
        Question: "What does BPL stand for?",
        Answers: ["Brute Pressure Launch"],
    },
    {
        Question: "What does HCB stand for?",
        Answers: ["Hunter Car Boost", "Hunter-Car Boost"],
    },
    {
        Question: "What does RCB stand for?",
        Answers: ["Rocket Car Boost", "Rocket-Car Boost"],
    },
    {
        Question:
            "If I was performing the Robb Special I would be on which level?",
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
            "If I was performing the Catwalk Launch I would be on which level?",
        Answers: ["Data Hive"],
    },
    {
        Question: "Which runner has completed the Halo 3:ODST Trophy sweep?",
        Answers: ["SkilledGames_"],
    },
    {
        Question:
            "The NMPD HQ Easy IL WR stood for 4.5yrs until Adversary beat it by 1 sec on 19th Jan 2020. Who previously held the WR?",
        Answers: ["HLGNagato", "Nagato"],
    },
    {
        Question: "The first 1hr time was achieved by who?",
        Answers: ["Harc", "HarcTehShark"],
    },
    {
        Question:
            "As a percentage, which IL WR is the fastest when compared to it's MCC Par Time?",
        Answers: ["Kikowani Station", "Kikowani", "Kiko"],
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
    // Achievements
    {
        Question:
            "What is the name of the MCC sub 3hr ODST speedrun achievement?",
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
        Answers: ["Chasm Ten"],
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
        Question:
            "The Covenant refer to Master Chief as the 'Demon', what name do they have for The Rookie and the other ODSTs?",
        Answers: ["Imp", "Imps"],
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
