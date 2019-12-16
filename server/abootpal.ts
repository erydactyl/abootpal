import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import * as Constants from "./constants";

export type GameState = "Waiting" | "Lobby" | "Playing";
export type PlayState = "Research" | "Describe" | "Judge";

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
    @type("string")
    private gamestate: GameState = "Lobby";
    @type("string")
    private playstate: PlayState = "Research";
    
    @type({ map: "number" })
    private timers_max: MapSchema<"number"> = new MapSchema<"number">();
    @type("number")
    private last_playstate_change_time: number = Date.now();
    @type("number")
    private round_number: number = 0;
    
    @type("number")
    public timeleft: number = 0;
    
    @type({ map: Player })
    public players: MapSchema<Player> = new MapSchema<Player>();
    
    // *** Utility ***
    // get number of players in room
    private get players_count() {
        let count = 0;
        for (const sessionId in this.players) { count++; }
        return count;
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
                
                this.timeleft = 0;
            } break;
            
            case "Lobby": {
                // * conditions*
                // none
                
                this.timeleft = 0;
                this.round_number = 0;
            } break;
            
            case "Playing": {
                // * conditions*
                // must have ROOM_PLAYERS_MIN players in room to start game
                if (this.players_count < Constants.ROOM_PLAYERS_MIN) { return "Error: Not enough players to start game"; }
                
                // enter playing state
                // set up timers (TODO: let room leader customise these)
                for (let ps in Constants.TIMERS_DEFAULT) { this.timers_max[ps] = Constants.TIMERS_DEFAULT[ps]; }
                // reset last change time in case returning to research from research state before waiting
                this.last_playstate_change_time = Date.now();
                // restart round from Research playstate
                this.setPlayState("Research");
                
                // * set up new game *
                if (this.gamestate === "Lobby") {
                    // reset round number
                    this.round_number = 1;
                }
            } break;
        }
        
        // update state
        this.gamestate = newgamestate;
        return true;
    }
    
    // set the state during a game
    setPlayState(newplaystate: PlayState) {
        // don't update if already in desired state
        if (newplaystate === this.playstate) { return; }
        
        // update room 
        switch(newplaystate) {
            case "Research": {
                
            } break;
            case "Describe": {
                
            } break;
            case "Judge": {
                
            } break;
        }
        
        // update state
        this.last_playstate_change_time = Date.now();
        this.playstate = newplaystate;
    }
    
    // update the game
    update() {
        switch(this.gamestate) {
            case "Waiting": {
                
            } break;
            case "Lobby": {
                
            } break;
            case "Playing": {
                // update time left
                this.timeleft = Math.ceil(this.timers_max[this.playstate] - (Date.now() - this.last_playstate_change_time)/1000);
                
                // enter Waiting state if number of players in room drops too low
                if (this.players_count < Constants.ROOM_PLAYERS_MIN) {
                    this.setGameState("Waiting");
                    break;
                }
                
                // state-specific logic
                switch(this.playstate) {
                    case "Research": {
                        if (this.timeleft <= 0) { this.setPlayState("Describe"); }
                    } break;
                    case "Describe": {
                        if (this.timeleft <= 0) { this.setPlayState("Judge"); }
                    } break;
                    case "Judge": {
                        if (this.timeleft <= 0) { this.setPlayState("Research"); this.round_number++;}
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
}

export class StateHandlerRoom extends Room<AbootpalGameState> {
    maxClients = Constants.ROOM_PLAYERS_MAX;
    
    // Listener functions
    onCreate (options: any) {
        console.log("StateHandlerRoom created!", options);
        this.setState(new AbootpalGameState());
        
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
        
        this.broadcast(`${ this.state.getPlayerNickname(client.sessionId) } joined.`);
        console.log("Join:", client.sessionId, options);
    }
    
    onLeave (client: Client, consented: boolean) {
        if (consented) {
            this.broadcast(`${ this.state.getPlayerNickname(client.sessionId) } left.`);
        } else {
            this.broadcast(`${ this.state.getPlayerNickname(client.sessionId) } was disconnected.`);
        }
        
        // delete player
        this.state.removePlayer(client.sessionId);
    }
    
    onMessage (client: Client, data: any) {
        console.log("StateHandlerRoom received message from", client.sessionId, "(", this.state.getPlayerNickname(client.sessionId), "):", data);
        if (data.message=="/game start") {
            const res = this.state.setGameState("Playing");
            if (res === true) { this.broadcast(`Starting game...`); }
            else { this.broadcast(`${ res }`)}
        } else if (data.message=="/game stop") {
            const res = this.state.setGameState("Lobby");
            if (res === true) { this.broadcast(`Stopping game...`); }
            else { this.broadcast(`${ res }`)}
        } else if (data.message=="/score increase") {
            this.state.modifyPlayerScore(client.sessionId, 1);
        } else {
            this.broadcast(`[${ this.state.getPlayerNickname(client.sessionId) }] ${ data.message.slice(0, Constants.CHATMESSAGE_MAX_LENGTH) }`);
        }
    }
    
    onDispose() {
        console.log("Dispose StateHandlerRoom");
    }
    
    handleTick = () => {
        this.state.update();
    }
    

}