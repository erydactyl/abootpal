import { Room, Client } from "colyseus";
import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";
import * as Constants from "./constants";

var XMLHttpRequest = require("xhr2");//mlhttprequest").XMLHttpRequest;

export type GameState = "Waiting" | "Lobby" | "Playing";
export type PlayState = "null" | "ChooseArticle" | "Research" | "Judging" | "Scores";

export type MessageType = "GameStatus" | "DisplayText" | "DisplayApproveRejectButtons" | "DisplayArticle"| "ClearDisplay" | "ChatMessage";

export function getJSONfromURL(url: string, callback: any) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onload = function() {
        callback(JSON.parse(xhr.responseText));
    }
    xhr.send(null);
}

export class Message extends Schema {
    public type: MessageType;
    public timestamp: number;
    public data: any;
    
    constructor(type: MessageType, data?: any) {
        super();
        this.type = type;
        this.timestamp = Date.now();
        this.data = data;
    }
    
    get JSON() {
        return {
            type: this.type,
            timestamp: this.timestamp,
            data: this.data,
        };
    }
}

export class Article extends Schema {
	public title: string;
	public url: string;

	constructor(title: string, url: string) {
		super();
		this.title = title;
		this.url = url;
	}
}

export class Player extends Schema {
    @type("string")
    nickname = "";
    @type("number")
    score = 0;
    constructor(nickname: string) {
        super();
        this.nickname = nickname;
    }
    
    modifyScore(points: number) {
        this.score += points;
    }
}

export class AbootpalGameState extends Schema {
    private gamestate: GameState = "Lobby";
    private playstate: PlayState = "null";
    
    private timers_max: MapSchema<"number"> = new MapSchema<"number">();
    private last_playstate_change_time: number = Date.now();
    private round_number: number = 0;
    private last_time_left_val: number = -1;
    
    @type({ map: Player })
    public players: MapSchema<Player> = new MapSchema<Player>();
    private judged_this_round: ArraySchema<string> = new ArraySchema<string>();
    
    // messages
    private onMessage: (message: Message, sessionId?: string) => void;
    
    // wiki
    private truth_player: string = "";
    private article: Article = new Article("", "");
    private article_decisions: MapSchema<"string"> = new MapSchema<"string">();
    
    // *** Constructor ***
    constructor(onMessage: any) {
        super();
        this.onMessage = onMessage;
    }
    
    // *** Utility ***
    // get number of players in room
    private get players_count() {
        let count = 0;
        for (const sessionId in this.players) { count++; }
        return count;
    }
    
    // get time left in the current play state
    private get time_left() {
        if (this.gamestate != "Playing") { return 0; }
        return Math.ceil(this.timers_max[this.playstate] - (Date.now() - this.last_playstate_change_time)/1000);
    }
    
    // *** Game management ***
    setGameState(newgamestate: GameState) {
        // don't update if already in desired state
        if (newgamestate === this.gamestate) { return; }
        
        // update room
        switch(newgamestate) {
            
            case "Waiting": {
                // * conditions*
                // only change to Waiting if currently in Playing
                if (this.gamestate != "Playing") { return "Error: Must be in Playing mode to enter Waiting mode"; }
                
                this.setPlayState("null");
            } break;
            
            case "Lobby": {
                // * conditions*
                // none
                
                this.round_number = 0;
                this.setPlayState("null");
            } break;
            
            case "Playing": {
                // * conditions*
                // must have ROOM_PLAYERS_MIN players in room to start game
                if (this.players_count < Constants.ROOM_PLAYERS_MIN) { return "Error: Not enough players to start game"; }
                
                // enter playing state
                // set up timers (TODO: let room leader customise these)
                for (let ps in Constants.TIMERS_DEFAULT) {
                	// for judging phase, timer is per non-judge player
                	if (ps == "Judging") {
                		this.timers_max[ps] = (this.players_count - 1) * Constants.TIMERS_DEFAULT[ps];
                	}
                	// otherwise, just use the time defined in Constants
                	else { this.timers_max[ps] = Constants.TIMERS_DEFAULT[ps]; }
                	console.log(this.timers_max);
                }
                // reset last change time in case returning to research from research state before waiting
                this.last_playstate_change_time = Date.now();
                // if starting game from the lobby, game is new, so reset round counter
                if (this.gamestate === "Lobby") {
                    // reset round number
                    this.round_number = 1;
                }
                // (re)start round from Scores playstate
                this.setPlayState("Scores");
            } break;
        }
        
        // update state
        this.gamestate = newgamestate;
        this.broadcastGameStatus();
        return true;
    }
    
