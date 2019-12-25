// *** Room ***
export const ROOM_PLAYERS_MIN = 3;
export const ROOM_PLAYERS_MAX = 12;
export const NICKNAME_MAX_LENGTH = 16;
export const CHATMESSAGE_MAX_LENGTH = 256;

// *** Game ***
export const NUMBER_OF_ROUNDS_DEFAULT = 1;
export const ARTICLE_MIN_APPROVE_FRAC = 0.5;
// Timers (all timers are soft by default)
export const TIMERS_DEFAULT: { [playstate: string] : number; } = {
    ChooseArticle: 5,//20,
    Research: 15,//180,
    Describe: 2,//30,
    Judge: 2,//300,
    Scores: 3//20
}