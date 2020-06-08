/*
|--------------------------------------------------------------------------
| api.js -- server routes
|--------------------------------------------------------------------------
|
| This file defines the routes for your server.
|
*/
require("dotenv").config();
const xlsxFile = require('read-excel-file/node');
var autocorrect = {}

const API_KEY = process.env.API_KEY;
const express = require("express");
var request = require('request');
const levenshteiner = require('levenshteiner');
const utf8 = require('utf8');
// import models so we can interact with the database
const Room = require("./models/room");
const Message = require("./models/message");
const Song = require("./models/song");
const fs = require('fs');


// import authentication library
const auth = require("./auth");

// api endpoints: all these paths will be prefixed with "/api/"
const router = express.Router();

//initialize socket
const socket = require("./server-socket");

var api = require('genius-api');
var genius = new api(process.env.GENIUS_CLIENT_ACCESS_TOKEN);
var getLyrics = require('genius-lyrics-api').getLyrics;

router.post("/login", auth.login);
router.post("/logout", auth.logout);
router.get("/whoami", (req, res) => {
  if (!req.user) {
    // not logged in
    return res.send({});
  }

  res.send(req.user);
});

router.post("/initsocket", (req, res) => {
  // do nothing if user not logged in
  if (req.user) socket.addUser(req.user, socket.getSocketFromSocketID(req.body.socketid));
  res.send({});
});

// |------------------------------|
// | write your API methods below!|
// |------------------------------|

let getURL = (song) => {
  return song.instrumentalUrl ? song.instrumentalUrl: song.songUrl
}
let clearOutInactives = () => {
  console.log("Clearing out inactives")
  Room.find({}).then((rooms) => {
    rooms.forEach((room) => {
     // if((room.status !== "waiting") && (room.status !== "roundFinished")) return;
      let toRemove = []
      let counter = 0
      room.data.forEach((entry) => {
        counter += 1
        if(!socket.getSocketFromUserID(entry.userID) || !socket.getSocketFromUserID(entry.userID).connected) {
          if(!socket.getSocketFromUserID(entry.userID)) console.log("not even in there " + entry.userName);
          else console.log("in there but not connecteed " + entry.userName)
          toRemove.push(entry.userID)
          socket.getIo().emit("removeUser", {userID: entry.userID, roomID: room.roomID});
          let message = new Message({
            sender: {userID: entry.userID, userName: entry.userName},
            roomID: room.roomID, 
            message: entry.userName + " left the Room",
            systemMessage: true
          })
          message.save()
          socket.getIo().emit("newMessage", message)
        }
        if(counter === room.data.length ){ 
          let data = room.data 
          data = data.filter((entry) => {return !toRemove.includes(entry.userID)})
          room.data = data 
          room.save()
        }
      }
    )
  })})
}

//setInterval(clearOutInactives, 1000*60*30);

router.post("/badSong", (req, res) => {
  // do nothing if user not logged in
  Song.findOne({title: req.body.song.title}).then((song) => {
    if(song) {
      song.bad = true;
      song.save()
    }
  })
});
router.post("/createNewRoom", (req, res) => {

  Room.findOne({roomID: req.body.roomID}).then((room) => {
    if(room) {
      console.log("Already exists")
      res.send({created: false})
    } else {
      console.log(req.body.roomID)
      console.log("New Main")
      const newRoom = new Room({roomID: req.body.roomID, data: [], status: "waiting", song: {
        title: "",
        primaryArtist: "",
        artUrl: "",
        instrumentalUrl: "",
        karaokeUrl: "",
        songUrl: "",
        youtubeUrl: "",
        soundcloudUrl: ""
      },
    scoreHistory: []});
      newRoom.save().then(() => {
        res.send({created: true})
      })
     
    }
  })
  // After this you have to join it! Either way you will be able to :) 

});

