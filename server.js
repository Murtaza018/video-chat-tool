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
    const targetSocket = io.sockets.sockets.get(data.to);
    if (targetSocket) {
      targetSocket.emit("signal", {
        from: socket.id,
        signalData: data.signalData,
      });
    }
  });

  socket.on("videoStateChange", (videoState) => {
    socket.broadcast.emit("videoStateChange", videoState);
  });
  // disconnect user
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    io.emit("userDisconnected", socket.id);
  });
});

// Start server
server.listen(3000, () => {
  console.log("Signaling server is running on http://localhost:3000");
});
