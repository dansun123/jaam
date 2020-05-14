import React, { Component, useState } from "react";
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import LinearProgress from '@material-ui/core/LinearProgress'
export default function ScorePage(props) {
  const [maxValue, setMaxValue] = useState(15)
  let scoreListElements = props.gameData.sort((a, b) => {return a.score - b.score}).map((user, place) => {
    let color = ""
    let fontWeight = 'normal'
    let barColor = "primary"
    if(user.userId === props.userId) {
      color = "#6c57f5"
      fontWeight = 'bold'
      barColor = "secondary"
    }
 
   
    if(user.score > maxValue) {
      setMaxValue(maxValue * 2)
    }
    if(Object.keys(props).includes("cutOff")) {
      if(place >= props.cutOff) return <></>
    }
    return <ListItem button>
      
    <ListItemText primary={(user.userName || "") + ": " + (user.score || "0") + " "} />
    <LinearProgress color={barColor} style={{ zIndex: 2, width: "80%", marginLeft: "auto"}} variant="determinate" value={Math.round(Math.max(0, Math.min(100, user.score*100.0/(maxValue))))} />
  </ListItem>
  })

  let height = "370px";
  return (
    <Box  style={{overflow: "scroll", height: height}} >
        <List>
          {scoreListElements}
        </List>
    </Box>
  );
};