// sends a list of users in the room (objects {userId: aw23aa, userName: AkshajK})
router.post("/joinRoom", (req, res) => {
  socket.addUser({userID: req.body.userID, roomID: req.body.roomID, userName: req.body.userName}, socket.getSocketFromSocketID(req.body.socketid));
  Room.findOne({roomID: req.body.roomID}).then((room) => {
    if(room) {
      socket.getIo().emit("someoneJoinedRoom", {userID: req.body.userID, userName: req.body.userName, roomID: req.body.roomID, score: req.body.score, rating: req.body.rating})
      let message = new Message({
        sender: {userID: req.body.userID, userName: req.body.userName},
        roomID: req.body.roomID, 
        message: req.body.userName + " " + ((req.body.score > 0) ? "re-" : "") + "joined the Room",
        systemMessage: true
      })
      message.save()
      socket.getIo().emit("newMessage", message)
      
      let data = room.data 
      data.push({userID: req.body.userID, userName: req.body.userName, score: req.body.score, rating: Number(req.body.rating)})
      room.data = data
      let scoreHistory = room.scoreHistory
      scoreHistory.push({userID: req.body.userID, userName: req.body.userName, scores: [0, 0, 0], maxScore: 0})
      room.scoreHistory = scoreHistory
      room.save().then(() => {
        res.send({exists: true, scoreHistory: room.scoreHistory, roundNum: room.roundNum, roomData: data, status: room.status, roomID: room._id, url: getURL(room.song), startTime:room.startTime, endTime: room.endTime})
      })
    }
    else {
      res.send({exists: false})
    }
  })
});


let finishGameMap = {}
let gameData = {}
let inProgressMap = {}

let fromNow = (num) => {
  return new Date((new Date()).getTime() + num)
}



let startGame = (roomID) => {
  // make sure it has not happened yet
  
  let obj = gameData[roomID]
  let roundNum = obj.roundNum 
  let rounds = obj.rounds 
  let songs = obj.songs 
  let gameID = obj.gameID
  
    socket.getIo().emit("startGame", {roomID: roomID, roundNum: roundNum})
    Room.findOne({roomID: roomID}).then((room) => {
      room.status = "inProgress"
      room.roundNum = roundNum
      room.save()

     
      let total =  room.data.length
      let waitingOn = Math.ceil(1.0*total/2.0 - 0.001)
      gameData[roomID]["waitingOn"] = waitingOn
      
      
      console.log("waitingOn:" + gameData[roomID].waitingOn + " roundnum" + gameData[roomID].roundNum)
    })

    setTimeout(() => finishGame(roomID, roundNum, gameID), 30000)

 
}

let updateUserRatings = (data) => {
  let newUsers = []
  let k = data.k || 60/data.length
  for(var i=0; i<data.length; i++) {
    let user1 = data[i]
    let newUser = JSON.parse(JSON.stringify(user1))
    let update = 0
    for(var j=0; j< data.length; j++){
      let user2 = data[j]
      let constant = 0
      if (user1.score>user2.score) {
        constant = 1
      } else if (user1.score === user2.score) {
        constant = 0.5
      }
      let p1 = 1.0 / (1.0 + Math.pow(10, (user2.rating - user1.rating) / 400.0));
      update += k * (constant - p1); 
    }
    newUser.rating += (update>0) ? 1.5*update : update;
    
    newUsers.push(newUser)
  }
  return newUsers
}

