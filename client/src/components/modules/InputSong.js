import React, { Component } from 'react'
import Button from "@material-ui/core/Button";
import Box from "@material-ui/core/Box";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import TextField from "@material-ui/core/TextField";
import { get, post } from "../../utilities";

import Music from "./Music";

class InputSong extends React.Component {
    constructor(props) {
        super(props);
        this.state = { 
            title: "",
            artist: "",
            answerKey: "",
            lastMessage: new Date(),
        }
    }

    handleChangeTitle = event => {
        this.setState({ title: event.target.value });
    };

    handleChangeArtist = event => {
        this.setState({ artist: event.target.value });
    };

    handleChangeSong = event => {
        this.setState({songUrl: event.target.value });
    };

    handleChangeInstrumental = event => {
        this.setState({instrumentalUrl: event.target.value });
    };

    handleChangeKaraoke = event => {
        this.setState({karaokeUrl: event.target.value });
    };

    handleChangeYoutube = event => {
        this.setState({youtubeUrl: event.target.value });
    };

    handleChangeSoundcloud = event => {
        this.setState({soundcloudUrl: event.target.value });
    };

    handleFetch = event => {
        event.preventDefault();
        // this.sendMessage();
        get("/api/songLyrics", {title: this.state.title, artist: this.state.artist}).then((response) => {
            get("/api/songKaraoke", {title: response.title+" "+response.primaryArtist}).then((res) => {
                get("/api/songUrl", {title: this.state.title}).then((res1) => {
                    this.setState({
                        title: this.state.title, 
                        artist: response.primaryArtist,
                        // featuredArtists: response.featuredArtists,
                        artUrl: response.artUrl,
                        songUrl: res1.songUrl,
                        instrumentalUrl: response.url,
                        karaokeUrl: res.karaokeUrl!=="HI" ? res.karaokeUrl : response.url,
                    })
                })
            })
        })
    };

    handleSubmit = event => {
        event.preventDefault();
        // this.sendMessage();
        let body = {
            title: this.state.title, 
            primaryArtist: this.state.artist,
            // featuredArtists: this.state.featuredArtists,
            artUrl: this.state.artUrl,
            songUrl: this.state.songUrl,
            instrumentalUrl: this.state.instrumentalUrl,
            karaokeUrl: this.state.karaokeUrl,
            youtubeUrl: this.state.youtubeUrl,
            soundcloudUrl: this.state.soundcloudUrl,
        }
        post("/api/songModify", body).then(() => {
            console.log("Logged "+ this.state.title + " "+this.state.youtubeUrl)
            this.setState({ 
                artist: "", 
                answerKey: "",
                // featuredArtists: undefined,
                artUrl: undefined,
                songUrl: "",
                instrumentalUrl: "",
                karaokeUrl: "",
                youtubeUrl: "",
                soundcloudUrl: "",
            })
        });
    };

    render() {
      return (
        <Box>
            {/*<button onClick = {()=>{console.log(this.state)}}>log InputSong state</button>*/}

            <TextField
                label="Title"
                variant="outlined"
                size="small"
                value={this.state.title}
                fullWidth
                onChange={this.handleChangeTitle}
                onKeyPress = {(event) => {
                    if(event.charCode === 13) {
                        if((new Date()).getTime() - ((new Date(this.state.lastMessage)).getTime()) >= 500) {
                            this.setState({lastMessage: new Date()})
                            this.handleFetch(event)
                        }
                    }
                }}
            />
            <div>by</div>
            <TextField
                label="Artist"
                variant="outlined"
                size="small"
                value={this.state.artist}
                fullWidth
                onChange={this.handleChangeArtist}
            />
            <button onClick = {() => {
                if(true) {
                    if((new Date()).getTime() - ((new Date(this.state.lastMessage)).getTime()) >= 500) {
                        this.setState({lastMessage: new Date()})
                        this.handleFetch(event)
                    }
                }
            }}> Fetch
            </button>
            {this.state.artUrl ? <img src = {this.state.artUrl} style={{width:"100px", height: "100px"}}/>: null}
            {this.state.soundcloudUrl ? <><Music url = {this.state.soundcloudUrl} pauseButton={true} visual = {true} /></>: null}
            <TextField
                label="SoundcloudUrl"
                variant="outlined"
                size="small"
                value={this.state.soundcloudUrl}
                fullWidth
                onChange={this.handleChangeSoundcloud}
            />
            {this.state.youtubeUrl ? <Music url = {this.state.youtubeUrl} pauseButton={true} />: null}
            <TextField
                label="YoutubeUrl"
                variant="outlined"
                size="small"
                value={this.state.youtubeUrl}
                fullWidth
                onChange={this.handleChangeYoutube}
            />
            {this.state.songUrl ? <><Music url = {this.state.songUrl} pauseButton={true} /><a href={this.state.songUrl}>URL</a></>: null}
            <TextField
                label="SongUrl"
                variant="outlined"
                size="small"
                value={this.state.songUrl}
                fullWidth
                onChange={this.handleChangeSong}
            />
            {this.state.instrumentalUrl ? <><Music url = {this.state.instrumentalUrl} pauseButton={true} /><a href={this.state.instrumentalUrl}>URL</a></>: null}
            <TextField
                label="InstrumentalUrl"
                variant="outlined"
                size="small"
                value={this.state.instrumentalUrl}
                fullWidth
                onChange={this.handleChangeInstrumental}
            />
            {this.state.karaokeUrl ? <><Music url = {this.state.karaokeUrl} pauseButton={true} /><a href={this.state.karaokeUrl}>URL</a></>: null}
            <TextField
                label="KaraokeUrl"
                variant="outlined"
                size="small"
                value={this.state.karaokeUrl}
                fullWidth
                onChange={this.handleChangeKaraoke}
            />
            <button onClick = {() => {
                if(true) {
                    if((new Date()).getTime() - ((new Date(this.state.lastMessage)).getTime()) >= 500) {
                        this.setState({lastMessage: new Date()})
                        this.handleSubmit(event)
                    }
                }
            }}> Submit
            </button>

        </Box>
      );
    }
  }
  
  export default InputSong;