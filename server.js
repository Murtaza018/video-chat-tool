const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve a simple HTML client at `/client`
app.get("/client", (req, res) => {
  res.sendFile(path.join(__dirname, "signal test.html"));
});

// Serve a basic message at the root URL
app.get("/", (req, res) => {
  res.send("Signaling server is running");
});

// WebSocket connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle start call
  socket.on("startCall", (callerId) => {
    console.log(`${callerId} is starting the call`);
    // Find the other client (assuming there are only two clients)
    socket.broadcast.emit("startCall", callerId); // Emit the call initiation to the other user
  });

  // Relay signal messages between peers
  socket.on("signal", (data) => {
    const targetSocket = io.sockets.sockets.get(data.to);
    if (targetSocket) {
      targetSocket.emit("signal", {
        from: socket.id,
        signalData: data.signalData,
      });
    }
  });

  // Relay video state change (video on/off) to the other peer
  socket.on("videoStateChange", (videoState) => {
    socket.broadcast.emit("videoStateChange", videoState); // Send to other peer
  });

  // Notify others of disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    io.emit("userDisconnected", socket.id);
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Signaling server is running on http://localhost:3000");
});
