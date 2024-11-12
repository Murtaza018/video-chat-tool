const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Serve HTML client at `/client`
app.get("/client", (req, res) => {
  res.sendFile(path.join(__dirname, "signal test.html"));
});

// Root URL message
app.get("/", (req, res) => {
  res.send("Signaling server is running");
});

// WebSocket connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("startCall", (callerId) => {
    console.log(`${callerId} is starting the call`);
    socket.broadcast.emit("startCall", callerId);
  });

  socket.on("signal", (data) => {
    console.log(`Signal data from ${socket.id}:`, data.signalData);
    socket.to(data.to).emit("signal", {
      from: socket.id,
      signalData: data.signalData,
    });
  });

  socket.on("endCall", (callerId) => {
    console.log(`${callerId} ended the call.`);
    socket.broadcast.emit("endCall", callerId);
  });

  socket.on("videoStateChange", (videoState) => {
    console.log("Video state changed:", videoState);
    socket.broadcast.emit("videoStateChange", videoState);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
