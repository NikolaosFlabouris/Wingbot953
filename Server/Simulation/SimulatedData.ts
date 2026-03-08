import { UnifiedChatMessage } from "../../Common/UnifiedChatMessage"
import {
    buildFollowMessage,
    buildHypeTrainBeginMessage,
    buildHypeTrainEndMessage,
    buildPollBeginMessage,
    buildPollEndMessage,
    buildPredictionBeginMessage,
    buildPredictionEndMessage,
    buildShoutoutReceiveMessage,
    buildSubMessage,
    buildResubMessage,
    buildSubGiftMessage,
    buildRaidMessage,
    buildCommunitySubMessage,
    buildGiftPaidUpgradeMessage,
    buildPrimePaidUpgradeMessage,
    buildStandardPayForwardMessage,
    buildCommunityPayForwardMessage,
} from "../Integrations/TwitchLogic"

/**
 * Simulated usernames for generating fake chat messages
 */
const twitchUsernames = [
    "SimTwitchUser1",
    "HaloSpeedrunner",
    "ODSTFanatic",
    "CasualWatcher",
    "QuizMaster99",
    "SpeedrunNewbie",
    "VIPSimUser",
    "ModSimUser",
    "SubSimUser",
    "LongTimeViewer",
]

const youtubeUsernames = [
    "SimYouTubeUser1",
    "HaloLoreFan",
    "YouTubeChatter",
    "StreamEnjoyer",
    "QuizAnswerer",
]

/**
 * Chat messages categorised by type for realistic simulation
 */
const generalChatMessages = [
    "Hello everyone!",
    "Great stream today",
    "lol nice one",
    "GG",
    "This run is looking clean",
    "is this PB pace?",
    "first time watching, this is cool",
    "what game is this?",
    "how long have you been speedrunning?",
    "that was a sick trick",
    "do you always play ODST?",
    "nice movement!",
    "the music is great",
    "what controller do you use?",
    "is ODST the best Halo?",
    "lets gooooo",
]

const commandMessages = [
    "!quiz",
    "!discord",
    "!faq",
    "!lurk",
    "!odst",
    "!quote",
    "!song",
    "!playlist",
    "!emotes",
    "!youtube",
    "!twitch",
    "!haloruns",
    "!random 1 100",
    "!commands",
    "!leaderboards",
    "!score",
    "!fastfact",
    "!holdw",
    "!easy",
    "!noreset",
]

/**
 * Known quiz answers for simulating quiz participation.
 * These are common answers across multiple quiz categories.
 */
const quizAnswerAttempts = [
    "Master Chief",
    "The Rookie",
    "Buck",
    "Cortana",
    "Sergeant Johnson",
    "343 Guilty Spark",
    "Halo 3",
    "ODST",
    "Easy",
    "Legendary",
    "Mombasa",
    "New Mombasa",
    "Covenant",
    "Flood",
    "Warthog",
    "Pelican",
    "Assault Rifle",
    "Energy Sword",
    "Brute Shot",
    "Spartan Laser",
    "3",
    "4",
    "7",
    "117",
    "Tayari Plaza",
    "Data Hive",
    "Coastal Highway",
    "ONI Alpha Site",
]

/**
 * Message profiles control the probability distribution of message types
 */
export interface SimulationProfile {
    name: string
    description: string
    /** Probability weights: [general, command, quizAnswer] - should sum to 100 */
    weights: [number, number, number]
    /** Interval between messages in milliseconds */
    intervalMs: number
}

export const simulationProfiles: Record<string, SimulationProfile> = {
    normal: {
        name: "Normal Chat",
        description: "Mix of general chat with occasional commands",
        weights: [70, 25, 5],
        intervalMs: 3000,
    },
    commands: {
        name: "Command Heavy",
        description: "Frequent command usage for testing command handling",
        weights: [30, 65, 5],
        intervalMs: 2000,
    },
    quiz: {
        name: "Quiz Session",
        description: "Simulates an active quiz with frequent answer attempts",
        weights: [20, 10, 70],
        intervalMs: 1500,
    },
    quiet: {
        name: "Quiet Chat",
        description: "Slower pace with mostly general chat",
        weights: [85, 10, 5],
        intervalMs: 8000,
    },
}

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generates a simulated chat message based on the given profile
 */
