import { HandleCommandsList } from "../Wingbot953.js"
import { HandleRandomNumberGeneration } from "./GeneralCommands.mjs"
import { HandleOdstQuote } from "./Quotes.mjs"
import { HandleFastFact } from "./FastFacts.mjs"
import { StartQuiz, GetMyQuizScore, DisplayQuizLeaderboards } from "./Quiz.mjs"
import {
    GetCurrentSong,
    //SpotifySetup,
} from "../ExternalIntegrations/spotify.js"

export var functionMap = [
    {
        Command: ["!commands", "!commandsList"],
        Function: HandleCommandsList,
    },
    {
        Command: ["!random"],
        Function: HandleRandomNumberGeneration,
    },
    {
        Command: ["!odstquote", "!odstquotes"],
        Function: HandleOdstQuote,
    },
    {
        Command: ["!fastfact"],
        Function: HandleFastFact,
    },
    // Spotify
    {
        Command: ["!song"],
        Function: GetCurrentSong,
    },
    // {
    //     Command: ["!songsetup", "!spotifysetup"],
    //     Username: ["Wingman953"],
    //     Function: SpotifySetup,
    // },
    // Quiz
    {
        Command: ["!quizstart"],
        Username: ["Wingman953"],
        Function: StartQuiz,
    },
    {
        Command: ["!quizscore"],
        Function: GetMyQuizScore,
    },
    {
        Command: ["!quizleaderboard", "!quizleaderboards"],
        Function: DisplayQuizLeaderboards,
    },
]
