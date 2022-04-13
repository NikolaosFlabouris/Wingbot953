import { HandleCommandsList } from "../Wingbot953.js"
import { HandleRandomNumberGeneration } from "./GeneralCommands.mjs"
import { HandleOdstQuote } from "./Quotes.mjs"
import { HandleFastFact } from "./FastFacts.mjs"
import { StartQuiz } from "./Quiz.mjs"

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
    {
        Command: ["!quizstart"],
        Username: ["Wingman953"],
        Function: StartQuiz,
    },
]