let finishGame = (roomID, possibleRoundNum, gameID) => {

  let obj = gameData[roomID]
  gameData[roomID]["answered"] = 0
  let roundNum = obj.roundNum 
  if(possibleRoundNum !== -1) roundNum = possibleRoundNum
  let rounds = obj.rounds 
  let songs = obj.songs 

  

  if(finishGameMap[roomID][roundNum]) {
    console.log("You got me!")
    return 
  }
  if((gameID !== obj.gameID)) {
    console.log("You got me! gameID doesnt match D:")
    return 
  }
  finishGameMap[roomID][roundNum] = true
  if(roundNum === rounds) {
    inProgressMap[roomID] = false 
      Room.findOne({roomID: roomID}).then((room) => {
        let newData = updateUserRatings(room.data)
        console.log('hi')
        console.log(newData)
        room.status = "roundFinished"
        let scoreHistory = room.scoreHistory 
        let i=0
        let j=0
        let data = room.data
        for(i=0; i<data.length; i++) {
          for(j=0; j<scoreHistory.length; j++) {
            if(scoreHistory[j].userID === data[i].userID) {
              scoreHistory[j].scores.push(data[i].score)
              if(data[i].score > scoreHistory[j].maxScore) scoreHistory[j].maxScore = data[i].score 
            }
          }
        }
        room.data = newData
        room.save().then(() => {
          socket.getIo().emit("results", {answer: songs[roundNum-1], roomID: roomID, scoreHistory: room.scoreHistory, data: newData})
        })
      })
  }
  else {
    socket.getIo().emit("finishGame", {answer: songs[roundNum-1], roomID: roomID, url: getURL(songs[roundNum]),  startTime: fromNow(3000), endTime: fromNow(33000)})
      Room.findOne({roomID: roomID}).then((room) => {
        room.status = "gameFinished"
        room.song = songs[roundNum]
        room.startTime = fromNow(3000)
        room.endTime = fromNow(33000)
        room.markModified("song")
        room.save()
      })
      
      setTimeout(() => {
        gameData[roomID]["roundNum"] = gameData[roomID]["roundNum"]+1
        startGame(roomID)
      }, 3000)
  }


}

router.post("/startGame", (req, res) => {
  if(inProgressMap[req.body.roomID]) return 
  inProgressMap[req.body.roomID] = true 
  console.log("startGame")
  var rounds = 5
  var roundNum = 0;
  var songs = []
  Song.aggregate(
    [ { $sample: { size: rounds } } ]
  ).then((ssongs) => {
    ssongs.forEach((song) => {
      songs.push(song)
      if(songs.length === ssongs.length) {

          // start the process!!!
          console.log(songs)
         
          
          
              Room.findOne({roomID: req.body.roomID}).then((room) => {
                
                let data = room.data 
                let i = 0
                for(i=0; i<data.length; i++) data[i].score = 0 
                room.status = "timer"
                room.startTime = fromNow(3000),
                room.endTime = fromNow(33000)
                room.song = songs[0]
                room.data = data
                room.roundNum = 1
                room.markModified("song")
               
                room.save().then(() => {
                  console.log("startin timer")
                  socket.getIo().emit("startTimer", {roomID: req.body.roomID, url: getURL(songs[0]), startTime: fromNow(3000), endTime: fromNow(33000), roundNum: 1})              
                  finishGameMap[req.body.roomID] = {}
                  gameData[req.body.roomID] = {roundNum: 1, rounds: rounds, songs: songs, gameID: Math.random().toString(36).substring(2, 15), answered: 0}
                  setTimeout(() => {
                    
                    Room.findOne({roomID: req.body.roomID}).then((room) => {
                      room.status = "inProgress"
                      room.save().then(() => {
                        startGame(req.body.roomID)
                      })
                    })
                   
                  }, 3000)  
                  clearOutInactives()

                  res.send({})
                })
              })



      }
    })
  })

});

  
  

var stringSimilarity = require('string-similarity');

let similarity = (a, b) => {
  return stringSimilarity.compareTwoStrings(a.toLowerCase(),b.toLowerCase());
}



