import React, { Component } from "react";
import { BrowserRouter, Route, Switch, Redirect } from 'react-router-dom' 
import instruments from "../../public/instruments.js"
import sound from "../images/RadioWaves.png";
import silent from "../images/RadioNoWaves.png";
import logo from "../images/logo4.png";
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
import { Link } from '@material-ui/core';

import Box from "@material-ui/core/Box";
import Paper from "@material-ui/core/Paper";
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
import Cookies from 'universal-cookie';
const cookies = new Cookies()

class Room extends Component {
    constructor(props) {
        super(props);
        this.state = {
            status: "waitingToFinish",
            score: 0,
            rating: 1000,
            isLoading: true,
            endTime: new Date(),
            answered: false,
            startTime: new Date(),
            url: "",
            timeToStart: 3,
            roomData: [],
            redirect: false,
            refresh: false,
            copied: false,
            roomAnswers: [],
            roundNum: 1,
            scoreHistory: [],
            leaderboard: false,
        }
    }
    componentDidMount() {
        socket.on("connect", () => {
            setInterval(() => {
                if(!socket.connected) {
                    this.setState({refresh: true})
                }
            }, 1000)
        })
        setInterval(() => {
            if(!socket.connected) {
                this.setState({refresh: true})
            }
        }, 1000)
        let rating = this.state.rating || 1000
        if(this.props.socketid !== "") {
        post("/api/joinRoom", {socketid: this.props.socketid, roomID: this.props.roomID, userID: this.props.userID, userName: this.props.userName, score: 0, rating: rating}).then((data) => {
            if(data.exists)
                 this.setState({leaderboard: (data.status === "roundFinished" || data.status === "waiting"), scoreHistory: data.scoreHistory, roomID: data.roomID, roundNum: data.roundNum, roomData: data.roomData, status: data.status, isLoading: false, url: data.url, startTime: data.startTime, endTime: data.endTime})
            else {
                this.setState({isLoading: false, status: "doesNotExist"})
            }
        }) 
        }
       

        socket.on("removeUser", (user) => {
            if(user.roomID !== this.props.roomID) return;
            let data = this.state.roomData 
            data = data.filter((entry) => {return entry.userID !== user.userID})
            this.setState({roomData: data})
         
        })
        socket.on("someoneJoinedRoom", (user) => {
            if(user.roomID !== this.props.roomID) return;
            let data = this.state.roomData
            data.push({userID: user.userID, userName: user.userName, score: 0, rating: user.rating})
            this.setState({roomData: data})
        })

        socket.on("updateRoomData", (update) => {
            if(update.roomID !== this.props.roomID) return;
            let arr = this.state.roomData
            arr = arr.filter((obj) => {return obj.userID !== update.entry.userID})
            arr.push(update.entry)

            let arr2 = this.state.roomAnswers;
            arr2.push({time: update.time, points: update.points, userID: update.entry.userID, userName: update.entry.userName})



            this.setState({roomData: arr, roomAnswers: arr2})
            if(update.entry.userID === this.props.userID) this.setState({score: update.entry.score, answered: true})
        })

        socket.on("startTimer", (data) => {
            if(this.props.roomID !== data.roomID) return;
            let newdata = this.state.roomData 
            let i = 0
            for(i=0; i<newdata.length; i++) newdata[i].score = 0 
                
            this.setState({
                status: "timer", 
                endTime: data.endTime, 
                startTime: data.startTime, 
                roomData: newdata,
                roomAnswers: [],
                url: data.url,
                score: 0,
                roundNum: data.roundNum,
                leaderboard: false
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
            if(this.props.roomID !== data.roomID) return;
            this.setState({roundNum: data.roundNum, status: "inProgress", answered: false, roomAnswers: [], timeToStart: 3})
          

        })

        socket.on("finishGame", (data) => {
            if(this.props.roomID !== data.roomID) return;
            
               
            this.setState({
                status: "gameFinished", 
                endTime: data.endTime, 
                startTime: data.startTime, 
                url: data.url,
                answer: data.answer,
                timeToStart: 3,
                
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


        socket.on("results", (data) => {
            if(this.props.roomID !== data.roomID) return;

            this.setState({
                status: "roundFinished", 
                answer: data.answer,
                timeToStart: 3,
                scoreHistory: data.scoreHistory,
                leaderboard: true,
                roomData: data.data
            })
            let newRating = 1000
            for(var j = 0; j<data.data.length; j++) {
                if(data.data[j].userID === this.props.userID) {
                     newRating = data.data[j].rating
                }
            }
            this.setState({
                data: data.data,
                rating: newRating,
            })
            //cookies.set("rating", newRating)
        })

        socket.on("disconnect", () => {
            this.setState({refresh: true})
                
            
        })

        socket.on("reconnect", (attemptNumber) => {
       
            this.setState({refresh: true})
        })

        socket.on("inactive", (data) => {
            if(data.userID === this.props.userID) {
                this.setState({redirect: true})
            }
        })
    }

    componentDidUpdate(prevProps) {
        let rating = this.state.rating || 1000
        if((this.props.roomID !== prevProps.roomID) || (this.props.socketid !== prevProps.socketid)) {
            post("/api/joinRoom", {socketid: this.props.socketid, roomID: this.props.roomID, userID: this.props.userID, userName: this.props.userName, rating: rating}).then((data) => {
                if(data.exists)
                    this.setState({leaderboard: (data.status === "roundFinished" || data.status === "waiting"), scoreHistory: data.scoreHistory, roomID: data.roomID, roundNum: data.roundNum, roomData: data.roomData, status: data.status, isLoading: false, url: data.url, startTime: data.startTime, endTime: data.endTime})
                else {
                    this.setState({isLoading: false, status: "doesNotExist"})
                }
            }) 
        }
    }

    render() {
        
        
        if(this.state.redirect) {
            window.location.href = "/"
        }
        if(this.state.refresh) {
            console.log("Aha, you have been refreshed")
            window.location.reload();
        }
        if(this.state.isLoading) {
            return <>
            <h1>Loading...</h1>
            </>
        }

        let body = <></>
        if(this.state.status === "waitingToFinish") {
            body = 
            <>
                <Timer endTime={this.state.endTime} />
                <ScorePage withLeaderboard = {this.state.leaderboard} roomData = {this.state.roomData} userID = {this.props.userID} roomAnswers={this.state.roomAnswers} />
                
            </>
           
        }
        else if(this.state.status === "waiting") {
            
            body = 
            <>
            
            <h2 style={{display: "flex", justifyContent: "center"}}>Waiting to Start</h2> 
            <ScorePage withLeaderboard = {this.state.leaderboard} roomData = {this.state.roomData} userID = {this.props.userID} />
            <Button fullWidth onClick={() => {post("/api/startGame", {roomID: this.props.roomID})}}>Start Game</Button>
            </>
        }
        else if(this.state.status === "timer") {
            body = 
            <>
            <h2 style={{display: "flex", justifyContent: "center"}}>Game starting in {this.state.timeToStart} seconds</h2>
            <ScorePage withLeaderboard = {this.state.leaderboard} roomData = {this.state.roomData} userID = {this.props.userID} />
            </>

        }
        else if(this.state.status === "inProgress") {
            body = 
            <>
            

            <Timer endTime={this.state.endTime} />
            
            <ScorePage withLeaderboard = {this.state.leaderboard} roomData = {this.state.roomData} userID = {this.props.userID} roomAnswers={this.state.roomAnswers} />
            </>

        }
        else if(this.state.status === "gameFinished") {
            body = 
            <>
            {(this.state.answer) ? 
            <h2 style={{display: "flex", justifyContent: "center"}}>{"Answer: " + this.state.answer.title + " by " + this.state.answer.primaryArtist}</h2>
            
            : <></>}
            <ScorePage withLeaderboard = {this.state.leaderboard} roomData = {this.state.roomData} userID = {this.props.userID} roomAnswers={this.state.roomAnswers} />
            
            <h3 style={{display: "flex", justifyContent: "center"}}>Next Round in {this.state.timeToStart} seconds</h3>
           
            </>
        }
        else if(this.state.status === "roundFinished") {
            body = 
            <>

            <h2 style={{display: "flex", justifyContent: "center"}}>Final Results</h2>
            <ScorePage withLeaderboard = {this.state.leaderboard} roomData = {this.state.roomData} userID = {this.props.userID} roomAnswers={this.state.roomAnswers} finalResults={this.state.answer ? true : false} withLeaderboard = {this.state.leaderboard} />
            {(this.state.answer) ? 
            <h2 style={{display: "flex", justifyContent: "center"}}>{"Answer: " + this.state.answer.title + " by " + this.state.answer.primaryArtist}</h2>
            : <></>}            
            <Button fullWidth onClick={() => {post("/api/startGame", {roomID: this.props.roomID})}}>Start New Game</Button>
            </>

        }
        else if(this.state.status === "doesNotExist") {
            body = 
          

            <h2 style={{display: "flex", justifyContent: "center"}}>This Room Does Not Exist Yet</h2>
            

        }
        else {
            // should never happen
            body = <h1>Theres  a bug</h1>
        }
        let url = window.location.href
            if(url.charAt(url.length - 1) === '/') url += this.props.roomID
        return (
            <>
                
                 <Grid container direction="row" style={{height: "100%"}}>
                 
                 {this.state.leaderboard ?
                  <Paper style={{width: "250px", height: "100%"}} >
                 <h2 style={{display: "flex", justifyContent: "center"}}>Top Ratings</h2> 
                 <ScorePage withLeaderboard = {this.state.leaderboard} roomData = {this.state.roomData} userID = {this.props.userID} leaderboard={true} rating={true} />

                 <h2 style={{display: "flex", justifyContent: "center"}}>Top Scores</h2>                      
                 <ScorePage withLeaderboard = {this.state.leaderboard} roomData = {this.state.scoreHistory} userID = {this.props.userID} leaderboard={true} />
                 
                </Paper> : <></>}
                
                 
                
                 <Box width={this.state.leaderboard ? "calc(100% - 650px)" : "calc(100% - 400px)"} height="100%" >
                     {body}
                </Box>
                <Paper style={{width: "360px", padding: "20px 20px 20px 20px"}}>
               
   
                     

                    {<Box style={{height: (this.state.status === "inProgress" ? "240px" : "0px"), overflow: "auto"}}>
                <Music url = {this.state.url} visual={window.AudioContext ? true : false} pauseButton={window.AudioContext ? false : true} roomID = {this.props.roomID} autoplayMusic={this.state.status === "inProgress"} />
                </Box>} 
        {(this.state.status !== "inProgress") && (this.state.answer) ? 
            <Box style={{height: "240px", width: "100%",  display: "flex", overflow: "auto", justifyContent: "center", alignItems: "center"}}><img src = {this.state.answer.artUrl} height={"240px"} /></Box> 
            : (this.state.status === "inProgress" ? <></> :
            <Box style={{height: "240px", width: "100%",  display: "flex", overflow: "auto", justifyContent: "center", alignItems: "center"}}><img src ={logo} style={{width: "300px",  display: "flex", overflow: "auto", justifyContent: "center", alignItems: "center"}}></img></Box>)}
            <h2 style={{display: "flex", justifyContent: "center"}}>{"Round " + this.state.roundNum + " of 5"}</h2>
            <Chat 
                endTime={this.state.endTime} 
                messages={this.props.chat} 
                roomID={this.props.roomID} 
                status={this.state.status} 
                answered={this.state.answered} 
                userName={this.props.userName} 
                userID={this.props.userID} 
                score={this.state.score}
                rating = {this.state.rating || 1000}
            />
            <Button fullWidth onClick={() => {
                        if(this.state.leaderboard) {
                            this.setState({leaderboard: false})
                        }
                        else {
                            this.setState({leaderboard: true})
                        }
                    }}>{this.state.leaderboard ? "Hide Leaderboard" : "Show Leaderboard"}</Button>   
                {/*
                <h3 style={{display: "flex", justifyContent: "center", alignItems: "center"}}> 
                    Invite Link: {url}
                   
                 </h3>
                  <CopyToClipboard text={url}
                        onCopy={() => {this.setState({copied:true})}}>
                        {!this.state.copied ? 
                            <Button fullWidth className = "button2">Copy to clipboard</Button>
                            : <Button fullWidth className = "button2">Copied to clipboard!</Button>
                        }
                    </CopyToClipboard>
                    
                    <Button fullWidth onClick={() => {
                        let badsong = this.state.status === "inProgress" ? this.state.song : this.state.answer
                        console.log("Bad song: ")
                        console.log(badsong)
                        post("/api/badSong", {song: badsong})
                    }}>Mark Song as Bad</Button>
                    <div className="margins">
                        <Link className = "margins" target="_blank" href = "https://docs.google.com/forms/d/e/1FAIpQLSc0DR9zF_wR7mPAwPWjyp2DdygBftxvKATUPZsjGBBKRiCYcg/viewform?usp=sf_link">Submit Song Requests</Link>
                </div>*/}
                </Paper>
                </Grid>
                
                
            </>
        );
        
    }
}

export default Room;