export function generateSimulatedMessage(
    platform: "twitch" | "youtube",
    profile: SimulationProfile = simulationProfiles.normal
): UnifiedChatMessage {
    const usernames = platform === "twitch" ? twitchUsernames : youtubeUsernames
    const name = randomFrom(usernames)

    // Select message type based on weighted probability
    const roll = Math.random() * 100
    let messageText: string

    if (roll < profile.weights[0]) {
        messageText = randomFrom(generalChatMessages)
    } else if (roll < profile.weights[0] + profile.weights[1]) {
        messageText = randomFrom(commandMessages)
    } else {
        messageText = randomFrom(quizAnswerAttempts)
    }

    return {
        id: `sim-${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        platform,
        timestamp: new Date(),
        channel: {
            id: `sim-channel-${platform}`,
            name: "Wingman953",
        },
        author: {
            id: `sim-${platform}-${name.toLowerCase()}`,
            name: name.toLowerCase(),
            displayName: name,
            isModerator: name === "ModSimUser",
            isSubscriber: name === "SubSimUser" || name === "VIPSimUser" || Math.random() < 0.3,
            isOwner: false,
        },
        message: {
            text: messageText,
        },
    }
}

/**
 * Special event types that can be simulated.
 * Each returns a bot notification message and an optional user message.
 */
type SimulatedEvent = () => {
    botMessage: UnifiedChatMessage
    userMessage?: UnifiedChatMessage
}

function makeBotMessage(text: string, messageType: string, extra?: Partial<UnifiedChatMessage["twitchSpecific"]>): UnifiedChatMessage {
    return {
        id: `sim-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "twitch",
        timestamp: new Date(),
        channel: { id: "sim-channel-twitch", name: "Wingman953" },
        author: { name: "wingbot953", displayName: "Wingbot953" },
        message: { text },
        twitchSpecific: { messageType: messageType as UnifiedChatMessage["twitchSpecific"] extends { messageType?: infer T } ? T : never, isHighlighted: true, ...extra },
    }
}