    // set the state during a game
    setPlayState(newplaystate: PlayState, restart: boolean = false) {
        // don't update if already in desired state (unless restart is specified)
        if (!restart && newplaystate === this.playstate) { return; }
        
        // update room 
        switch(newplaystate) {
            case "ChooseArticle": {
                // clear screens
                this.onMessage(new Message("ClearDisplay"));

	            // on a new turn, choose a new judge
            	if (!restart) {
	                // the first person in 'players' but not in 'judged_this_round'
	                const num_judged_this_round = this.judged_this_round.length
	                for (const sessionId in this.players) {
	                    if (this.judged_this_round.indexOf(sessionId) === -1) {
	                        this.judged_this_round.push(sessionId);
	                        break; // exit loop
	                    }
	                }
	                
	                // if length of judged_this_round is unchanged, all players have judged
	                // so start a new round, and make first player the judge
	                if (num_judged_this_round === this.judged_this_round.length) {
	                    // announce new round
	                    this.round_number++;
	                    this.onMessage(new Message("ChatMessage", {chatmessage: "Starting round " + this.round_number + "!"}));
	                    // clear judged this round, and choose first player as new judge
	                    this.judged_this_round = new ArraySchema<string>();
	                    for (const sessionId in this.players) {
	                        this.judged_this_round.push(sessionId);
	                        break; // no conditional - will always break on first iteration
	                    }
	                }
	                
	                // announce the judge
	                this.onMessage(new Message("ChatMessage", {chatmessage: this.players[this.judged_this_round[this.judged_this_round.length - 1]].nickname + " is judging!"}));
        			this.onMessage(new Message("DisplayText", {text: "You are judging!"}), this.judged_this_round[this.judged_this_round.length - 1]);
                }

                // choose a random article, and propose it to the players
                this.chooseRandomWikiArticle(
                    (response: any) => {
                        this.article = new Article(response.title, response.fullurl);
                        console.log(this.article);
                        
                        // send article title to all players (except judge)
                        for (const sessionId in this.players) {
                        if (sessionId !== this.judged_this_round[this.judged_this_round.length - 1]) {
                        	if (restart) { this.onMessage(new Message("DisplayText", {text: "Article rejected - choosing a new one..."}), sessionId); }
        					this.onMessage(new Message("DisplayText", {text: "Proposed article title:"}), sessionId);
        					this.onMessage(new Message("DisplayText", {text: this.article.title, fontweight: "bold", fontsize: "24px"}), sessionId);
        					this.onMessage(new Message("DisplayApproveRejectButtons"), sessionId);
        					this.onMessage(new Message("DisplayText", {text: `To continue with this article, at least ${Math.floor(100*Constants.ARTICLE_MIN_APPROVE_FRAC)}% of players must approve it, and none must reject it`, fontsize: "16px"}), sessionId);
                        }
                    }
                    }
                );
            } break;
            case "Research": {
                // clear screens
                this.onMessage(new Message("ClearDisplay"));
                
                // hopefully enough time has passed for the XHR to have completed
                if (this.article.title != "" && this.article.url != "") {
                    // choose which player will see the full article at random
                    var ps = Object.keys(this.players).filter((e: any) => { return e !== this.judged_this_round[this.judged_this_round.length - 1] });
                    this.truth_player = ps[Math.floor(Math.random()*ps.length)];
                    
                    // send article to truth-telling player
                    this.sendWikiArticle(this.truth_player, this.article.url);
                    // send article title to all other non-judge players
                    for (const sessionId in this.players) {
                        if (sessionId !== this.truth_player && sessionId !== this.judged_this_round[this.judged_this_round.length - 1]) {
        					this.onMessage(new Message("DisplayText", {text: "This round\'s article title is"}), sessionId);
        					this.onMessage(new Message("DisplayText", {text: this.article.title, fontweight: "bold", fontsize: "24px"}), sessionId);
        					this.onMessage(new Message("DisplayText", {text: "Make up something based on this title!"}), sessionId);
                        }
                    }
                }
            } break;
            case "Judging": {
                // clear screens
                this.onMessage(new Message("ClearDisplay"));
            } break;
            case "Scores": {
                // reset variables that need resetting for a new rond
                this.truth_player = "";
                this.article = new Article("", "");
                this.article_decisions = new MapSchema<"string">();
            } break;
            case "null": {
                
            } break;
        }
        
        // update state
        this.last_playstate_change_time = Date.now();
        this.playstate = newplaystate;
        this.broadcastGameStatus();
    }
    
