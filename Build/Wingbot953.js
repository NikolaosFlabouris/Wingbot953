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
Object.defineProperty(exports, "__esModule", { value: true });
const Twitch_1 = require("./Integrations/Twitch");
const Spotify_1 = require("./Integrations/Spotify");
const Quiz_1 = require("./Commands/Quiz");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, Spotify_1.SpotifySetup)();
        yield (0, Twitch_1.TwitchSetup)();
        (0, Quiz_1.QuizSetup)();
    });
}
main();
