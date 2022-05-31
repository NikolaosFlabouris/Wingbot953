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
exports.SendMessage = exports.TwitchSetup = void 0;
const auth_1 = require("@twurple/auth");
const chat_1 = require("@twurple/chat");
const api_1 = require("@twurple/api");
const pubsub_1 = require("@twurple/pubsub");
const open_1 = __importDefault(require("open"));
const readline_1 = __importDefault(require("readline"));
const VipWelcome_1 = require("../Commands/VipWelcome");
const Utils_1 = require("../Commands/Utils");
const GeneralCommands_1 = require("../Commands/GeneralCommands");
const Quotes_1 = require("../Commands/Quotes");
const Quiz_1 = require("../Commands/Quiz");
const FastFacts_1 = require("../Commands/FastFacts");
const Spotify_1 = require("./Spotify");
var debug = false;
let twitchAccessToken;
var authProvider;
let chatClient;
let apiClient;
var authorizeURL = `https://id.twitch.tv/oauth2/authorize?` +
    `client_id=${process.env.TWITCH_CLIENT_ID}` +
    `&redirect_uri=${process.env.TWITCH_REDIRECT_URI}` +
    `&response_type=code` +
    `&scope=chat:read+` +
    `chat:edit+` +
    `channel:read:redemptions+` +
    `channel:moderate+` +
    `channel:read:subscriptions+` +
    `channel:read:predictions+` +
    `channel:read:polls+` +
    `channel:read:goals`;
