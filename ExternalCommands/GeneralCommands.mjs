import { SendMessage } from "../Wingbot953.js"
import { Between } from "./Utils.mjs"

export var commandMap = [
    {
        Command: ["!update"],
        Message: [
            "Channel has a new look, added more sub badges, added bit badges, added more ways to support the stream, added follower emotes, added !quiz, added periodic 'did you know facts'.",
        ],
    },
    {
        Command: ["!quiz"],
        Message: [
            "Periodically, or via channel point redemption, a quiz question will be asked in chat, be the first to answer it! See the channel description for more info.",
        ],
    },
    // Haloruns/Speedruns/Socials/Stream
    {
        Command: ["!hr", "!haloruns"],
        Message: ["haloruns.com"],
    },
    {
        Command: ["!discord"],
        Message: ["Wingman953#3623"],
    },
    {
        Command: ["!hrprofile", "!pb"],
        Message: [
            "Wingman953's HaloRuns Profile: haloruns.com/profiles/Wingman953",
        ],
    },
    {
        Command: ["!wr", "!fgwr"],
        Message: [
            "ODST Easy FG: 57:38 by Wingman953 | ODST Leg FG: 1:04:35 by Wingman953",
        ],
    },
    {
        Command: ["!youtube", "!yt", "!pbvid"],
        Message: [
            "Wingman953's YoutTube: www.youtube.com/channel/UCOwR4betNPOGARQqHUBFQRw/videos",
        ],
    },
    {
        Command: ["!twitch"],
        Message: ["Wingman953's Twitch: www.twitch.tv/wingman953"],
    },
    // {
    //     Command: ["!newvid"],
    //     Message: [
    //         "ODST Fast Facts Ep8: https://www.youtube.com/watch?v=B6zOijtYQfk",
    //     ],
    // },
    {
        Command: ["!fastfactplaylist"],
        Message: [
            "ODST Fast Facts Playlist: https://www.youtube.com/watch?v=ZQhXSoZUAP4&list=PLg9ghMUPja2Q4eP8fswGnM4XJMyRv3EIc",
        ],
    },
    {
        Command: [
            "!socials",
            "!insta",
            "!instagram",
            "!twitter",
            "!onlyfans",
            "!tiktok",
        ],
        Message: ["yea nah"],
    },
    {
        Command: ["!playlist", "!music"],
        Message: [
            "Wingman953's Stream Music Playlist: https://open.spotify.com/playlist/19iCkrwBp77MWHfDzn6klA?si=b025f7bb576e4f8f",
        ],
    },
    {
        Command: ["!sr", "!songrequest"],
        Message: ["If you share a song the streamer may choose to play it."],
    },
    {
        Command: ["!segmented", "!seg", "!odstseg", "!odstsegmented"],
        Message: [
            "ODST Easy Segmented w/ Commentary: https://youtu.be/mnMEszaVJM8 | No Commentary (Harc's YT): https://youtu.be/QA7ZeL0uHT0 | No Commentary (TT's YT): https://youtu.be/u_yCHrVh5VE",
        ],
    },
    {
        Command: ["!top10", "!slidejump"],
        Message: [
            "MLG TOP 10 ODST SLIDE JUMPS LETS GOOOOO!!! https://youtu.be/9m7Jy5gTkuw",
        ],
    },
    {
        Command: ["!gdq", "!agdq", "!odstgdq", "!odstagdq"],
        Message: [
            "ODST Legendary GDQ Run by Heroic_Robb w/ Commentary: https://youtu.be/ZArL7_UDMWI",
        ],
    },
    {
        Command: ["!lore%"],
        AllMessages: true,
        Message: [
            "Heroic, Black Eye, restricted melee (only at full stamina, only on Grunts or by assassinating Jackals), no vehicle hijacking, no vehicle flipping, no Hammer, no turret detaching/carrying, no out of bounds. Optional: All cutscenes, deathless, optional dialogue, Easter Eggs, Audio logs.",
        ],
    },
    {
        Command: ["!addcom", "!addcommand"],
        Message: [
            "You cannot add commands but you can suggest commands for the streamer to add.",
        ],
    },
    {
        Command: ["!remcom", "!remcommand", "!removecommand"],
        Message: ["You cannot remove commands, only the streamer can."],
    },
    {
        Command: ["!easy"],
        Message: [
            "Why do you play the easy difficulty streamer? Perhaps you do not posses the skill to play on normal?",
        ],
    },
    {
        Command: ["!noreset"],
        Message: ["I lied"],
    },
    // FAQ
    {
        Command: ["!faq"],
        Message: ["!ammoempty, !timer, !glyphs, !downpatch, !quiz"],
    },
    {
        Command: ["!ammoempty", "!ammo"],
        Message: [
            "If you have an empty UNSC weapon at the end of a Mombasa Streets section then you start the next section with a fresh loadout which includes 3 frags, and frags are useful for movement tricks.",
        ],
    },
    {
        Command: ["!timer"],
        Message: [
            "The auto-splitter matches the in-game timer. On the first mission the in-game timer appears to start late as we press the 'exit vehicle' button to exit the pod earlier than the game expects. Video explanation here: https://youtu.be/ZQhXSoZUAP4",
        ],
    },
    {
        Command: ["!glyphs"],
        Message: ["idk"],
    },
    {
        Command: ["!downpatch"],
        Message: [
            "On Season 8 Brutes slide around a lot when EMP'd, this can make it difficult to deal with them (particularly for the Chieftain on the roof of the ONI building and during Data Hive). It's not a big deal but the issue can easily be avoided by downpatching to Season 7.",
        ],
    },
    // People
    {
        Command: ["!sleepless", "!sleeplessblue"],
        Message: ["Aristo", "do maternal"],
    },
    {
        Command: [
            "!grant",
            "!eggplant",
            "!eggrant",
            "!egggrant",
            "!eggplanthydra",
            "!eggplanthydra53",
        ],
        Message: ["Grant 2nd place storm leg mcc"],
    },
    {
        Command: ["!skilled", "!skilledgames", "!skilledgames_", "!mathu"],
        Message: ["the guy"],
    },
    {
        Command: ["!rep", "!reptiliangamer"],
        Message: ["lookslikerep", "iTheReptiliani"],
    },
    {
        Command: ["!harc"],
        Message: ["Teh 57min shark"],
    },
    {
        Command: ["!zombie", "!z", "!zom", "!zombie343"],
        Message: ["Rap god"],
    },
    {
        Command: ["!benbox"],
        Message: ["Founder of BenBox Blue(TM)"],
    },
    {
        Command: ["!mcthumbs"],
        Message: ["The other oni guy", "former bronze trophy holder former"],
    },
    {
        Command: ["!adversary", "!adversaryy", "!sean", "!reraised"],
        Message: ["https://youtu.be/SVrhxQ5imM0"],
    },

    // Random
    {
        Command: ["is"],
        Message: [
            "yea jon",
            "correct jacob",
            "truthful sean",
            "definitely joseph",
            "exactly hurricane",
            "precisely vance",
            "affirmative nik",
            "absolutely andrew",
            "agreed matt",
            "excellent jack",
            "splendid grant",
            "unquestionably neil",
        ],
    },
    {
        Command: ["!bars"],
        Message: ['"yo nik is like a brick"', "https://youtu.be/Q6i8YXykzwE"],
    },
    {
        Command: ["!happened"],
        Message: [
            "What happened to the streamer probably hasn't happened to this streamer: https://www.twitch.tv/klooger",
        ],
    },
    {
        Command: ["!storm"],
        Message: [
            "If you want to use that command this might be a better home for you: https://www.twitch.tv/SasquatchSensei",
        ],
    },
    {
        Command: ["!odst"],
        Message: ["2009 Video Game"],
    },
    {
        Command: ["!bot"],
        Message: ["Where?"],
    },
    {
        Command: ["!subcount"],
        Message: ["!subcount = !subgoal - 1"],
    },
    {
        Command: ["!subgoal"],
        Message: ["!subgoal = !subcount + 1"],
    },
    {
        Command: ["!lurk"],
        Message: [
            "I'm not sure that's how lurking works.",
            "Congratulations, you have successfully failed to lurk.",
        ],
    },
    {
        Command: ["!bigbrain"],
        Message: ["Kiko Ricochet Ending: https://youtu.be/1rY7vjc_a7w"],
    },
]

///
/// Handles the command to produce random number.
///
export function HandleRandomNumberGeneration(originalMessage) {
    var command = originalMessage.split(" ")[0].trim().toLowerCase()

    // Check if 2 arguments have been given
    if (originalMessage.split(" ").length >= 3) {
        // Parse the numbers
        var lower = parseInt(originalMessage.split(" ")[1].trim(), 10)
        var upper = parseInt(originalMessage.split(" ")[2].trim(), 10)

        if (lower != NaN && upper != NaN) {
            var num = Between(lower, upper)

            if (num == 15) {
                num = `${num} moment`
            }

            if (num == 953) {
                num = `${num} hype`
            }

            if (num == 2019) {
                num = `${num}, the Year of ODST!`
            }

            SendMessage(command, `Your number is: ${num}.`)
            return
        }
    }

    // Command used without correct arguments
    SendMessage(
        command,
        "Usage: Randomly selects a number between the given numbers (inclusive): !random <number> <number>"
    )
    return
}
