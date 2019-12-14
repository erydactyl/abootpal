import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    nickname: string;
    constructor(nickname: string) {
        super();
        this.nickname = nickname;
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
    
    onMessage (client: Client, message: any) {
        console.log("BasicRoom received message from", client.sessionId, "(", this.players[client.sessionId].nickname, "):", message);
        this.broadcast(`[${ this.players[client.sessionId].nickname }] ${ message.message }`);
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