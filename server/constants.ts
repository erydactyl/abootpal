// *** Room ***
export const ROOM_PLAYERS_MIN = 3;
export const ROOM_PLAYERS_MAX = 12;
export const NICKNAME_MAX_LENGTH = 16;
export const CHATMESSAGE_MAX_LENGTH = 256;

// *** Game ***
// Timers
export const TIMERS_DEFAULT: { [playstate: string] : number; } = {
	Starting: 10,
    ChooseArticle: 10,
    Research: 90,
    Judging: 90, // This is number of seconds per non-judge player! eg. with 4 players total, the full phase will take 3x this time
    Scores: 15
}
export const NUMBER_OF_ROUNDS_DEFAULT = 1;
export const ARTICLE_APPROVE_FRAC_MIN = 0.5;
export const DESCRIPTIONS_REQUIRED_MIN = 2;
export const ARTICLEDESCRIPTION_MAX_LENGTH = 256;
export const MISSING_DESCRIPTION_OPTION_TEXT = "[None of the above]"; // this must be something that couldn't be a valid sessionId