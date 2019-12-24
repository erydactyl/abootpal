var host = window.document.location.host.replace(/:.*/, '');
var client = new Colyseus.Client(location.protocol.replace("http", "ws") + "//" + host + (location.port ? ':'+location.port : ''));

function joinGame() {
    // get nickname from input field
    var nick = document.querySelector("#input-nickname");
    
    if (nick.value == "") { return false; } // don't allow empty nicknames
    
    console.log("selected nickname", nick.value);
    
    var playerscores = {};
    
    var room;
    client.joinOrCreate("abootpal", {nickname: nick.value}).then(room_instance => {
        room = room_instance;
        console.log("joined");
        
        document.getElementById("nickname").style.display = "none";
        document.getElementById("body").style.display = "block";
        
        room.onStateChange.once(function(state) {
            //console.log("initial room state:", state);
        });
        
        // new room state
        room.onStateChange(function(state) {
            //console.log("Room state updated: ", state)
        });
        
        // listen to patches coming from the server
        room.onMessage(function(message) {
            console.log(message);
            // chat message
            if (message.type === "Chat") {
                var messagesdiv = document.getElementById("messages");
                const isScrolledToBottom = messagesdiv.scrollHeight - messagesdiv.clientHeight <= messagesdiv.scrollTop + 1;
                // add message to page
                var p = document.createElement("p");
                p.innerText = message.data.message;
                messagesdiv.appendChild(p);
                // if already scrolled to the bottom, stay at the bottom
                if (isScrolledToBottom) {
                    messagesdiv.scrollTop = messagesdiv.scrollHeight;
                }
            }
            // game state update message
            else if (message.type === "GameStatus") {
                document.querySelector("#status-gamestate").innerText = message.data.gamestate;
                if (message.data.gamestate === "Playing" || message.data.gamestate === "Waiting") {
                    document.querySelector("#status-roundnumber").innerText = "Round " + message.data.round_number;
                } else { document.querySelector("#status-roundnumber").innerText = ""; }
                if (message.data.gamestate === "Playing") {
                    document.querySelector("#status-playstate-timeleft").innerText = message.data.playstate + ": " + message.data.time_left + "s left";
                } else { document.querySelector("#status-playstate-timeleft").innerText = ""; }
            }
            // display article message
            else if (message.type === "DisplayArticle") {
                // show wiki iframe
                document.querySelector("#wikiframe").visibility = "visible";
                document.querySelector("#wikiframe").height = "100%";
                // display article
                document.querySelector("#wikiframe").src = message.data.url;
            }
            // display article message
            else if (message.type === "DisplayText") {
                var ptext = document.createElement("p");
                ptext.style.width = "100%";
                ptext.style.height = "32";
                ptext.innerText = message.data.text;
                document.querySelector("#maingame").appendChild(ptext);
            }
            // remove article message
            else if (message.type === "ClearDisplay") {
                // remove child elements from main display
                const parent = document.getElementById("maingame");
                while (parent.firstChild) {
                    parent.removeChild(parent.firstChild);
                }

                // wiki iframe
                document.querySelector("#wikiframe").src = "";
                // hide
                document.querySelector("#wikiframe").visibility = "hidden";
                document.querySelector("#wikiframe").height = "0px";
            }
        });
        
        room.state.players.onAdd = function(player, sessionId) {
            var pscore = document.createElement("p");
            pscore.style.width = "100%";
            pscore.style.height = "24";
            
            playerscores[sessionId] = pscore;
            document.querySelector("#scores").appendChild(pscore);
            
            drawPlayerScore(player, sessionId);
            
            // call player.onChange()
            player.triggerAll();
        }
        
        room.state.players.onRemove = function(player, sessionId) {
            document.querySelector("#scores").removeChild(playerscores[sessionId]);
            delete playerscores[sessionId];
        }
        
        room.state.players.onChange = function(player, sessionId) {
            // update all player scores
            Object.keys(playerscores).forEach(function(sessionId) {
                drawPlayerScore(room.state.players[sessionId], sessionId);
            });
        }
        
        // send message to room on submit
        document.querySelector("#form-message").onsubmit = function(e) {
            e.preventDefault();
            var input = document.querySelector("#input-message");
            if (input.value == "") { return false; } // don't send empty messages
            console.log("input message:", input.value);
            // send data to room
            room.send({ message: input.value });
            // clear input
            input.value = "";
        }
    });
    
    function drawPlayerScore(player, sessionId) {
        playerscores[sessionId].innerText = player.nickname + ": " + player.score;
    }
    
    return false;
}