    // update the game
    update() {
        switch(this.gamestate) {
            case "Waiting": {
                
            } break;
            case "Lobby": {
                
            } break;
            case "Playing": {
                // check last_time to see if client game state information needs updating
                if (this.time_left != this.last_time_left_val) {
                    this.last_time_left_val = this.time_left;
                    this.broadcastGameStatus();
                }
                
                // enter Waiting state if number of players in room drops too low
                if (this.players_count < Constants.ROOM_PLAYERS_MIN) {
                    this.setGameState("Waiting");
                    break;
                }
                
                // state-specific logic
                switch(this.playstate) {
                    case "ChooseArticle": {
                        if (this.time_left <= 0) {
                        	// check for any rejections
                        	var should_reject = false;
                        	var approve_count = 0;
                			for (const sessionId in this.article_decisions) {
                				// reject if anyone selected reject
                				if (this.article_decisions[sessionId] === "reject") {
                					should_reject = true;
                					break;
                				} else { approve_count++; }
                			}
                			// reject if less than ARTICLE_MIN_APPROVE_FRAC of non-judge players approve
                			if (approve_count < Constants.ARTICLE_MIN_APPROVE_FRAC * (this.players_count - 1)) { should_reject = true; }
                			// if rejecting, restart round
                			if (should_reject) {
                				this.article_decisions = new MapSchema<"string">();
                				this.setPlayState("ChooseArticle", true);
                			// otherwise, continue to research phase
                			} else { this.setPlayState("Research"); }
                        }
                    } break;
                    case "Research": {
                        if (this.time_left <= 0) { this.setPlayState("Judging"); }
                    } break;
                    case "Judging": {
                        if (this.time_left <= 0) { this.setPlayState("Scores"); }
                    } break;
                    case "Scores": {
                        if (this.time_left <= 0) { this.setPlayState("ChooseArticle"); }
                    } break;
                }
            } break;
        }
    }
    
    // *** Player management ***
    createPlayer(id: string, nickname: string) {
        this.players[ id ] = new Player(nickname);
    }
    
    removePlayer(id: string) {
        delete this.players[ id ];
    }
    
    modifyPlayerScore(id: string, points: number) {
        this.players[id].modifyScore(points);
    }
    
    getPlayerNickname(id: string) {
        return this.players[id].nickname;
    }
    getPlayerScore(id: string) {
        return this.players[id].score;
    }
    
    // *** Wiki stuff ***
    chooseRandomWikiArticle(callback: any) {
        getJSONfromURL("https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&prop=info&inprop=url&generator=random&grnnamespace=0&grnfilterredir=nonredirects&grnlimit=1.json",
            // callback function: will run once API call is finished
            (response: any) => {
                // pass article back
                callback(Object.values(response.query.pages)[0]);
            }
        );
    }
    
    // send a wikipedia article to a specific player
    sendWikiArticle(sessionId: string, wikiUrl: string) {
        this.onMessage(new Message("DisplayArticle", {url: wikiUrl + "?printable=yes"}), sessionId);
    }

