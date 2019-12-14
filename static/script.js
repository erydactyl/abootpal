var host = window.document.location.host.replace(/:.*/, '');
var client = new Colyseus.Client(location.protocol.replace("http", "ws") + "//" + host + (location.port ? ':'+location.port : ''));

function joinGame() {
    // get nickname from input field
    var nick = document.querySelector("#input-nickname");
    
    console.log("selected nickname", nick.value);
    
    document.getElementById("nickname").style.display = "none";
    document.getElementById("message").style.display = "block";
    document.getElementById("messages").style.display = "inline";
    
    client.joinOrCreate("abootpal", {nickname: nick.value}).then(room => {
        console.log("joined");
        room.onStateChange.once(function(state) {
            console.log("initial room state:", state);
        });

        // new room state
        room.onStateChange(function(state) {
            // this signal is triggered on each patch
        });

        // listen to patches coming from the server
        room.onMessage(function(message) {
            var p = document.createElement("p");
            p.innerHTML = message;
            document.querySelector("#messages").appendChild(p);
        });

        // submit nickname
        document.querySelector("#form-nickname").onsubmit = function(e) {
            e.preventDefault();
            var input = document.querySelector("#input-nickname");
            console.log("input nickname:", input.value);
            // send data to room
            room.send({ message: input.value });
            // clear input
            input.value = "";
        }

        // send message to room on submit
        document.querySelector("#form-message").onsubmit = function(e) {
            e.preventDefault();
            var input = document.querySelector("#input-message");
            console.log("input message:", input.value);
            // send data to room
            room.send({ message: input.value });
            // clear input
            input.value = "";
        }
    });
    return false;
}