"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetMyQuizScore = exports.DisplayQuizLeaderboards = exports.onQuizHandler = exports.StartQuiz = exports.QuizSetup = void 0;
const Utils_1 = require("./Utils");
const Twitch_1 = require("../Integrations/Twitch");
const fs_1 = __importDefault(require("fs"));
var quizActive = false;
let totalQuestionCount;
let questionIndex;
let categoryIndex;
let categoryName;
let question;
let answer;
var leaderboards = [];
var leaderboardsFilePath = "./Data/";
var leaderboardsFileName = "QuizLeaderboards.json";
function QuizSetup() {
    return __awaiter(this, void 0, void 0, function* () {
        totalQuestionCount = 0;
        for (var i = 0; i < quizCategories.length; i++) {
            totalQuestionCount += quizCategories[i].CategoryLength;
            console.log(quizCategories[i].CategoryName +
                " Question count: " +
                quizCategories[i].CategoryLength);
        }
        console.log("Total question count: " + totalQuestionCount);
    });
}
exports.QuizSetup = QuizSetup;
function StartQuiz() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!quizActive) {
            questionIndex = (0, Utils_1.Between)(0, totalQuestionCount - 1);
            for (var i = 0; i < quizCategories.length; i++) {
                if (questionIndex < quizCategories[i].CategoryLength) {
                    question =
                        quizCategories[i].CategoryQuestions[questionIndex].Question;
                    answer =
                        quizCategories[i].CategoryQuestions[questionIndex]
                            .Answers[0];
                    categoryName = quizCategories[i].CategoryName;
                    categoryIndex = i;
                    break;
                }
                questionIndex -= quizCategories[i].CategoryLength;
            }
            (0, Twitch_1.SendMessage)("!quizcontroller", `/announce QUIZ: The next Quiz Question is in 20secs! Be the first to answer to earn a point. The topic will be ${categoryName}! Good luck!`);
            yield (0, Utils_1.sleep)(17000);
            (0, Twitch_1.SendMessage)("!quizcontroller", `/slow 3`);
            ReadLeaderboardsFromFile();
            yield (0, Utils_1.sleep)(3000);
            quizActive = true;
            (0, Twitch_1.SendMessage)("!quizcontroller", `/announce QUIZ: ${question}`);
            yield (0, Utils_1.sleep)(30000);
            if (quizActive) {
                quizActive = false;
                (0, Twitch_1.SendMessage)("!quizcontroller", `/announce QUIZ: No one successfully answered the question. The answer was: ${answer}`);
                yield (0, Utils_1.sleep)(1000);
                (0, Twitch_1.SendMessage)("!quizcontroller", `/slowoff`);
            }
        }
    });
}
exports.StartQuiz = StartQuiz;
function onQuizHandler(user, msg) {
    return __awaiter(this, void 0, void 0, function* () {
        var username = msg.userInfo.displayName;
        if (quizActive) {
            if (quizCategories[categoryIndex].CategoryQuestions[questionIndex].Answers.findIndex((element) => {
                return element.toLowerCase() == msg.content.value.toLowerCase();
            }) >= 0) {
                quizActive = false;
                UpdateQuizScore(username, 1);
                (0, Twitch_1.SendMessage)("!quizcontroller", `/announce Congratulations ${username}! You answered the question correctly! The answer was: ${answer}.`);
                yield (0, Utils_1.sleep)(1000);
                (0, Twitch_1.SendMessage)("!quizcontroller", `/slowoff`);
            }
        }
    });
}
exports.onQuizHandler = onQuizHandler;
function DisplayQuizLeaderboards() {
    ReadLeaderboardsFromFile();
    leaderboards.sort((firstItem, secondItem) => secondItem.Score - firstItem.Score);
    var message = "QUIZ LEADERBOARDS Top 5: ";
    var learboardSize = 5 > leaderboards.length ? leaderboards.length : 5;
    for (var i = 0; i < learboardSize; i++) {
        message +=
            leaderboards[i].Username + " - " + leaderboards[i].Score + "pts | ";
    }
    (0, Twitch_1.SendMessage)("!quizleaderboard", message);
}
exports.DisplayQuizLeaderboards = DisplayQuizLeaderboards;
function GetMyQuizScore(msg) {
    ReadLeaderboardsFromFile();
    var originalMessage = msg.content.value;
    var score = 0;
    var user = msg.userInfo.displayName;
    if (originalMessage.split(" ").length >= 2) {
        user = originalMessage.split(" ")[1].trim();
    }
    for (var i = 0; i < leaderboards.length; i++) {
        if (leaderboards[i].Username == user) {
            score = leaderboards[i].Score;
            (0, Twitch_1.SendMessage)("!quizscore", `${user}'s Quiz Score is: ` + score);
            return;
        }
    }
    (0, Twitch_1.SendMessage)("!quizscore", `No score found for user: ${user}`);
}
exports.GetMyQuizScore = GetMyQuizScore;
function UpdateQuizScore(user, pointsChange) {
    for (var i = 0; i < leaderboards.length; i++) {
        if (leaderboards[i].Username == user) {
            leaderboards[i].Score += pointsChange;
            WriteLeaderboardsToFile();
            return;
        }
    }
    leaderboards.push({ Username: user, Score: pointsChange });
    WriteLeaderboardsToFile();
}
function ReadLeaderboardsFromFile() {
    try {
        const data = fs_1.default.readFileSync(leaderboardsFilePath + leaderboardsFileName, "utf8");
        leaderboards = JSON.parse(data);
    }
    catch (err) {
        console.error(err);
    }
}
function WriteLeaderboardsToFile() {
    try {
        const data = fs_1.default.writeFileSync(leaderboardsFilePath + leaderboardsFileName, JSON.stringify(leaderboards));
    }
    catch (err) {
        console.error(err);
    }
}
var halo1Questions = [
    {
        Question: "",
        Answers: [],
    },
];
var halo2Questions = [
    {
        Question: "",
        Answers: [],
    },
];
var halo3Questions = [
    {
        Question: "",
        Answers: [],
    },
];
var odstQuestions = [
    {
        Question: "Oni",
        Answers: ["Pog"],
    },
    {
        Question: "When watching Adversary and Heroic_Robb streams, Wingman953 coined what term?",
        Answers: ["Oni Pog"],
    },
    // Characters
    {
        Question: "During the events of Halo 3:ODST what is Buck's military rank?",
        Answers: ["Gunnery Sergeant"],
    },
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
    {
        Question: "During the events of Halo 3:ODST what is Dutch's military rank?",
        Answers: ["Corporal"],
    },
    {
        Question: "What is Mickey's name?",
        Answers: ["Michael Crespo", "Private First Class Michael Crespo"],
    },
    {
        Question: "During the events of Halo 3:ODST what is Mickey's military rank?",
        Answers: ["Private First Class"],
    },
    {
        Question: "What is Romeo's name?",
        Answers: ["Kojo Agu", "Lance Corporal Kojo Agu"],
    },
    {
        Question: "During the events of Halo 3:ODST what is Romeo's military rank?",
        Answers: ["Lance Corporal"],
    },
    {
        Question: "What is the full name of the engineer that goes by 'Virgil'?",
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
        Question: "In the audio log story, what food is Jonas the Butcher handing out for free?",
        Answers: ["Kebab", "Kebabs"],
    },
    // Weapons, vehicles, equipment
    {
        Question: "What is the name of the type of garbage trucks that operate in New Mombasa?",
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
        Question: "When was Halo 3:ODST released on the Xbox 360? (Answer in YYYY-MM-DD format)",
        Answers: ["2009-09-22", "2009-9-22"],
    },
    {
        Question: "What was the name originally given to game Halo 3:ODST before release?",
        Answers: ["Halo 3:Recon", "Halo 3: Recon", "Halo 3 Recon", "Recon"],
    },
    {
        Question: "Which Firefight character was a Halo 3:ODST pre-order bonus?",
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
        Question: "Nathan Fillion (voice of Buck) and Tricia Helfer (voice of Dare) both stare in a TV series called what?",
        Answers: ["The Rookie"], //The Rookie (Season 4, Episode 2) https://youtu.be/bHmRHWdnKP0
    },
    // Gameplay
    {
        Question: "Which UNSC ship can be seen going through the slipspace rupture in Prepare to Drop?",
        Answers: ["In Amber Clad"],
    },
    {
        Question: "The cutscene at the end of Uplift Reserve changes depending if the player is driving a Warthog, a Ghost or which other vehicle?",
        Answers: ["Chopper"],
    },
    {
        Question: "Which flashback mission has a different end cutscene when played on the Legendary difficulty?",
        Answers: ["NMPD HQ", "NMPD", "NMPDHQ"],
    },
    {
        Question: "How many audio logs are required to alter the events in the mission Data Hive?",
        Answers: ["29", "twenty-nine", "twenty nine", "twentynine"],
    },
    {
        Question: "When starting on Open Streets, what is contained with the extra supply cache that is unlocked?",
        Answers: ["Mongoose", "Mongeese", "Mongooses", "a Mongoose"],
    },
    {
        Question: "2 skulls where cut from the original release of Halo 3:ODST, one provided a 'directors style' commentary, what did the other skull do?",
        Answers: ["3rd person camera", "third person camera"], //More info here: https://youtu.be/9InGqBDgff8"
    },
    {
        Question: "How many skulls launched with the original version of Halo 3:ODST?",
        Answers: ["12", "twelve"],
    },
    {
        Question: "Halo 3 launched with 13 skulls, one was removed for the launch of Halo 3:ODST, which skull was removed?",
        Answers: ["Fog"],
    },
    {
        Question: "In Halo 3:ODST how many needles are required to supercombine?",
        Answers: ["12", "twelve"],
    },
    {
        Question: "On the mission Coastal Highway, The Rookie, Buck, Dare and Virgil hold out for pickup out the front of which facility?",
        Answers: [
            "Uplift Nature Reserve",
            "The Uplift Nature Reserve",
            "Uplift Reserve",
        ],
    },
    {
        Question: "On the mission Kikowani Station, on Legendary difficulty, on MCC, what character appears when triggering the sound que?",
        Answers: ["Hamish Beamish", "Beamish"],
    },
    {
        Question: "Which campaign level has the most Hunter spawns?",
        Answers: ["Mombasa Streets", "Streets"],
    },
    {
        Question: "How many unique Hunter spawns are there in the ODST campaign?",
        Answers: ["11", "eleven"],
    },
    {
        Question: "How many grunts spawn on the first highway section in Coastal Highway?",
        Answers: ["23", "twenty-three", "twentythree", "twenty three"],
    },
    {
        Question: "What word is written by hand on Mickey's helmet?",
        Answers: ["Mickey"],
    },
    // Achievements
    {
        Question: "What is the name of the MCC Achievement for completing Halo 3:ODST on Legendary in under 3hrs?",
        Answers: ["Nagato Makes Moving Easy"],
    },
    {
        Question: "What is the name of the MCC achievement that requires you to kill a drone with a flame grenade on Data Hive?",
        Answers: ["Firefly"],
    },
    {
        Question: "What is the name of the achievement to fly a banshee on Kizingo Blvd.?",
        Answers: ["Shiny...", "Shiny"],
    },
    {
        Question: 'The MCC achievement "Two Places, Same Time" requires the player to interact with which other character?',
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
        Question: "What is the name of the Firefight map set in the level Tayari Plaza?",
        Answers: ["Crater", "Crater (Day)", "Crater Day"],
    },
    {
        Question: "What is the name of the Firefight map set in the level Uplift Reserve?",
        Answers: ["Lost Platoon"],
    },
    {
        Question: "What is the name of the Firefight map set in the level Kizingo Blvd.?",
        Answers: ["Rally Point", "Rally Point (Day)", "Rally Point Day"],
    },
    {
        Question: "Alpha Site and which other Firefight map are set in the level ONI Alpha Site?",
        Answers: ["Security Zone"],
    },
    {
        Question: "Security Zone and which other Firefight map are set in the level ONI Alpha Site?",
        Answers: ["Alpha Site"],
    },
    {
        Question: "What is the name of the Firefight map set in the level NMPD HQ?",
        Answers: ["Windward"],
    },
    {
        Question: "What is the name of the Firefight map set in the level Data Hive?",
        Answers: ["Chasm Ten", "Chasm 10"],
    },
    {
        Question: "What is the name of the Firefight map set in the level Coastal Highway?",
        Answers: ["Last Exit"],
    },
    {
        Question: "The flamethrower and which other UNSC weapon from the campaign do not appear in standard Firefight settings on any map?",
        Answers: ["Assault Rifle", "AR"],
    },
    {
        Question: "Which campaign level is not represented with a Firefight map?",
        Answers: ["Kikowani Station", "Kikowani", "Kiko"],
    },
    {
        Question: "With standard Firefight settings, which skull is enabled from the start of Round 1?",
        Answers: ["Tough Luck"],
    },
    {
        Question: "With standard Firefight settings, which additional skull is enabled from the start of Round 2?",
        Answers: ["Catch"],
    },
    {
        Question: "With standard Firefight settings, which additional skull is enabled from the start of Round 3?",
        Answers: ["Black Eye"],
    },
    {
        Question: "With standard Firefight settings, which skull is enabled from the start of Set 2?",
        Answers: ["Tilt"],
    },
    {
        Question: "With standard Firefight settings, which additional skull is enabled from the start of Set 3?",
        Answers: ["Famine"],
    },
    {
        Question: "With standard Firefight settings, which additional skull is enabled from the start of Set 4?",
        Answers: ["Mythic"],
    },
    {
        Question: "In the original version of Firefight, which was the only skull that could not be enabled?",
        Answers: ["Thunderstorm"],
    },
    {
        Question: "The Vidmaster Challenge: Endure achievement requires 4 players to survive Heroic or Legendary firefight for how many rounds?",
        Answers: ["16", "sixteen"],
    },
    {
        Question: "With standard Firefight settings the player spawns with an SMG and an Automag on all maps except for one, which map is this?",
        Answers: ["Windward"],
    },
    // Quotes
    {
        Question: 'On what mission is the following quote said: "Look out! Chieftain!"',
        Answers: ["NMPD HQ", "NMPD"],
    },
    {
        Question: "On what mission is the following quote said: \"Trooper, we're pinned down! Flank through this building, hit 'em from behind!\"",
        Answers: ["Tayari Plaza", "Tayari"],
    },
    {
        Question: 'On what mission is the following quote said: "Wanna live? Then get your ass out of the street!"',
        Answers: [
            "Kizingo Blvd.",
            "Kizingo",
            "Kizingo Blvd",
            "Kizingo Boulevard",
        ],
    },
    {
        Question: "On what mission is the following quote said: \"What are you doing down here, anyway? Don't want to tell me? That's all right...we all have secrets.\"",
        Answers: ["Data Hive"],
    },
    {
        Question: 'On what mission is the following quote said: "Whew! Lord, that thing stinks. Kinda reminds me of my-"',
        Answers: ["Coastal Highway", "Coastal"],
    },
    {
        Question: 'Who says the following quote: "You know the music, time to dance."',
        Answers: ["Buck"],
    },
    {
        Question: 'Who says the following quote: "Your mama never loved ya and she dresses you funny."',
        Answers: ["Mickey"],
    },
    {
        Question: 'Who says the following quote: "I saw my life flash before me. It sucked."',
        Answers: ["Mickey"],
    },
    {
        Question: "Who says the following quote: \"It ain't logical. I mean, hell, I'll kill a man in a fair fight... or if I think he's gonna start a fair fight, or if he bothers me, or if there's a woman... (sniffs) or if I'm gettin' paid - mostly only when I'm gettin' paid.\"",
        Answers: ["Dutch"],
    },
    {
        Question: "Who says the following quote: \"Uh, Lord? I didn't train to be a pilot. Tell me I don't have any more flying to do today.\"",
        Answers: ["Dutch"],
    },
    {
        Question: 'Who says the following quote: "I\'m gonna kill you! With light!"',
        Answers: ["Romeo"],
    },
    {
        Question: 'Who says the following quote: "We went through hell for that?"',
        Answers: ["Romeo"],
    },
    {
        Question: 'Who says the following quote: "I recommend trying a lot harder."',
        Answers: ["Dare"],
    },
    {
        Question: 'Who says the following quote: "Trooper! Over here! I saw your pod hit... You\'re one lucky S.O.B."',
        Answers: [
            "Chips Dubbo",
            "Chips",
            "Chipps Dubbo",
            "Chipps Dubo",
            "Chips Dubo",
        ],
    },
    {
        Question: "The Covenant refer to Master Chief as the 'Demon', what name do they have for The Rookie and the other ODSTs?",
        Answers: ["Imp", "Imps"],
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
        Question: `Complete this quote (5 words): "I'll draw the turret's fire, ___ ___ ___ ___ ___"`,
        Answers: ["you take out the operator"],
    },
    {
        Question: `Complete this quote (3 words): "Gunny, I can fly a Pelican, ___ ___ ___?"`,
        Answers: ["but a Phantom"],
    },
    {
        Question: `Complete this quote (3 words): "Ah! This is the ___ ___ ___"`,
        Answers: ["best mission ever"],
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
        Question: "References to which game were removed in the re-release of Halo 3:ODST on Halo: The Master Chief Collection?",
        Answers: ["Destiny"],
    },
    {
        Question: "The Prepare to Drop cutscenes occurs inside which UNSC ship?",
        Answers: ["UNSC Say My Name", "Say My Name"],
    },
];
var reachQuestions = [
    {
        Question: "What is the name of the MCC Achievement for completing Halo: Reach on Legendary in under 3hrs?",
        Answers: ["Keep Your Foot on the Pedrogas"],
    },
    {
        Question: `The "KEEP IT CLEAN" Achievement is awarded to the player once they kill 7 what?`,
        Answers: ["Moa", "Moas"],
    },
    {
        Question: "What is the name of the achievement for performing an assassination against an Elite to survive a fall that would've been fatal.",
        Answers: ["If They Came to Hear Me Beg"],
    },
    {
        Question: "What is the name of the achievement for keeping the Scorpion intact in the mission The Package on Legendary.",
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
        Answers: ["Master Chief", "Chief"],
    },
    {
        Question: "In the original version of the game what is the name of the max commendation rank?",
        Answers: ["Onyx", "Onyx Rank"],
    },
    {
        Question: "Which Halo: Reach level is the only level in the game to feature the Gauss Warthog.",
        Answers: ["ONI: Sword Base", "Oni Sword Base"],
    },
    {
        Question: "Which Halo: Reach level is the only level in the game to feature the Troop Transport Warthog.",
        Answers: ["ONI: Sword Base", "Oni Sword Base"],
    },
    {
        Question: "How much total Sniper bullets do you start with on the mission Nightfall?",
        Answers: ["60", "Sixty"],
    },
    {
        Question: "All together, how many Main and Side Objectives are there in the mission New Alexandria?",
        Answers: ["13", "Thirteen"],
    },
    {
        Question: "How many cutscenes are there in the mission Long Night of Solace?",
        Answers: ["7", "Seven"],
    },
    {
        Question: "Which Halo: Reach level is the only mission without Elites?",
        Answers: ["Exodus"],
    },
    {
        Question: "Instead of a Falcon, the player was original going to be operating which vehicle around the city of New Alexandria?",
        Answers: ["Scarab"],
    },
    {
        Question: "In the mission New Alexandria, Club Errera features the same layout as which Firefight map?",
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
        Answers: ["fifty klicks"],
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
        Question: `Complete this quote (3 words): "Romeo Company, be advised: we have reports of _____ _____ _____."`,
        Answers: ["Covenant suicide squads"],
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
        Answers: ["Carter", "Nobel One", "Nobel 1"],
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
            "Nobel Six",
            "Nobel 6",
            "SPARTAN-B312",
            "SPARTAN B312",
            "B312",
        ],
    },
    {
        Question: `Who says the following quote: "Yes, well, as they say... news of my death has been greatly exaggerated."`,
        Answers: ["Halsey"],
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
        Question: "What is the name of first Nobel Six?",
        Answers: ["Thom"],
    },
    {
        Question: "What is the name of the tusked creater native to the planet Reach?",
        Answers: ["Guta"],
    },
    {
        Question: "What is the name of the AI that assists Nobel Team during the Fall of Reach?",
        Answers: ["Auntie Dot"],
    },
    {
        Question: "During the mission Long Night of Solace, which UNSC Frigate assists with the assault of the Corvette?",
        Answers: ["Savannah"],
    },
    {
        Question: "What language does Jorge speak when communicating with the inhabitants of Reach?",
        Answers: ["Hungarian"],
    },
    {
        Question: "What is the name of the ODST squad specialising in the use of Jetpacks?",
        Answers: ["Bullfrogs", "the bullfrogs", "bull-frogs", "bull frogs"],
    },
    {
        Question: "Who in Nobel Team was a SPARTAN-II?",
        Answers: ["Jorge"],
    },
    {
        Question: "On which plant was Jorge born on?",
        Answers: ["Reach"],
    },
    {
        Question: "On which plant was Emile born on?",
        Answers: ["Eridanus II"],
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
        Question: `The Grunt in a Barrel Easter Egg is found on which Multiplayer map?`,
        Answers: ["Penance"],
    },
    {
        Question: `Exodus`,
        Answers: ["Exodus"],
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
];
var halo4Questions = [
    {
        Question: "",
        Answers: [],
    },
];
var halo5Questions = [
    {
        Question: `The Halo 5 achievement "Tank Still Beats Everything" is a call-back to an achievement in which game?`,
        Answers: ["Halo: Reach", "Halo Reach", "Reach"],
    },
];
var haloInfiniteQuestions = [
    {
        Question: "",
        Answers: [],
    },
];
var franchiseQuestions = [
    {
        Question: "",
        Answers: [],
    },
];
var halorunsQuestions = [
    // Submissions & WR Stats
    {
        Question: "Who has the longest unbroken streak as a Full Game World Record holder?",
        Answers: ["GarishGoblin", "Garish"],
    },
    {
        Question: "Who held the single longest unbroken Full Game World Record time?",
        Answers: ["c0ry123", "cory123", "cory", "c0ry"],
    },
    {
        Question: "In Halo CE Speedrunning, Keyes and which other IL has more Legendary submissions than Easy?",
        Answers: ["Assault of the Control Room", "Aotcr"],
    },
    {
        Question: "In Halo 3:ODST Speedrunning, which IL has the most submissions on the Easy difficulty?",
        Answers: ["Tayari Plaza", "Tayari"],
    },
    {
        Question: "In Halo 3:ODST Speedrunning, which IL has the most submissions on the Legendary difficulty?",
        Answers: ["Uplift Reserve", "Uplift"],
    },
    {
        Question: "Who holds the slowest IL WR?",
        Answers: ["Wingman953", "Wingman"],
    },
    {
        Question: "As a percentage, which Halo 3:ODST IL WR is the fastest when compared to it's MCC Par Time?",
        Answers: ["Kikowani Station", "Kikowani", "Kiko"],
    },
    {
        Question: "The NMPD HQ Easy IL WR stood for 4.5yrs until Adversary beat it by 1 sec on 19th Jan 2020. Who previously held the WR?",
        Answers: ["HLGNagato", "Nagato"],
    },
    {
        Question: "The first sub-1hr Halo 3:ODST time was achieved by who?",
        Answers: ["Harc", "HarcTehShark"],
    },
    {
        Question: "The first sub-1hr Halo: Reach time was achieved by who?",
        Answers: ["Seclusive"],
    },
    {
        Question: "Wingman953 set his first IL WR on ONI Alpha Site. What was the next level that he set a WR on?",
        Answers: ["Coastal Highway", "Coastal"],
    },
    {
        Question: "Wingman953, SkilledGames_ & Zombie343 set the ONI Alpha Site Easy Co-op WR in an RTA time of 10:42, what was the In-Game time?",
        Answers: ["7:46"],
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
        Question: "In 2019 Halo: Reach was run at AGDQ by 2 speedrunners, name one of them.",
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
        Answers: ["ProAceJoker", "Joker"],
    },
    {
        Question: "In 2015 Halo 3 was run at SGDQ by which speedrunner?",
        Answers: ["TheBlazeJp", "BlazeJp"],
    },
    {
        Question: "In 2015 Halo 2 was run at AGDQ by 2 speedrunners, name one of them.",
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
        Question: "Which team won the HaloRuns Legendary Relay Race at the end of 2021?",
        Answers: ["Green Team", "Green"],
    },
    {
        Question: "Which team won the HaloRuns Legendary Relay Race at the start of 2021?",
        Answers: ["Green Team", "Green"],
    },
    {
        Question: "Which team won the HaloRuns Legendary Relay Race at the start of 2020?",
        Answers: ["Red Team", "Red"],
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
    // Surpise WRs
    {
        Question: "In March 2016 SkilledGames_ set the Legendary IL WR for which level?",
        Answers: ["NMPD HQ", "NMPD"],
    },
    {
        Question: '2019 was named the "Year of ODST" by which speedrunner?',
        Answers: ["Adversary"],
    },
    {
        Question: "Adversary achieved his first Legendary IL WR ever on which level?",
        Answers: ["Kikowani Station", "Kikowani", "Kiko"],
    },
    {
        Question: "In 2020 SkilledGames_ set a new Uplift Easy WR with a time of 2:12, which runner previously held the WR?",
        Answers: ["Sorix", "TehSorix"],
    },
    {
        Question: "In 2016 a_royal_hobo battled out with which other runner for Kikowani Station WR?",
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
    // Strats
    {
        Question: 'The trick known as "The Charpet" is named after which speedrunner?',
        Answers: ["Chappified", "Chappy"],
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
        Question: "In Halo 3:ODST Speedrunning, if I was performing the Robb Special I would be on which level?",
        Answers: [
            "Mombasa Streets",
            "Streets",
            "Mombasa Streets 3",
            "Streets 3",
            "MS3",
        ],
    },
    {
        Question: "In Halo 3:ODST Speedrunning, if I was performing the Catwalk Launch I would be on which level?",
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
];
var quizCategories = [
    // {
    //     CategoryQuestions: halo1Questions,
    //     CategoryName: "Halo CE",
    //     CategoryLength: halo1Questions.length,
    // },
    // {
    //     CategoryQuestions: halo2Questions,
    //     CategoryName: "Halo 2",
    //     CategoryLength: halo2Questions.length,
    // },
    // {
    //     CategoryQuestions: halo3Questions,
    //     CategoryName: "Halo 3",
    //     CategoryLength: halo3Questions.length,
    // },
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
    // {
    //     CategoryQuestions: halo4Questions,
    //     CategoryName: "Halo 4",
    //     CategoryLength: halo4Questions.length,
    // },
    // {
    //     CategoryQuestions: halo5Questions,
    //     CategoryName: "Halo 5",
    //     CategoryLength: halo5Questions.length,
    // },
    // {
    //     CategoryQuestions: haloInfiniteQuestions,
    //     CategoryName: "Halo Infinite",
    //     CategoryLength: haloInfiniteQuestions.length,
    // },
    // {
    //     CategoryQuestions: franchiseQuestions,
    //     CategoryName: "Halo Franchise",
    //     CategoryLength: franchiseQuestions.length,
    // },
    {
        CategoryQuestions: halorunsQuestions,
        CategoryName: "HaloRuns/Speedrunning",
        CategoryLength: halorunsQuestions.length,
    },
];
