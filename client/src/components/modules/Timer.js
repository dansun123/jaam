import Box from "@material-ui/core/Box";
import React, { Component, useState } from "react";
import { get, post } from "../../utilities";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";

import { makeStyles, withStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";
import LinearProgress from "@material-ui/core/LinearProgress";

const BorderLinearProgress = withStyles((theme) => ({
  root: {
    height: 10,
    borderRadius: 5,
  },
  colorPrimary: {
    backgroundColor: theme.palette.grey[theme.palette.type === "dark" ? 700 : 200],
  },
  bar: {
    borderRadius: 5,
    backgroundColor: "#1a90ff",
  },
}))(LinearProgress);

export default function Timer(props) {
  let originalValue = (new Date(props.endTime).getTime() - new Date().getTime()) / 1000.0;
  const [value, setValue] = useState(originalValue);
  const [isetInterval, setSetInterval] = useState(false);
  const [color, setColor] = useState("#6c57f5");
  let counter = 0;
  if(!isetInterval) {
  let interval = setInterval(() => {
    let val = (new Date(props.endTime).getTime() - new Date().getTime()) / 1000.0;
    setValue(val);
    counter = counter + 0.1;
    if (val < 0) clearInterval(interval);
    //console.log(val);
  }, 100);
  setSetInterval(true)
  }
  if (value <= 3 && value >= -5 && color !== "#FF0000") {
    setColor("#FF0000");
  }

  return (
    /* <h1 style={{color: color, display: "flex", justifyContent: "center"}}>{value+1}</h1>*/
    <BorderLinearProgress variant="determinate" value={100.0 - (value / 30.0) * 100.0} />
  );
}
