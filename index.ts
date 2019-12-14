import path from 'path';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'colyseus';
import { monitor } from '@colyseus/monitor';
//import socialRoutes from '"'@colyseus/social/express'

import { Abootpal } from './abootpal';

const port = Number(process.env.PORT || 25565);
const app = express()

app.use(cors());
app.use(express.json())

const server = http.createServer(app);
const gameServer = new Server({
  server,
});

// register your room handlers
gameServer.define('abootpal', Abootpal);

// register @colyseus/social routes
//app.use("/", socialRoutes);

// register main page
app.use('/', express.static(path.join(__dirname, 'static')));

// register colyseus monitor AFTER registering your room handlers
// this is optional!
app.use('/colyseus', monitor(gameServer));

// shutdown message on server stop
gameServer.onShutdown(function() {
    console.log(`Game server is shutting down.`)
})

// listen
gameServer.listen(port);
console.log(`Listening on ws://localhost:${ port }`)