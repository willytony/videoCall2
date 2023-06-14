"use strict";

//Loading dependencies & initializing express
var os = require("os");
const path = require("path");
var express = require("express");
var app = express();
var http = require("http");
//For signalling in WebRTC
var socketIO = require("socket.io");

// app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.render("index.ejs");
});

var server = http.createServer(app);

server.listen(process.env.PORT || 8000);
var users = {};
var sockets = {};
var strangerQ = false;

var io = socketIO(server);

io.sockets.on("connection", function (socket) {
  sockets[socket.id] = socket;
  // Convenience function to log server messages on the client.
  // Arguments is an array like object which contains all the arguments of log().
  // To push all the arguments of log() in array, we have to use apply().
  function log() {
    var array = ["Message from server:"];
    array.push.apply(array, arguments);
    socket.emit("log", array);
  }

  //Defining Socket Connections
  socket.on("message", function (message, room) {
    log("Client said: ", message);
    // for a real app, would be room-only (not broadcast)
    socket.in(room).emit("message", message, room);
  });

  socket.on("create or join", function (room) {
    log("Received request to create or join room " + room);

    users[socket.id] = { connectedTo: -1 };
    // console.log("connected users:", users);
    //  else {
    //   socket.emit("full", room); // max two clients
    // }
    if (strangerQ !== false) {
      log("Client ID " + socket.id + " joined room " + room);
      users[socket.id].connectedTo = strangerQ;
      // console.log("2ndUserConnTo1", users);
      users[strangerQ].connectedTo = socket.id;
      // console.log("1stUserConnTo2nd", users);
      io.sockets.in(room).emit("join", room);
      socket.join(room);
      socket.emit("joined", room, socket.id);
      io.sockets.in(room).emit("ready");

      strangerQ = false;
    } else {
      strangerQ = socket.id;
      socket.join(room);
      // console.log("strangerQ:", strangerQ);
      log("Client ID " + socket.id + " created room " + room);
      socket.emit("created", room, socket.id);
    }
  });

  socket.on("ipaddr", function () {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function (details) {
        if (details.family === "IPv4" && details.address !== "127.0.0.1") {
          socket.emit("ipaddr", details.address);
        }
      });
    }
  });

  socket.on("bye", function () {
    console.log("received bye");
  });
});