router.post("/newMessage", (req, res) => {
  let systemMessage = false
  let style="message"
  let messageText = req.body.message
  if(req.body.systemMessage) systemMessage = true
  else {
    let roundNum = (req.body.inGame ? gameData[req.body.roomID]["roundNum"] : 1)
    let title = (req.body.inGame ? gameData[req.body.roomID]["songs"][roundNum-1].title : "")
    let curWaiting = (req.body.inGame ? gameData[req.body.roomID]["waitingOn"] : 0)
    if((curWaiting >= 1) && req.body.inGame && ((similarity(messageText, title) > 0.7) || (similarity(messageText.toLowerCase().replace("fuck", "forget"), title) > 0.7) ||
    (similarity(messageText.toLowerCase().replace(" and ", " & "), title) > 0.7))) {
      
      systemMessage = true 
      messageText = req.body.userName + " guessed the title!"
      style="Correct Answer"
     
      
     
      Room.findOne({roomID: req.body.roomID}).then((room) => {

        let givenPoints =  Math.floor(((new Date(room.endTime)).getTime() - (new Date()).getTime()))/1000.0

        if((givenPoints > 0) && (room.status === "inProgress")) {

        let willFinish = (curWaiting === 1)
      
      gameData[req.body.roomID]["waitingOn"] = curWaiting - 1 
      let numAnswered = gameData[req.body.roomID]["answered"]
      gameData[req.body.roomID]["answered"] =  numAnswered+ 1 


       
        //if(givenPoints < 0) givenPoints = 0
        //let points = Math.floor(Math.floor((req.body.points>=20 ? givenPoints-20: 0)+ givenPoints) + curWaiting*5 + 5)
        let points = 40 + Math.floor(givenPoints) + (numAnswered === 0 ? 30 : (numAnswered === 1 ? 15 : (numAnswered === 2 ? 5 : 0)))
        let newEntry = {userID: req.body.userID, userName: req.body.userName, score: req.body.score + points, rating: Number(req.body.rating)}

        let data = room.data 
        data = data.filter((entry) => {
          return entry.userID !== req.body.userID;
        })
        data.push(newEntry)
        room.data = data 
        room.save().then(() => {
          socket.getIo().emit("updateRoomData", {userID: req.body.userID, userName: req.body.userName, roomID: req.body.roomID, entry: newEntry, time: (30 - givenPoints).toFixed(3), points: points})

          if(willFinish) {
            finishGame(req.body.roomID, -1, gameData[req.body.roomID].gameID)

          }

        })

      }
      else {
        console.log("AAAAAHHHHAHAHAH submitted too late")
        let newMessage = new Message({
          sender: {userID: req.body.userID, userName: req.body.userName},
          roomID: req.body.roomID, 
          message: req.body.userName + " submitted too late :(",
          systemMessage: true,
          style: "message",
        })
      
      
      
      
        socket.getIo().emit("newMessage", newMessage)
      }
      })
    }
  }



  let message = new Message({
    sender: {userID: req.body.userID, userName: req.body.userName},
    roomID: req.body.roomID, 
    message: messageText,
    systemMessage: systemMessage,
    style: style,
  })




  socket.getIo().emit("newMessage", message)
  res.send({});
});

router.get("/songLyrics", (req, res) => {
  console.log(req.query.title)
  request('https://itunes.apple.com/search?term='+utf8.encode(req.query.title+" instrumental")+'&entity=song&limit=1', (error, response, body) => {
    // request('https://itunes.apple.com/search?term='+utf8.encode(req.query.title+" karaoke")+'&entity=song&limit=1', (error1, response2, body1) => {
      console.log(response.statusCode)
      if (!error && response.statusCode == 200 && JSON.parse(body).results[0]) {
        let songURL = JSON.parse(body).results[0].previewUrl
        let karaokeURL = songURL
        // console.log(response2.statusCode)
        // if(!error1 && response2.statusCode == 200 && JSON.parse(body1).results[0]) {
        //   console.log("maybe changed")
        //   karaokeURL = JSON.parse(body1).results[0].previewUrl
        // }
        genius.search(req.query.title).then(function(response1) {
          genius.song(response1.hits[0].result.id).then(function(response) {
            console.log('song', response.song); 
            let title = String(response.song.title);
            let primaryArtist =  response.song.primary_artist.name;
            // let featuredArtists = "Daniel";
            let artUrl = response.song.song_art_image_url;
            res.send({
              title: title,
              primaryArtist: primaryArtist,
              artUrl: artUrl,
              url: songURL,
              karaokeUrl: karaokeURL
            })
          });
        });
      } else {
        res.send({
          title: "RIP",
          primaryArtist: "RIP",
          artUrl: "hi",
          url: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview117/v4/c6/62/9d/c6629d72-2585-0543-bd72-bf3c1e53f58e/mzaf_8154972110049456890.plus.aac.p.m4a",
        })
      }
    // })
  })
})

