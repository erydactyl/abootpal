var host = window.document.location.host.replace(/:.*/, '');
var client = new Colyseus.Client(location.protocol.replace("http", "ws") + "//" + host + (location.port ? ':'+location.port : ''));

function joinGame() {
    // get nickname from input field
    var nick = document.querySelector("#input-nickname");
    
    if (nick.value == "") { return false; } // don't allow empty nicknames
    
    //console.log("selected nickname", nick.value);
    
    var playerscores = {};
    
    var room;
    client.joinOrCreate("abootpal", {nickname: nick.value}).then(room_instance => {
        room = room_instance;
        //console.log("joined");
        
        document.getElementById("nickname").style.display = "none";
        document.getElementById("game-wrapper").style.display = "block";
        
        room.onStateChange.once(function(state) {
            //console.log("initial room state:", state);
        });
        
        // new room state
        room.onStateChange(function(state) {
            //console.log("Room state updated: ", state)
        });
        
        // listen to patches coming from the server
        room.onMessage(function(message) {
            //console.log(message);
            // chat message
            if (message.type === "ChatMessage") {
                var messagesdiv = document.getElementById("messages");
                const isScrolledToBottom = messagesdiv.scrollHeight - messagesdiv.clientHeight <= messagesdiv.scrollTop + 1;
                // add message to page
                var p = document.createElement("p");
                p.innerText = message.data.chatmessage;
                if (message.data.fontweight) p.style.fontWeight = message.data.fontweight;
                if (message.data.fontsize) p.style.fontSize = message.data.fontsize;
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
                // if timer is below zero, set font colour to red
                if (message.data.time_left < 0) { document.querySelector("#status-playstate-timeleft").style.color = "red"; }
                else { document.querySelector("#status-playstate-timeleft").style.color = "black"; }
            }
            // display article message
            else if (message.type === "DisplayArticle") {
                // show wiki iframe
                document.querySelector("#wikiframe").visibility = "visible";
                document.querySelector("#wikiframe").height = "75%";
                // display article
                document.querySelector("#wikiframe").src = message.data.url;
            }
            // display article message
            else if (message.type === "DisplayText") {
                var ptext = document.createElement("p");
                ptext.innerText = message.data.text;
                if (message.data.fontweight) ptext.style.fontWeight = message.data.fontweight;
                if (message.data.fontsize) ptext.style.fontSize = message.data.fontsize;
                document.querySelector("#maingame").appendChild(ptext);
            }
            // display approve/reject article form
            else if (message.type === "DisplayApproveRejectButtons") {
                var inapprove = document.createElement("input");
                inapprove.id = "input-approve-article";
                inapprove.type = "button";
                inapprove.value = "Approve";
                var inreject = document.createElement("input");
                inreject.id = "input-reject-article";
                inreject.type = "button";
                inreject.value = "Reject";
                inapprove.onclick = function() {
                    // style
                    document.querySelector("#input-approve-article").style.border = "3px solid #444444";
                    document.querySelector("#input-reject-article").style.border = "3px solid transparent";
                    // send approve/reject information
                    room.send({ choosearticle: "approve" });
                }
                inreject.onclick = function() {
                    // style
                    document.querySelector("#input-approve-article").style.border = "3px solid transparent";
                    document.querySelector("#input-reject-article").style.border = "3px solid #444444";
                    // send approve/reject information
                    room.send({ choosearticle: "reject" });
                }
                document.querySelector("#maingame").appendChild(inapprove);
                document.querySelector("#maingame").appendChild(inreject);
            }
            // display text box to describe article
            else if (message.type === "DisplayArticleDescriptionForm") {
                var descform = document.createElement("form");
                descform.id = "form-describe-article";
                var desctext = document.createElement("input");
                desctext.id = "input-describe-article";
                desctext.type = "text";
                desctext.width = "360px"
                desctext.autocomplete = "off";
                desctext.minLength = 1;
                desctext.maxLength = message.data.maxlength;
                desctext.placeholder = "Write your description here!"
                desctext.value = "";
                var descsub = document.createElement("input");
                descsub.type = "submit";
                descsub.value = "Submit";
                descform.appendChild(desctext);
                descform.appendChild(descsub);
                // on form submit, send description to server
                descform.onsubmit = function(e) {
                    e.preventDefault();
                    if (document.querySelector("#input-describe-article").value !== "") {
                        room.send({ articledescription: document.querySelector("#input-describe-article").value });
                        // don't clear the form - allow for edits before the time runs out
                    }
                }
                document.querySelector("#maingame").appendChild(descform);
            }
            // display a player's submitted description of an article
            else if (message.type === "DisplayPlayerArticleDescription") {
                var dname = document.createElement("h3");
                dname.innerText = message.data.name;
                var ddesc = document.createElement("p");
                ddesc.innerText = message.data.description;
                document.querySelector("#maingame").appendChild(dname);
                document.querySelector("#maingame").appendChild(ddesc);
            }
            // display list of options for judge
            else if (message.type === "DisplayJudgingMenu") {
                var judgeform = document.createElement("form");
                judgeform.id = "form-judge-menu";
                var judgedd = document.createElement("select");
                judgedd.id = "select-judge-menu";
                var emptyelem = document.createElement("option");
                emptyelem.text = emptyelem.value = "";
                judgedd.add(emptyelem);
                for (id in message.data.options) {
                    var op = document.createElement("option");
                    op.text = message.data.options[id];
                    op.value = id;
                    judgedd.add(op);
                }
                var judgesub = document.createElement("input");
                judgesub.type = "submit";
                judgesub.value = "Confirm choice";
                judgeform.appendChild(judgedd);
                judgeform.appendChild(judgesub);
                // on form submit, send description to server
                judgeform.onsubmit = function(e) {
                    e.preventDefault();
                    if (document.querySelector("#select-judge-menu").value !== "") {
                        room.send({ judgetruthchoice: document.querySelector("#select-judge-menu").value });
                        // don't clear the form - allow for edits before the time runs out
                    }
                }
                document.querySelector("#maingame").appendChild(judgeform);
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
            var row = document.createElement("tr");
            var tdjudge = document.createElement("td");
            tdjudge.style.width = tdjudge.style.maxWidth = "20px";
            var tdnick = document.createElement("td");
            tdnick.style.width = tdnick.style.maxWidth = "128px";
            var tdscore = document.createElement("td");
            tdscore.style.width = tdscore.style.maxWidth = "32px";
            row.appendChild(tdjudge);
            row.appendChild(tdnick);
            row.appendChild(tdscore);

            playerscores[sessionId] = row;
            document.querySelector("#scores-table").appendChild(row);
            
            drawPlayerScore(player, sessionId);
            
            // call player.onChange()
            player.triggerAll();
        }
        
        room.state.players.onRemove = function(player, sessionId) {
            document.querySelector("#scores-table").removeChild(playerscores[sessionId]);
            delete playerscores[sessionId];
        }
        
        room.state.players.onChange = function(player, sessionId) {
            // update all player scores
            Object.keys(playerscores).forEach(function(sessionId) {
                drawPlayerScore(room.state.players[sessionId], sessionId);
            });
        }
        
        // send message to room on submit
        document.querySelector("#form-chat-message").onsubmit = function(e) {
            e.preventDefault();
            var input = document.querySelector("#input-chat-message");
            if (input.value == "") { return false; } // don't send empty messages
            //console.log("input message:", input.value);
            // send data to room
            room.send({ chatmessage: input.value });
            // clear input
            input.value = "";
        }
    });
    
    function drawPlayerScore(player, sessionId) {
        var children = playerscores[sessionId].childNodes;
        // child 0: judging or not
        if (player.isJudge) { children[0].innerText = "⚖️"; } else { children[0].innerText = ""; }
        // child 1: nickname
        children[1].innerText = player.nickname;
        // child 2: score
        children[2].innerText = player.score;
    }
    
    return false;
}

// Menu

var menus = ["about", "howto", "contrib"];
var currentmenu = undefined;

function menuItemSwitch(clicked) {
    // close all currently-opened menus
    for (m in menus) {
        document.querySelector("#" + menus[m]).style.display = "none";
        // clear active highlight
        document.querySelector("#menu-" + menus[m]).style.backgroundColor = "white";
        document.querySelector("#menu-" + menus[m]).style.boxShadow = "none";
    }

    // if not currently on the menu that's been clicked, switch to it
    if (currentmenu != clicked) {
        document.querySelector("#" + clicked).style.display = "block";
        currentmenu = clicked;
        // set active highlight
        document.querySelector("#menu-" + clicked).style.backgroundColor = "#d3d3d3";
        document.querySelector("#menu-" + clicked).style.boxShadow = "inset 0 0 10px 10px white";
    }
    // otherwise, that menu is already open, so just let it close
    else { currentmenu = undefined; }
}

document.querySelector("#menu-about").onclick = function() { menuItemSwitch("about"); }
document.querySelector("#menu-howto").onclick = function() { menuItemSwitch("howto"); }
document.querySelector("#menu-contrib").onclick = function() { menuItemSwitch("contrib"); }