var socket = io("http://localhost:8082", {
  handshake: true,
  auth: {
    access_token: localStorage.getItem(`${userId}`),
  },

  query: {
    access_token: localStorage.getItem(`${userIid}`),  
  }
});


const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const initiateChatButton = document.getElementById("initiateChatButton");

// Listen for a successful connection
socket.on("connection", () => {
  console.log("Connected to Socket.IO server");
  // set local storage for user id
  localStorage.setItem(`${user.id}`, socket.id);
});

// Listen for receiving a message from the server
socket.on("message", (message) => {
  displayMessage(message);
});

// Event handler for receiving a chat room invitation
socket.on('chat:invite', (data) => {
  console.log('Received chat room invitation:', data);
  // Perform any necessary actions with the received chat room ID
});

// Event handler for receiving new messages in a chat room
socket.on("response:chat:message:new", (data) => {
  const message = data.message;
  console.log("New message:", message);
  // Perform any necessary actions with the received message
});

// Event handler for receiving new messages in a chat room
socket.on('chat:message:new', (data) => {
  console.log('New message:', data.message);
  // Perform any necessary actions with the received message
});

// Event handler for handling errors
socket.on('error', (error) => {
  console.error('Socket error:', error);
  // Handle the error accordingly
});

// Event handler for handling errors
socket.on("response:error", (data) => {
  const error = data.error;
  console.error("Socket error:", error);
  // Handle the error accordingly
});


// Send a message to the server
function sendMessage() { 
  const message = messageInput.value;
  if (message.trim() !== "") {
    socket.emit("message", message);
    messageInput.value = "";
    displayMessage(`You: ${message}`);
  }
}

// Display a message in the chat window
function displayMessage(message) {
  const messageElement = document.createElement("div");
  messageElement.textContent = message;
  messagesContainer.appendChild(messageElement);
}

// Bind the sendButton click event to send a message
sendButton.addEventListener("click", sendMessage);

// Bind the Enter key press event to send a message
messageInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    sendMessage();
  }
});

// Bind the initiateChatButton click event to initiate a chat room invitation
initiateChatButton.addEventListener("click", () => {
  console.log('Initiating chat room invitation...');
  socket.emit('chat:invite', { user_id: 'user_id' });
});


//storeowner - userId: 2f26f59e-36c7-4550-84ec-9a4b1b54333d
//storeId: f0b4d892-c911-49fa-a161-55d48e494ee7

//userId: b0e6e800-1d85-4edf-b231-c7449c6a4e1d