router.get("/songKaraoke", (req, res) => {
  console.log(req.query.title)
  request('https://itunes.apple.com/search?term='+utf8.encode(req.query.title+" karaoke")+'&entity=song&limit=1', (error, response, body) => {
    console.log(response.statusCode)
    if (!error && response.statusCode == 200 && JSON.parse(body).results[0]) {
      let karaokeURL = JSON.parse(body).results[0].previewUrl
      res.send({karaokeUrl: karaokeURL})
    } else {
      res.send({
        karaokeUrl: "HI"
      })
    }
  })
})


router.get("/songUrl", (req, res) => {
  console.log(req.query.title)
  request('https://itunes.apple.com/search?term='+utf8.encode(req.query.title)+'&entity=song&limit=1', (error, response, body) => {
    console.log(response.statusCode)
    if (!error && response.statusCode == 200 && JSON.parse(body).results[0]) {
      let karaokeURL = JSON.parse(body).results[0].previewUrl
      res.send({songUrl: karaokeURL})
    } else {
      res.send({
        songUrl: "HI"
      })
    }
  })
})


router.post("/songLink", (req, res) => {
  console.log("posted "+req.body.title)
  const song = new Song({
    title: req.body.title,
    primaryArtist: req.body.primaryArtist,
    // featuredArtists: req.body.featuredArtists,
    artUrl: req.body.artUrl,
    songUrl: req.body.songUrl,
    instrumentalUrl: req.body.instrumentalUrl,
    karaokeUrl: req.body.karaokeUrl,
    youtubeUrl: req.body.youtubeUrl,
    soundcloudUrl: req.body.soundcloudUrl,
  })
  song.save();
  res.send({});
})

router.post("/songModify", (req, res) => {
  if(!process.env.password) {
    console.log("no password")
    res.send({})
  } else {
    console.log("posted "+req.body.title)
  Song.findOne({title: req.body.title, primaryArtist:req.body.primaryArtist}).then((song) => {
    if(song) {
      song.title = req.body.title
      song.primaryArtist = req.body.primaryArtist
      song.songUrl = req.body.songUrl
      song.instrumentalUrl = req.body.instrumentalUrl
      song.karaokeUrl = req.body.karaokeUrl
      song.youtubeUrl = req.body.youtubeUrl
      song.soundcloudUrl = req.body.soundcloudUrl
      song.save();
    } else {
      const song1 = new Song({
        title: req.body.title,
        primaryArtist: req.body.primaryArtist,
        // featuredArtists: req.body.featuredArtists,
        artUrl: req.body.artUrl,
        songUrl: req.body.songUrl,
        instrumentalUrl: req.body.instrumentalUrl,
        karaokeUrl: req.body.karaokeUrl,
        youtubeUrl: req.body.youtubeUrl,
        soundcloudUrl: req.body.soundcloudUrl,
      })
      song1.save();
     
    }
    console.log("saved")
  })
  res.send({});
  }
})

router.get("/printall", (req,res) => {
  Song.find({}).then((songs) => {
    songs.forEach((song) => {
      console.log(song.title)
    })
  })
  res.send({});
})