function TwitchSetup() {
    return __awaiter(this, void 0, void 0, function* () {
        GenerateCommandsList();
        var rl = readline_1.default.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        var authWindow = (0, open_1.default)(authorizeURL, { app: { name: "msedge" } });
        yield new Promise((response) => rl.question("Please enter in the Twitch token: ", (ans) => __awaiter(this, void 0, void 0, function* () {
            rl.close();
            twitchAccessToken = yield (0, auth_1.exchangeCode)(process.env.TWITCH_CLIENT_ID, process.env.TWITCH_CLIENT_SECRET, ans, process.env.TWITCH_REDIRECT_URI);
            response(ans);
        })));
        authProvider = new auth_1.RefreshingAuthProvider({
            clientId: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            onRefresh: (newTokenData) => __awaiter(this, void 0, void 0, function* () {
                twitchAccessToken = newTokenData;
            }),
        }, twitchAccessToken);
        chatClient = new chat_1.ChatClient({
            authProvider,
            channels: ["Wingman953"],
        });
        chatClient.onConnect(() => {
            console.log("* Connected!");
        });
        apiClient = new api_1.ApiClient({
            authProvider,
        });
        yield chatClient.connect();
        const pubSubClient = new pubsub_1.PubSubClient();
        // Automatic messages on timers
        var quizInterval = setInterval(Quiz_1.StartQuiz, 2100000); // 35mins
        //var didYouKnowInterval = setInterval(SendDidYouKnowFact, 2580000) // 43mins
        var periodicMessagesInterval = setInterval(PeriodicMessages, 2580000); // 43mins
        chatClient.onMessage((channel, user, message, msg) => __awaiter(this, void 0, void 0, function* () {
            // Ignore messages from the bot
            if (msg.userInfo.displayName === "Wingbot953") {
                return;
            }
            if (msg.isRedemption) {
                console.log("Redemption redeemed");
                console.log(msg);
            }
            if (debug)
                console.log(`DEBUG: User message received from ${msg.userInfo.displayName.toLowerCase()}: ${message}`);
            (0, VipWelcome_1.CheckForVipWelcome)(msg.userInfo.displayName);
            (0, Quiz_1.onQuizHandler)(user, msg);
            // MONITOR PERFORMANCE, IF POOR UNCOMMENT BELOW TO FILTER MESSAGES
            // Remove whitespace and make lowercase.
            // const command = msg.split(" ")[0].trim().toLowerCase()
            // Ignore messages that don't begin with an exclamation mark.
            // if (command.charAt(0) != "!") {
            //     return
            // }
            if (debug)
                console.log("DEBUG: Command handling");
            /* COMMAND DICTIONARIES */
            if (SearchCommandDictionary(msg, GeneralCommands_1.commandMap)) {
                return;
            }
            if (SearchCommandDictionary(msg, Quotes_1.quoteMap)) {
                return;
            }
            if (SearchCommandDictionary(msg, functionMap)) {
                return;
            }
            if (msg.content.value.charAt(0) == "!") {
                SendMessage(message.split(" ")[0].trim().toLowerCase(), "Unknown command");
            }
        }));
        chatClient.onSub((channel, user) => {
            SendMessage("subthanks", `Thank you @${user} for subscribing to the channel!`, 1000);
        });
        chatClient.onResub((channel, user, subInfo) => {
            SendMessage("resubthanks", `Thank you @${user} for subscribing to the channel for a total of ${subInfo.months} months!`, 1000);
        });
        chatClient.onSubGift((channel, user, subInfo) => {
            SendMessage("giftsubthanks", `Thank you ${subInfo.gifter} for gifting a subscription to ${user}!`, 1000);
        });
        const userId = yield pubSubClient.registerUserListener(authProvider);
        const listener = yield pubSubClient.onRedemption(userId, (message) => {
            console.log(message);
            if (message.rewardTitle === "Start a Quiz Round") {
                (0, Quiz_1.StartQuiz)();
            }
        });
    });
}
exports.TwitchSetup = TwitchSetup;
function SendMessage(command, message, minDelay = 0, maxDelay = 0) {
    var delay = minDelay;
    if (minDelay > 0 && maxDelay > 0) {
        delay = (0, Utils_1.Between)(minDelay, maxDelay);
    }
    setTimeout(() => {
        try {
            chatClient.say("Wingman953", message);
            console.log(`* Executed ${command} command with the following response: ${message}`);
        }
        catch (error) {
            console.log(`* ERROR: Executed ${command} and FAILED to send the following response: ${error.message}`);
        }
    }, delay);
}
exports.SendMessage = SendMessage;
var periodicMessages = [
    "/me Enjoying the stream? Watching, chatting, following, cheering or subscribing are all great ways to support the stream. Your support allows me to continue investing time into the channel and it is greatly appreciated!",
    "/me Got a song suggestion? Feel free to share it with the streamer and it may be added to the stream playlist!",
];
function PeriodicMessages() {
    SendMessage("channelsupport", periodicMessages[(0, Utils_1.Between)(0, periodicMessages.length - 1)]);
}
function HandleFollowAge(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        const follow = yield apiClient.users.getFollowFromUserToBroadcaster(msg.userInfo.userId, msg.channelId);
        if (follow) {
            const currentTimestamp = Date.now();
            const followStartTimestamp = follow.followDate.getTime();
            SendMessage("!followage", `@${msg.userInfo.displayName} You have been following for ${(0, Utils_1.SecondsToDuration)((currentTimestamp - followStartTimestamp) / 1000)}!`);
        }
        else {
            SendMessage("!followage", `@${msg.userInfo.displayName} You are not following!`);
        }
    });
}
function HandleUptime(msg) {
    return __awaiter(this, void 0, void 0, function* () {
        const channel = yield apiClient.channels.getChannelInfoById(msg.channelId);
        const stream = yield apiClient.streams.getStreamByUserName(channel === null || channel === void 0 ? void 0 : channel.displayName);
        if (stream) {
            const currentTimestamp = Date.now();
            const streamStartTimestamp = stream.startDate.getTime();
            SendMessage("!uptime", `@${msg.userInfo.displayName} Stream uptime: ${(0, Utils_1.SecondsToDuration)((currentTimestamp - streamStartTimestamp) / 1000)}`);
        }
        else {
            console.log("* ERROR Failed to get stream uptime.");
        }
    });
}
///
/// Searches the given command dictionary and performs the required
/// actions if a command is found.
///
function SearchCommandDictionary(msg, commandDictionary) {
    var command = msg.content.value.split(" ")[0].trim().toLowerCase();
    for (var i = 0; i < commandDictionary.length; i++) {
        // Check if the command exists.
        if (commandDictionary[i].Command.includes(command)) {
            // Check if the user is authorised.
            if (commandDictionary[i].Username &&
                !commandDictionary[i].Username.includes(msg.userInfo.displayName)) {
                continue;
            }
            if (commandDictionary[i].Function) {
                if (debug)
                    console.log("DEBUG: Running function");
                commandDictionary[i].Function(msg);
            }
            else if (commandDictionary[i].AllMessages) {
                if (debug)
                    console.log("DEBUG: Sending all messages for command");
                // Send all messages.
                for (var commandMessageIndex = 0; commandMessageIndex < commandDictionary[i].Message.length; commandMessageIndex++) {
                    SendMessage(command, commandDictionary[i].Message[commandMessageIndex]);
                }
            }
            else {
                // Pick a random message from the list and send.
                var commandMessageIndex = (0, Utils_1.Between)(0, commandDictionary[i].Message.length - 1);
                if (debug)
                    console.log("DEBUG: Sending random message from list");
                SendMessage(command, commandDictionary[i].Message[commandMessageIndex]);
            }
            return true;
        }
    }
    return false;
}
let commandsList;
// Generates and the commands list
function GenerateCommandsList() {
    var list = [];
    // Generate commands list
    for (var i = 0; i < GeneralCommands_1.commandMap.length; i++) {
        if (list.indexOf(GeneralCommands_1.commandMap[i].Command[0]) < 0 &&
            GeneralCommands_1.commandMap[i].Command[0].includes("!")) {
            list.push(GeneralCommands_1.commandMap[i].Command[0]);
        }
    }
    for (var i = 0; i < Quotes_1.quoteMap.length; i++) {
        if (list.indexOf(Quotes_1.quoteMap[i].Command[0]) < 0) {
            list.push(Quotes_1.quoteMap[i].Command[0]);
        }
    }
    for (var i = 0; i < functionMap.length; i++) {
        if (list.indexOf(functionMap[i].Command[0]) < 0) {
            list.push(functionMap[i].Command[0]);
        }
    }
    list.sort();
    commandsList = list[0];
    for (var i = 1; i < list.length; i++) {
        commandsList = commandsList + " " + list[i];
    }
}
function HandleCommandsList() {
    // Commands list too long, split somehow
    SendMessage("!commandslist", commandsList);
}
var functionMap = [
    {
        Command: ["!commands", "!commandsList"],
        Function: HandleCommandsList,
    },
    {
        Command: ["!random"],
        Function: GeneralCommands_1.HandleRandomNumberGeneration,
    },
    {
        Command: ["!odstquote", "!odstquotes"],
        Function: Quotes_1.HandleOdstQuote,
    },
    {
        Command: ["!fastfact"],
        Function: FastFacts_1.HandleFastFact,
    },
    // Twitch
    {
        Command: ["!followage"],
        Function: HandleFollowAge,
    },
    {
        Command: ["!uptime"],
        Function: HandleUptime,
    },
    // Spotify
    {
        Command: ["!song"],
        Function: Spotify_1.GetCurrentSong,
    },
    // Quiz
    {
        Command: ["!quizstart"],
        Username: ["Wingman953"],
        Function: Quiz_1.StartQuiz,
    },
    {
        Command: ["!quizscore", "!score"],
        Function: Quiz_1.GetMyQuizScore,
    },
    {
        Command: [
            "!quizleaderboard",
            "!quizleaderboards",
            "!leaderboards",
            "!leaderboard",
        ],
        Function: Quiz_1.DisplayQuizLeaderboards,
    },
];
