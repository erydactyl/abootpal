# abootpal: All-But-One Of These People Are Lying

An online multiplayer adaptation of [the Technical Difficulties'](http://www.techdif.co.uk/) game [Two Of These People Are Lying](https://www.youtube.com/watch?v=3UAOs9B9UH8), using node.js with [Colyseus](https://github.com/colyseus/colyseus/) in TypeScript.

## About

### How the game works

The game is an improvisational bluffing game based around [Wikipedia](https://en.wikipedia.org) articles. An article title is chosen, and players takes a turn to describe the contents of that article - although only one of them has *actually* read it, while the others are just making everything up based only on the title. An additional player acts as the judge, and tries to figure out who the one player telling the truth is.

### What abootpal does (or will do)

This web version manages a lot of the boring admin side of the game for you. It can:

* Allocate articles to players automatically
* Select which player's article to use for a round, without worrying about identifying based on things like their handwriting
* Choose who the judge will be
* Keep track of the scores and winner

All of this means that you can easily get to the much more important business of lying to your friends.

### What abootpal doesn't do

* Provide friends for you to play with
* Take responsibility for any damage to your relationships caused by lying
* Use anything close to industry-standard/best coding practice

## Setup

### Prerequisites

You'll need to install Node.js to use this. Currently the recommended way to do this on Ubuntu is using PPA, rather than apt-get. This may change in future, but as of the time of writing, the steps given in [this guide](https://tecadmin.net/install-latest-nodejs-npm-on-ubuntu/) work:

```
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -
sudo apt-get install nodejs
```

If you're running on Windows 10, you can install the Ubuntu subsystem and follow the same set of instructions.

### Setting up the repository

Clone the repo to wherever you like, and run it with `npm start`.