router.post("/simpleLog", (req,res) => {
  xlsxFile("./MongoSongs.xlsx").then((rows) => {
    for(var i= 0; i<rows.length; i++) {
      let j = i
      console.log(rows[j][0])
      request('https://itunes.apple.com/search?term='+utf8.encode(rows[j][0])+'&entity=song&limit=1', (error, response, body) => {
        if (!error && response.statusCode == 200 && JSON.parse(body).results[0]) {
          let songUrl = JSON.parse(body).results[0].previewUrl
          genius.search(rows[j][0]).then(function(response1) {
            genius.song(response1.hits[0].result.id).then(function(response) {
              let title = String(response.song.title);
              let primaryArtist =  response.song.primary_artist.name;
              let artUrl = response.song.song_art_image_url;
              console.log("made it "+rows[j][0])
              Song.findOne({title:title}).then((oldSong) => {
                if(oldSong) {
                  oldSong.songUrl = songUrl
                  oldSong.save();
                } else {
                  const song1 = new Song({
                    title: title,
                    primaryArtist: primaryArtist,
                    artUrl: artUrl,
                    songUrl: songUrl,
                  })
                  song1.save();
                }
              })
            });
          });
        }
      })
    }
  })
  res.send({});
})

// router.post("/getInstrumentals", (req,res) => {
//   let obj = {
//     table: []
//   };
//   let numAdded=0
//   Song.find({}).then((songs) => {
//     songs.forEach((song) => {
//       request('https://itunes.apple.com/search?term='+utf8.encode(song.title + " " + song.primaryArtist + " instrumental")+'&entity=song&limit=1', (error, response, body) => {
//         request('https://itunes.apple.com/search?term='+utf8.encode(song.title + " " + song.primaryArtist + " karaoke")+'&entity=song&limit=1', (error1, response1, body1) => {
//           if (!error && response.statusCode == 200 && JSON.parse(body).results[0] && !error1 && response1.statusCode == 200 && JSON.parse(body1).results[0]) {
//             let instrumentalUrl = JSON.parse(body).results[0].previewUrl
//             let karaokeUrl = JSON.parse(body1).results[0].previewUrl
//             obj.table.push({
//               title: song.title,
//               primaryArtist: song.primaryArtist,
//               artUrl: song.artUrl,
//               instrumentalUrl: instrumentalUrl,
//               karaokeUrl: karaokeUrl
//             })
//           }
//           numAdded+=1;
//           console.log(obj.table.length)
//           if(obj.table.length === 100) {
//             var json = JSON.stringify(obj)
//             fs.writeFile('myjsonfile.json', json, 'utf8', ()=>{console.log("success")})
//           }
//         })
//       })
//     })
//   })
//   res.send({complete: true})
// })

// router.get("/readJSON", (req, res)=> {
//   fs.readFile('myjsonfile.json', 'utf8', function readFileCallback(err, data){
//     if (err){
//       console.log(err);
//     } else {
//       obj = JSON.parse(data); //now it an object
//       console.log(obj.table.length)
//       res.send({complete: obj})
//     }
//   })
// })

// router.post("/instrumentals", (req,res) => {
//   fs.readFile('myjsonfile.json', 'utf8', function readFileCallback(err, data){
//     if (err){
//       console.log(err);
//     } else {
//       obj = JSON.parse(data); //now it an object
//       obj.table.forEach((song) => {
//         let newSong = new Song({
//           title: song.title,
//           primaryArtist: song.primaryArtist,
//           artUrl: song.artUrl,
//           songUrl: song.songUrl,
//         })
//         console.log(newSong)
//         newSong.save();
//       })
//     }
//   })
//   res.send({complete: true})
// })



// anything else falls to this "not found" case
router.all("*", (req, res) => {
  console.log(`API route not found: ${req.method} ${req.url}`);
  res.status(404).send({ msg: "API route not found" });
});

module.exports = router;
