import React, { Component } from "react";
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom' 
import instruments from "../../public/instruments.js"
import sound from "../images/RadioWaves.png";
import silent from "../images/RadioNoWaves.png";
import Chat from '../modules/Chat.js';
import Avatar from "@material-ui/core/Avatar";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Select from "@material-ui/core/Select";
import IconButton from '@material-ui/core/IconButton';
import Dialog from "@material-ui/core/Dialog";
import List from "@material-ui/core/List";
import {CopyToClipboard} from 'react-copy-to-clipboard';

import Box from "@material-ui/core/Box";
import Slide from '@material-ui/core/Slide';
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import MenuItem from "@material-ui/core/MenuItem";
// import "../modules/Audio.js";

import SongQueue from "../modules/SongQ"
import Timer from "../modules/Timer"
import NotFound from "./NotFound"
import Music from "../modules/Music"
import "../../utilities.css";
import "./Main.css";
import { withRouter } from "react-router-dom";
import { get, post } from "../../utilities";
import { socket } from "../../client-socket.js";
import ScorePage from "../modules/ScorePage";
import ReactPiano from "../modules/ReactPiano"
// import "../stylesheets/Audio.css";
// import "../stylesheets/Audio.scss";

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i].userId === obj.userId) {
            return true;
        }
    }

    return false;
}
class Room extends Component {
    constructor(props) {
        super(props);
        this.state = {
            roomName: String(this.props.computedMatch.params.id),
            status: "waitingToFinish",
            isLoading: true,
            endTime: new Date(),
            startTime: new Date(),
            songURL: "https://audio-ssl.itunes.apple.com/apple-assets-us-std-000001/AudioPreview71/v4/d7/f3/c5/d7f3c5c3-c38d-34e0-be13-4b4263af8847/mzaf_1361022562394107098.plus.aac.p.m4a",
            timeToStart: 3,
            roomData: [],
            redirect: false,
            refresh: false,
        
        }
    }
    componentDidMount() {
        post("/api/joinRoom", {roomName: this.state.roomName}).then((data) => {
            if(data.exists)
                 this.setState({roomID: data.roomID, roomData: data.roomData, status: data.status, isLoading: false})
            else {
                this.setState({isLoading: true, status: "doesNotExist"})
            }
        }) 
        socket.on("someoneJoinedRoom", (user) => {
            if(user.roomName !== this.state.roomName) return;
            let data = this.state.roomData
            data.push({userID: user.userID, userName: user.userName, score: 0})
            this.setState({roomData: data})
        })

        socket.on("updateRoomData", (update) => {
            if(update.roomName !== this.state.roomName) return;
            let arr = this.state.roomData
            arr = arr.filter((obj) => {return obj.userID !== update.entry.userID})
            arr.push(update.entry)
            this.setState({roomData: arr})
        })

        socket.on("startTimer", (data) => {
            if(this.state.roomName !== data.roomName) return;

            this.setState({
                status: "timer", 
                endTime: data.endTime, 
                startTime: data.startTime, 
                songID: data.songID,
                songURL: data.url,
                roundNum: data.roundNum
            })

            let counter = 0
            var interval = setInterval(() => {
                let timeToStart = Math.floor(((new Date(data.startTime).getTime() - (new Date()).getTime())/1000.0)+1.0)
                this.setState({timeToStart: timeToStart})
                counter += 1
                if(counter === 6) {
                    clearInterval(interval)
                }
            
            }, 1000)

        })

        socket.on("startGame", (data) => {
            if(this.state.roomName !== data.roomName) return;
            this.setState({roundNum: data.roundNum})
            if(this.state.status === "timer") {
                this.setState({status: "inProgress"})
                
            }

        })

        socket.on("finishGame", (data) => {
            if(this.state.roomName !== data.roomName) return;
            
               
            this.setState({
                status: "gameFinished", 
                endTime: data.endTime, 
                startTime: data.startTime, 
                songID: data.songID,
                songURL: data.url,
                timeToStart: 5
                
            })

            let counter = 0
            var interval = setInterval(() => {
                let timeToStart = Math.floor(((new Date(data.startTime).getTime() - (new Date()).getTime())/1000.0)+1.0)
                this.setState({timeToStart: timeToStart})
                counter += 1
                if(counter === 6) {
                    clearInterval(interval)
                }
            
            }, 1000)
        })

        socket.on("disconnect", () => {
            this.setState({refresh: true})
                
            
        })

        socket.on("inactive", (data) => {
            if(data.userId === this.props.userId) {
                this.setState({redirect: true})
            }
        })

    componentDidMount() {
        
    }

    render() {
        
        if(this.state.redirect) {
            return <Redirect to="/" />
        }
        if(this.state.refresh) {
            return <Redirect to={"/"+this.state.roomID} />
        }
        if(this.state.isLoading) {
            return <>
            <h1>Loading...</h1>
            </>
        }

        let blankGameData = this.state.users.map((user) => {
            return {userId: user.userId, userName: user.userName, score: 0, lyrics: [], mode: user.mode}
        })
        
        let body = <></>
        if(this.state.status === "waitingToFinish") {
            body = <h1>Waiting for Game to Finish</h1>
           
        }
        else if(this.state.status === "waitingToStart") {
            body = 
            <>
            <h3 style={{display: "flex", justifyContent: "center", alignItems: "center"}}> 
                    Invite Link: {window.location.href}
                    <CopyToClipboard text={window.location.href}
                        onCopy={() => {this.setState({copied:true})}}>
                        {!this.state.copied ? 
                            <button className = "button2">Copy to clipboard</button>
                            : <button className = "button2">Copied to clipboard!</button>
                        }
                    </CopyToClipboard>
                 </h3>
            <h2 style={{display: "flex", justifyContent: "center"}}>Waiting to Start</h2> 
            <ScorePage gameData = {blankGameData} userId = {this.props.userId} />
            <Button fullWidth onClick={() => {post("/api/startGame", {roomID: this.state.roomID, song: this.state.queue[0]})}}>Start Game</Button>
            </>
        }
        else if(this.state.status === "timer") {
            body = 
            <>
            <h2 style={{display: "flex", justifyContent: "center"}}>Game starting in {this.state.timeToStart} seconds</h2>
            <ScorePage gameData = {this.state.gameData} userId = {this.props.userId} />
            </>

        }
        else if(this.state.status === "inProgress") {
            body = 
            <>
            
            <Timer endTime={this.state.endTime} />

            {this.state.mode === "Typing" ? <TextField
          id="filled-basic"
          label="Lyrics"
          variant="outlined"
          style={{color: "#678efd"}}
          autoFocus
          fullWidth
          autoComplete='off' 
          value={this.state.currentWord}
          
          onChange={(event) => {
            this.setState({ currentWord: event.target.value });
          }}
          onKeyPress = {(event) => {
            if(event.charCode === 32) {
                let lyrics = this.state.lyrics
                lyrics.push(this.state.currentWord)
                this.setState({lyrics: lyrics, currentWord: ""}, () => {
                    post("/api/updateGameData", {gameID: this.state.gameID, lyrics: lyrics, roomID: this.state.roomID, mode: this.state.mode})
                })
                
              /*
              submitAnswer(this.state.theirAnswer)
              this.setState({
               
                theirAnswer: "",
              });
              */
            }
          }}
        /> : 
          <></>
        }
          <Box style={{display: "flex", justifyContent: "center", alignItems: "center"}}><Box width={600}><ReactPiano instrument={this.state.mode} gameID={this.state.gameID} /></Box></Box>
       
            <ScorePage gameData = {this.state.gameData} userId = {this.props.userId} />
            </>

        }
        else if(this.state.status === "finished") {
            body = 
            <>
            <h2 style={{display: "flex", justifyContent: "center"}}>Results</h2>
            <ScorePage gameData = {this.state.gameData} userId = {this.props.userId} />
            <Button fullWidth onClick={() => {post("/api/startGame", {roomID: this.state.roomID, song: this.state.queue[0]})}}>Start New Game</Button>
            </>

        }
        else {
            // should never happen
            body = <h1>Theres  a bug</h1>
        }

        return (
            <>
                {/*<button onClick = {()=>{console.log(this.state)}}>log room state</button>*/}
                
                 {/*<img src = {silent}></img>*/}
                 <Grid container direction="row">
                 {/* <div class="wrapper" id="wrapper">
                <label class="file" for="file">
                    choose a mp3 file
                    <input id="file" type="file"/>
                </label>
                </div> */}
                 {/* <h2 class="message">PLAY</h2>
                <a id="badge" href="http://www.chromeexperiments.com/experiment/audio-cloud/" target="_blank"><img src="https://lab.ma77os.com/audio-cloud/img/b4.png" alt="See my Experiment on ChromeExperiments.com"/></a>
                <a class="experiment-url" href="https://lab.ma77os.com/audio-cloud" target="_blank">source: lab.ma77os.com/audio-cloud</a> */}
                <Box width={"calc(100% - 400px)"} >
                     {body}
                </Box>
                <Box width={"400px"} >
                {this.state.status !== "inProgress" && this.state.status !== "timer" ? <Select
          value={this.state.mode}
          fullWidth
          onChange={(event) => {
              
              this.setState({mode: event.target.value})
                post("/api/setMode", {mode: event.target.value})
                }}
        >
   
          {["Typing"].concat(instruments).map((instrument) =>{return <MenuItem value={instrument}>{instrument}</MenuItem>})}
                </Select>:<></>}                

                    {this.state.status === "inProgress" && window.AudioContext ? <Box style={{height: "260px", overflow: scroll}}>
                <Music url = {this.state.songURL} visual={true}></Music>
            </Box> : <SongQueue queue = {this.state.queue} roomID ={this.state.roomID}/>}
            <Chat messages={this.props.chat} roomID={this.state.roomID} />
            
                </Box>
                </Grid>
                
                
            </>
        );
        
    }
}

export default Room;