function makeUserEventMessage(displayName: string, text: string): UnifiedChatMessage {
    return {
        id: `sim-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        platform: "twitch",
        timestamp: new Date(),
        channel: { id: "sim-channel-twitch", name: "Wingman953" },
        author: {
            id: `sim-twitch-${displayName.toLowerCase()}`,
            name: displayName.toLowerCase(),
            displayName,
            isSubscriber: true,
        },
        message: { text },
    }
}

const specialEvents: SimulatedEvent[] = [
    // Follow
    () => {
        const user = randomFrom(twitchUsernames)
        return { botMessage: makeBotMessage(buildFollowMessage(user), "follow") }
    },
    // Hype Train Begin
    () => {
        const level = randomFrom([1, 2, 3])
        return { botMessage: makeBotMessage(buildHypeTrainBeginMessage(level), "hypetrain") }
    },
    // Hype Train End
    () => {
        const level = randomFrom([2, 3, 4, 5])
        return { botMessage: makeBotMessage(buildHypeTrainEndMessage(level), "hypetrain") }
    },
    // Poll Begin
    () => {
        const title = randomFrom(["Best Halo game?", "Next game to play?", "Favourite weapon?"])
        const choices = title === "Best Halo game?"
            ? ["Halo 3", "ODST", "Reach", "CE"]
            : title === "Next game to play?"
                ? ["Halo CE", "Halo 2", "Halo Infinite"]
                : ["Energy Sword", "BR", "Sniper", "Rockets"]
        return { botMessage: makeBotMessage(buildPollBeginMessage(title, choices), "poll") }
    },
    // Poll End
    () => {
        const title = randomFrom(["Best Halo game?", "Favourite weapon?"])
        const winner = title === "Best Halo game?" ? "ODST" : "Energy Sword"
        const votes = randomFrom([42, 87, 156, 203])
        return { botMessage: makeBotMessage(buildPollEndMessage(title, winner, votes), "poll") }
    },
    // Prediction Begin
    () => {
        const title = randomFrom(["Will streamer PB?", "Will the run survive?", "Death before boss?"])
        const outcomes = ["Yes", "No"]
        return { botMessage: makeBotMessage(buildPredictionBeginMessage(title, outcomes), "prediction") }
    },
    // Prediction End
    () => {
        const title = randomFrom(["Will streamer PB?", "Will the run survive?"])
        const winner = randomFrom(["Yes", "No"])
        return { botMessage: makeBotMessage(buildPredictionEndMessage(title, winner), "prediction") }
    },
    // Shoutout Receive
    () => {
        const broadcaster = randomFrom(["SpeedGamerX", "HaloProPlayer", "RetroRunnerTV"])
        return { botMessage: makeBotMessage(buildShoutoutReceiveMessage(broadcaster), "shoutout") }
    },
    // New subscription
    () => {
        const user = randomFrom(twitchUsernames)
        const months = randomFrom([1, 1, 1, 3, 6])
        return {
            botMessage: makeBotMessage(buildSubMessage(user, months), "sub"),
            userMessage: Math.random() < 0.5 ? makeUserEventMessage(user, "Glad to support the channel!") : undefined,
        }
    },
    // Resubscription
    () => {
        const user = randomFrom(twitchUsernames)
        const months = randomFrom([2, 3, 6, 12, 24])
        return {
            botMessage: makeBotMessage(buildResubMessage(user, months), "resub"),
            userMessage: makeUserEventMessage(user, `Been here for ${months} months now, love the streams!`),
        }
    },
    // Gift sub
    () => {
        const gifter = randomFrom(twitchUsernames)
        const recipient = randomFrom(twitchUsernames.filter(u => u !== gifter))
        return {
            botMessage: makeBotMessage(buildSubGiftMessage(gifter, recipient), "subgift"),
        }
    },
    // Community sub bomb
    () => {
        const gifter = randomFrom(twitchUsernames)
        const count = randomFrom([5, 10, 20, 50])
        return {
            botMessage: makeBotMessage(buildCommunitySubMessage(gifter, count), "communitysub", { giftCount: count }),
            userMessage: Math.random() < 0.3 ? makeUserEventMessage(gifter, "Subs for everyone!") : undefined,
        }
    },
    // Raid
    () => {
        const raider = randomFrom(["SpeedGamerX", "HaloProPlayer", "RetroRunnerTV", "CasualStreamer42"])
        const viewers = randomFrom([5, 15, 50, 150, 500])
        return {
            botMessage: makeBotMessage(buildRaidMessage(raider, viewers), "sub"),
        }
    },
    // Gift paid upgrade
    () => {
        const user = randomFrom(twitchUsernames)
        const gifter = randomFrom(twitchUsernames.filter(u => u !== user))
        return {
            botMessage: makeBotMessage(buildGiftPaidUpgradeMessage(user, gifter), "giftpaidupgrade", { originalGifter: gifter }),
            userMessage: Math.random() < 0.5 ? makeUserEventMessage(user, "Time to pay it forward!") : undefined,
        }
    },
    // Prime paid upgrade
    () => {
        const user = randomFrom(twitchUsernames)
        return {
            botMessage: makeBotMessage(buildPrimePaidUpgradeMessage(user), "primepaidupgrade"),
        }
    },
    // Standard pay forward
    () => {
        const forwarder = randomFrom(twitchUsernames)
        const recipient = randomFrom(twitchUsernames.filter(u => u !== forwarder))
        const originalGifter = randomFrom(twitchUsernames.filter(u => u !== forwarder && u !== recipient))
        return {
            botMessage: makeBotMessage(
                buildStandardPayForwardMessage(forwarder, recipient, originalGifter),
                "payforward", { originalGifter }
            ),
        }
    },
    // Community pay forward
    () => {
        const forwarder = randomFrom(twitchUsernames)
        const originalGifter = randomFrom(twitchUsernames.filter(u => u !== forwarder))
        return {
            botMessage: makeBotMessage(
                buildCommunityPayForwardMessage(forwarder, originalGifter),
                "payforward", { originalGifter }
            ),
        }
    },
    // Announcement
    () => ({
        botMessage: {
            id: `sim-event-${Date.now()}`,
            platform: "twitch" as const,
            timestamp: new Date(),
            channel: { id: "sim-channel-twitch", name: "Wingman953" },
            author: {
                id: "sim-twitch-modsimuser",
                name: "modsimuser",
                displayName: "ModSimUser",
                isModerator: true,
            },
            message: { text: randomFrom([
                "Remember to follow and turn on notifications!",
                "Check out the Discord server - link in the description!",
                "Raids incoming, stay tuned!",
                "New PB attempt starting soon!",
            ]) },
            twitchSpecific: {
                messageType: "announcement" as const,
                announcementColor: randomFrom(["PRIMARY", "BLUE", "GREEN", "ORANGE", "PURPLE"]),
                isHighlighted: true,
            },
        },
    }),
    // Ban (admin-only)
    () => {
        const user = "TroubleMaker" + Math.floor(Math.random() * 100)
        return {
            botMessage: {
                id: `sim-event-${Date.now()}`,
                platform: "twitch" as const,
                timestamp: new Date(),
                channel: { id: "sim-channel-twitch", name: "Admin" },
                author: { name: user, displayName: user },
                message: { text: `${user} has been banned.` },
                twitchSpecific: { messageType: "ban" as const },
            },
        }
    },
    // Timeout (admin-only)
    () => {
        const user = randomFrom(twitchUsernames)
        const duration = randomFrom([60, 300, 600])
        return {
            botMessage: {
                id: `sim-event-${Date.now()}`,
                platform: "twitch" as const,
                timestamp: new Date(),
                channel: { id: "sim-channel-twitch", name: "Admin" },
                author: { name: user.toLowerCase(), displayName: user },
                message: { text: `${user} has been timed out for ${duration} seconds.` },
                twitchSpecific: { messageType: "timeout" as const, timeoutDuration: duration },
            },
        }
    },
    // Action (/me)
    () => {
        const user = randomFrom(twitchUsernames)
        const action = randomFrom([
            "is cheering for the PB!",
            "waves at chat",
            "is hyped for the next run",
            "dances in excitement",
        ])
        return {
            botMessage: {
                id: `sim-event-${Date.now()}`,
                platform: "twitch" as const,
                timestamp: new Date(),
                channel: { id: "sim-channel-twitch", name: "Wingman953" },
                author: {
                    id: `sim-twitch-${user.toLowerCase()}`,
                    name: user.toLowerCase(),
                    displayName: user,
                },
                message: { text: action },
                twitchSpecific: { messageType: "action" as const },
            },
        }
    },
    // Raid cancel (admin-only)
    () => {
        const raider = randomFrom(["SpeedGamerX", "HaloProPlayer", "RetroRunnerTV"])
        return {
            botMessage: {
                id: `sim-event-${Date.now()}`,
                platform: "twitch" as const,
                timestamp: new Date(),
                channel: { name: "Admin" },
                author: { name: raider.toLowerCase(), displayName: raider },
                message: { text: `Raid from ${raider} was cancelled.` },
                twitchSpecific: { messageType: "raidcancel" as const },
            },
        }
    },
    // Message remove (admin-only)
    () => {
        const user = randomFrom(twitchUsernames)
        return {
            botMessage: {
                id: `sim-deleted-${Date.now()}`,
                platform: "twitch" as const,
                timestamp: new Date(),
                channel: { id: "sim-channel-twitch", name: "Admin" },
                author: { name: user.toLowerCase(), displayName: user },
                message: { text: "[message deleted]" },
                twitchSpecific: { messageType: "messageremove" as const },
            },
        }
    },
]

/**
 * Generates a random simulated special event (follow, hype train, poll, sub, raid, ban, etc.)
 * Returns the bot notification message and an optional user message.
 */
export function generateSimulatedSpecialEvent(): {
    botMessage: UnifiedChatMessage
    userMessage?: UnifiedChatMessage
} {
    return randomFrom(specialEvents)()
}
