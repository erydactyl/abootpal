import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import * as Constants from "./constants";

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
    @type({ map: Player })
    players = new MapSchema<Player>();
    
    // Player management functions
    createPlayer (id: string, nickname: string) {
        this.players[ id ] = new Player(nickname);
    }
    
    removePlayer (id: string) {
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
    
    // Listener functions
    onCreate (options: any) {
        console.log("StateHandlerRoom created!", options);
        this.setState(new AbootpalGameState());
    }
    
    onJoin (client: Client, options: any) {
        this.state.createPlayer(client.sessionId, options.nickname.slice(0, Constants.NICKNAME_MAX_LENGTH));
        
        this.broadcast(`${ this.state.getPlayerNickname(client.sessionId) } joined.`);
        console.log("Join:", client.sessionId, options);
    }
    
    onLeave (client: Client, consented: boolean) {
        if (consented) {
            this.broadcast(`${ this.state.getPlayerNickname(client.sessionId) } left.`);
        } else {
            this.broadcast(`${ this.state.getPlayerNickname(client.sessionId) } was disconnected.`);
        }
        
        this.state.removePlayer(client.sessionId);
    }
    
    onMessage (client: Client, data: any) {
        console.log("StateHandlerRoom received message from", client.sessionId, "(", this.state.getPlayerNickname(client.sessionId), "):", data);
        if (data.message=="/score increase") {
            this.state.modifyPlayerScore(client.sessionId, 1);
        } else if (data.message=="/score show") {
            this.broadcast(`[${ this.state.getPlayerNickname(client.sessionId) }'s score is ${ this.state.getPlayerScore(client.sessionId) }]`);
        } else {
            this.broadcast(`[${ this.state.getPlayerNickname(client.sessionId) }] ${ data.message.slice(0, Constants.CHATMESSAGE_MAX_LENGTH) }`);
        }
    }
    
    onDispose() {
        console.log("Dispose StateHandlerRoom");
    }
    

}