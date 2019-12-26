// *** Room ***
export const ROOM_PLAYERS_MIN = 3;
export const ROOM_PLAYERS_MAX = 12;
export const NICKNAME_MAX_LENGTH = 16;
export const CHATMESSAGE_MAX_LENGTH = 256;

// *** Game ***
export const NUMBER_OF_ROUNDS_DEFAULT = 1;
export const ARTICLE_MIN_APPROVE_FRAC = 0.5;
// Timers
export const TIMERS_DEFAULT: { [playstate: string] : number; } = {
    ChooseArticle: 5,//20,
    Research: 15,//180,
    Judging: 5,//300, // This is number of seconds per non-judge player! ie. with 4 players total, the full phase will take 3x this time
    Scores: 3//20
}