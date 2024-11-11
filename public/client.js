let localStream;
let peerConnection;
let remoteSocketId;
let isCaller = false; // Track whether this tab is the caller
let videoEnabled = true; // Track if video is enabled

// STUN server URL
const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

// Initialize socket connection
const socket = io("http://localhost:3000");

// Capture video and audio
async function startCapture() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStream = stream;
    const localVideo = document.getElementById("localVideo");
    localVideo.srcObject = stream;

    console.log("Successfully started capturing audio and video");
  } catch (error) {
    console.error("Error accessing media devices.", error);
  }
}

// When Start Call button is clicked
document.getElementById("startCall").addEventListener("click", () => {
  isCaller = true; // Mark this tab as the caller
  console.log("Start Call button clicked. Emitting startCall signal.");
  socket.emit("startCall", socket.id); // Emit start call signal to the server
});

// When Turn Off Video button is clicked
document.getElementById("turnOffVideo").addEventListener("click", () => {
  videoEnabled = !videoEnabled; // Toggle video state
  console.log("Toggling video. Video state is now:", videoEnabled);
  toggleVideo(videoEnabled); // Toggle video on/off
  socket.emit("videoStateChange", videoEnabled); // Send video state to the other client
});

// Handle incoming "startCall" from the other client
socket.on("startCall", (callerId) => {
  console.log(`${callerId} wants to start a call`);
  remoteSocketId = callerId; // Store the caller's socket ID
  // Initiate the offer from this tab (answering the call)
  createOffer();
});

// Handle incoming "videoStateChange" from the other client
socket.on("videoStateChange", (videoState) => {
  console.log("Remote peer changed video state:", videoState);
  videoEnabled = videoState; // Update the local state of video
  toggleVideo(videoState); // Update the local video stream
});

// Handle incoming "signal" from the server
socket.on("signal", async (data) => {
  const { from, signalData } = data;
  console.log("Received signal from:", from);
  console.log("Signal data:", signalData);

  if (signalData.type === "offer") {
    remoteSocketId = from;
    console.log("Handling offer from:", from);
    await handleOffer(signalData.offer);
  } else if (signalData.type === "answer") {
    console.log("Handling answer from:", from);
    await peerConnection.setRemoteDescription(signalData.answer);
  } else if (signalData.type === "candidate") {
    console.log("Handling ICE candidate from:", from);
    await handleCandidate(signalData.candidate);
  }
});

// Create the WebRTC peer connection
async function createOffer() {
  createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  sendSignal(remoteSocketId, { type: "offer", offer: offer });
  console.log("Offer created and sent to:", remoteSocketId);
}

// Handle incoming offer and create an answer
async function handleOffer(offer) {
  createPeerConnection();
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  sendSignal(remoteSocketId, { type: "answer", answer: answer });
  console.log("Answer created and sent to:", remoteSocketId);
}

// Handle incoming ICE candidate
function handleCandidate(candidate) {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

// Create the WebRTC peer connection and add event listeners
function createPeerConnection() {
  console.log("Creating new RTCPeerConnection");
  peerConnection = new RTCPeerConnection({ iceServers });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("ICE candidate found:", event.candidate);
      sendSignal(remoteSocketId, {
        type: "candidate",
        candidate: event.candidate,
      });
    } else {
      console.log("ICE candidate gathering finished.");
    }
  };

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");
    if (event.streams[0]) {
      remoteVideo.srcObject = event.streams[0]; // Assign the remote stream to the remote video element
      console.log("Remote video stream received");
    } else {
      console.log("No remote stream received.");
    }
  };

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
    console.log("Added track to peer connection:", track);
  });
}

// Toggle video track on/off
function toggleVideo(isEnabled) {
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = isEnabled; // Enable or disable video track
    console.log(`Video track is now ${isEnabled ? "enabled" : "disabled"}`);
  }
}

// Send signal to the other peer via the signaling server
function sendSignal(toSocketId, signalData) {
  console.log("Sending signal to:", toSocketId);
  socket.emit("signal", { to: toSocketId, signalData });
}

// When connected to signaling server
socket.on("connect", () => {
  console.log("Connected to signaling server as:", socket.id);
});

// Start video and audio capture when the page loads
startCapture();
