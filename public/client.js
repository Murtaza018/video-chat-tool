let localStream;
let peerConnection;
let remoteSocketId;
let isCaller = false;
let videoEnabled = true;
let micEnabled = true; // Track if microphone is enabled

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
const socket = io("http://localhost:3000");

// Capture video and audio
async function startCapture() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localStream = stream;
    document.getElementById("localVideo").srcObject = stream;
    console.log("Successfully started capturing audio and video.");
  } catch (error) {
    console.error("Error accessing media devices:", error);
  }
}

// Start Call Button
document.getElementById("startCall").addEventListener("click", () => {
  if (!localStream) {
    console.warn("Cannot start call. Local stream not initialized.");
    return;
  }
  isCaller = true;
  console.log("Start Call button clicked. Emitting startCall signal.");
  socket.emit("startCall", socket.id);
});

// Turn Off Video Button
document.getElementById("turnOffVideo").addEventListener("click", () => {
  videoEnabled = !videoEnabled;
  toggleVideo(videoEnabled);
  socket.emit("videoStateChange", videoEnabled);
});

// Toggle Microphone Button
document.getElementById("toggleMic").addEventListener("click", () => {
  micEnabled = !micEnabled;
  toggleMicrophone(micEnabled); // Toggle microphone state
  console.log(`Microphone is now ${micEnabled ? "enabled" : "disabled"}`);
});

// Start Call Event Handler
socket.on("startCall", (callerId) => {
  console.log(`${callerId} wants to start a call.`);
  remoteSocketId = callerId;
  if (!peerConnection) createOffer();
});

// Video State Change Event Handler
socket.on("videoStateChange", (videoState) => {
  console.log("Remote peer changed video state:", videoState);
  if (remoteSocketId) {
    videoEnabled = videoState;
    toggleRemoteVideo(videoState);
  }
});

// Signal Event Handler
socket.on("signal", async (data) => {
  const { from, signalData } = data;
  console.log("Received signal from:", from, "Signal data:", signalData);

  if (signalData.type === "offer") {
    remoteSocketId = from;
    await handleOffer(signalData.offer);
  } else if (signalData.type === "answer") {
    await peerConnection.setRemoteDescription(signalData.answer);
  } else if (signalData.type === "candidate") {
    await handleCandidate(signalData.candidate);
  }
});

// Create Offer
async function createOffer() {
  createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  sendSignal(remoteSocketId, { type: "offer", offer });
  console.log("Offer created and sent to:", remoteSocketId);
}

// Handle Offer
async function handleOffer(offer) {
  createPeerConnection();
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  sendSignal(remoteSocketId, { type: "answer", answer });
}

// Handle Candidate
function handleCandidate(candidate) {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

// Create Peer Connection
function createPeerConnection() {
  if (peerConnection) return;
  console.log("Creating new RTCPeerConnection.");
  peerConnection = new RTCPeerConnection({ iceServers });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal(remoteSocketId, {
        type: "candidate",
        candidate: event.candidate,
      });
    }
  };

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");
    if (event.streams[0]) {
      remoteVideo.srcObject = event.streams[0];
      console.log("Remote video stream received.");
    } else {
      console.log("No remote stream received.");
    }
  };

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
    console.log("Added track to peer connection:", track);
  });
}

// Toggle Local Video Track
function toggleVideo(isEnabled) {
  if (!localStream) {
    console.warn("Local stream not available for toggling video.");
    return;
  }
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = isEnabled;
    console.log(
      `Local video track is now ${isEnabled ? "enabled" : "disabled"}.`
    );
  } else {
    console.warn("No video track found in local stream.");
  }
}

// Toggle Remote Video
function toggleRemoteVideo(isEnabled) {
  const remoteVideo = document.getElementById("remoteVideo");
  remoteVideo.style.display = isEnabled ? "block" : "none"; // Hide or show remote video
  console.log(`Remote video is now ${isEnabled ? "visible" : "hidden"}.`);
}

// Toggle Microphone
function toggleMicrophone(isEnabled) {
  const audioTrack = localStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = isEnabled;
    console.log(
      `Local microphone is now ${isEnabled ? "enabled" : "disabled"}.`
    );
  } else {
    console.warn("No audio track found in local stream.");
  }
}

// Send Signal to Server
function sendSignal(toSocketId, signalData) {
  socket.emit("signal", { to: toSocketId, signalData });
}

// Start video and audio capture on load
startCapture();
