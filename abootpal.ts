import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    nickname: string;
    score: number;
    constructor(nickname: string) {
        super();
        this.nickname = nickname;
        this.score = 0;
    }
    
    modifyScore(points: number = 1) {
        this.score += points;
    }
}

export class Abootpal extends Room {
    
    players = new MapSchema<Player>();
    
    // Listener functions
    onCreate (options: any) {
        console.log("BasicRoom created!", options);
    }
    
    onJoin (client: Client, options: any) {
        this.createPlayer(client.sessionId, options.nickname)
        this.broadcast(`${ this.players[client.sessionId].nickname } joined.`);
        console.log("Join:", options);
    }
    
    onLeave (client: Client, consented: boolean) {
        if (consented) {
            this.broadcast(`${ this.players[client.sessionId].nickname } left.`);
        } else {
            this.broadcast(`${ this.players[client.sessionId].nickname } was disconnected.`);
        }
        this.removePlayer(client.sessionId);
    }
    
    onMessage (client: Client, data: any) {
        console.log("BasicRoom received message from", client.sessionId, "(", this.players[client.sessionId].nickname, "):", data);
        if (data.message=="/score increase") {
            this.players[client.sessionId].modifyScore(1);
        } else if (data.message=="/score show") {
            this.broadcast(`[${ this.players[client.sessionId].nickname }'s score is ${ this.players[client.sessionId].score }]`);
        } else {
            this.broadcast(`[${ this.players[client.sessionId].nickname }] ${ data.message }`);
        }
    }
    
    onDispose() {
        console.log("Dispose BasicRoom");
    }
    
    // Player management functions
    createPlayer (id: string, nickname: string) {
        this.players[ id ] = new Player(nickname);
    }
    
    removePlayer (id: string) {
        delete this.players[ id ];
    }
    

}