    // approval/rejection of articles
    setArticleDecision(sessionId: string, choice: string) {
    	if (choice === "approve" || choice === "reject" ) {
    		this.article_decisions[sessionId] = choice;
    	}
    	console.log(this.article_decisions);
    }
    
    // *** Messages ***
    // send updated game status information to all players
    broadcastGameStatus() {
        this.onMessage(new Message("GameStatus", {gamestate: this.gamestate, playstate: this.playstate, round_number: this.round_number, time_left: this.time_left}));
    }
}

export class StateHandlerRoom extends Room<AbootpalGameState> {
    maxClients = Constants.ROOM_PLAYERS_MAX;
    
    // Listener functions
    onCreate (options: any) {
        console.log("StateHandlerRoom created!", options);
        this.setState(new AbootpalGameState(this.handleMessage));
        
        // start running
        this.setSimulationInterval(() => this.handleTick());
    }
    
    onJoin (client: Client, options: any) {
        // validate nickname & create player
        var nickname: string = options.nickname;
        if (nickname === null || nickname.length < 1) {
            nickname = "DefaultNick";
        }
        this.state.createPlayer(client.sessionId, nickname.slice(0, Constants.NICKNAME_MAX_LENGTH));
        
        this.handleMessage(new Message("ChatMessage", {chatmessage: `${ this.state.getPlayerNickname(client.sessionId) } joined.`}));
        console.log("Join:", client.sessionId, options);
    }
    
    onLeave (client: Client, consented: boolean) {
        if (consented) {
            this.handleMessage(new Message("ChatMessage", {chatmessage: `${ this.state.getPlayerNickname(client.sessionId) } left.`}));
        } else {
            this.handleMessage(new Message("ChatMessage", {chatmessage: `${ this.state.getPlayerNickname(client.sessionId) } was disconnected.`}));
        }
        
        // delete player
        this.state.removePlayer(client.sessionId);
    }
    
    onMessage (client: Client, data: any) {
        console.log("StateHandlerRoom received message from", client.sessionId, "(", this.state.getPlayerNickname(client.sessionId), "):", data);
        // handle chat messages
        if (data.chatmessage) {
	        if (data.chatmessage=="/game start") {
	            const res = this.state.setGameState("Playing");
	            if (res === true) { this.handleMessage(new Message("ChatMessage", {chatmessage: `Starting game...`})); }
	            else { this.handleMessage(new Message("ChatMessage", {chatmessage: `${ res }`})); }
	        } else if (data.chatmessage=="/game stop") {
	            const res = this.state.setGameState("Lobby");
	            if (res === true) { this.handleMessage(new Message("ChatMessage", {chatmessage: `Stopping game...`})); }
	            else { this.handleMessage(new Message("ChatMessage", {chatmessage: `${ res }`})); }
	        } else if (data.chatmessage=="/score increase") {
	            this.state.modifyPlayerScore(client.sessionId, 1);
	        } else if (data.chatmessage=="/buttons") {
	        	this.handleMessage(new Message("DisplayApproveRejectButtons"), client.sessionId);
	        } else {
	            this.handleMessage(new Message("ChatMessage", {chatmessage: `[${ this.state.getPlayerNickname(client.sessionId) }] ${ data.chatmessage.slice(0, Constants.CHATMESSAGE_MAX_LENGTH) }`}));
	        }
	    }
	    // handle approving/rejecting articles
	    else if (data.choosearticle) {
	    	if (data.choosearticle === "approve" || data.choosearticle === "reject") {
	    		this.state.setArticleDecision(client.sessionId, data.choosearticle);
	    	}
	    }
    }
    
    onDispose() {
        console.log("Dispose StateHandlerRoom");
    }
    
    // handlers
    handleTick = () => {
        this.state.update();
    }
    
    handleMessage = (message: Message, sessionId?: string) => {
        //console.log(this.clients);
        if (sessionId === undefined) {
            this.broadcast(message.JSON);
        } else {
            for (let c = 0; c < this.clients.length; c++) {
                if (this.clients[c].sessionId === sessionId) {
                    this.send(this.clients[c], message.JSON);
                }
            }
        }
    }

}