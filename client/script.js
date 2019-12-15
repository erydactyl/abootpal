var host = window.document.location.host.replace(/:.*/, '');
var client = new Colyseus.Client(location.protocol.replace("http", "ws") + "//" + host + (location.port ? ':'+location.port : ''));

function joinGame() {
    // get nickname from input field
    var nick = document.querySelector("#input-nickname");
    
    if (nick.value == "") { return false; } // don't allow empty nicknames
    
    console.log("selected nickname", nick.value);
    
    document.getElementById("nickname").style.display = "none";
    document.getElementById("body").style.display = "block";
    
    var playerscores = {};
    
    var room;
    client.joinOrCreate("abootpal", {nickname: nick.value}).then(room_instance => {
        room = room_instance;
        console.log("joined");
        
        room.onStateChange.once(function(state) {
            console.log("initial room state:", state);
        });
        
        // new room state
        room.onStateChange(function(state) {
        });
        
        // listen to patches coming from the server
        room.onMessage(function(message) {
            var messagesdiv = document.getElementById("messages");
            const isScrolledToBottom = messagesdiv.scrollHeight - messagesdiv.clientHeight <= messagesdiv.scrollTop + 1;
            // add message to page
            var p = document.createElement("p");
            p.innerText = message;
            messagesdiv.appendChild(p);
            // if already scrolled to the bottom, stay at the bottom
            if (isScrolledToBottom) {
                messagesdiv.scrollTop = messagesdiv.scrollHeight;
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