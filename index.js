const io = require("socket.io")(3000, {
  cors: { origin: "*" }
});

let waitingUsers = []; // Queue of waiting users

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // Check if someone is already waiting
  if (waitingUsers.length > 0) {
      let pair = waitingUsers.pop(); // Take a waiting user
      pair.partner = socket;
      socket.partner = pair;

      // Notify both users
      pair.emit("matched", { partner: socket.id });
      socket.emit("matched", { partner: pair.id });
  } else {
      waitingUsers.push(socket); // Add new user to queue
  }

  // Handle messages
  socket.on("sendMessage", (message) => {
      if (socket.partner) {
          socket.partner.emit("receiveMessage", message);
      }
  });

  // Next user request
  socket.on("nextUser", () => {
      if (socket.partner) {
          socket.partner.emit("disconnected");
          socket.partner.partner = null;
          socket.partner = null;
      }
      waitingUsers.push(socket);
  });

  // WebRTC Signaling (Offer, Answer, ICE Candidate)
  socket.on("offer", (data) => {
      if (socket.partner) {
          socket.partner.emit("offer", { sdp: data.sdp, sender: socket.id });
      }
  });

  socket.on("answer", (data) => {
      if (socket.partner) {
          socket.partner.emit("answer", { sdp: data.sdp });
      }
  });

  socket.on("candidate", (data) => {
      if (socket.partner) {
          socket.partner.emit("candidate", data.candidate);
      }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      if (socket.partner) {
          socket.partner.emit("disconnected");
          socket.partner.partner = null;
      }

      waitingUsers = waitingUsers.filter(user => user !== socket);
  });
});
