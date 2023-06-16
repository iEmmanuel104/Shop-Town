const storeId = 'f0b4d892-c911-49fa-a161-55d48e494ee7'
const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const initiateChatButton = document.getElementById("initiateChatButton");
const joinChatRoomButton = document.getElementById("joinChatRoomButton");
const loginButton = document.getElementById("login");
const emailInput = document.getElementById("loginInput");


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

const serverURL = 'http://localhost:8082';
var socket;

// Check if access token exists in local storage
const accessToken = localStorage.getItem(`access_token:${localStorage.getItem('emaill')}`);
if (accessToken) {
  connectToSocket();
} else {
  // Show login form
  loginButton.style.display = "block";
}

function connectToSocket() {
  socket = io(serverURL, {
    handshake: true,
    query: {
      access_token: accessToken,
    }
  });

  socket.on("connection", () => {
    console.log("Connected to Socket.IO server");
  });

  // Listen for receiving a message from the server 
  socket.on("message", (message) => {
    displayMessage(message);
  });

  // Event handler for receiving a chat room invitation
  socket.on('chat:invite', (data) => {
    console.log('Received chat room invitation:', data);
    // Perform any necessary actions with the received chat room ID
    // save chat room id to local storage
    localStorage.setItem('ChatRoomId', data.chatRoomId);
    console.log('Chat room id saved to local storage:', data.chatRoomId);

  });

  // Event handler for receiving new messages in a chat room
  socket.on("response:chat:message:new", (data) => {
    const message = data.message;
    console.log("New message:", message);
    // Perform any necessary actions with the received message
  });

  // Event handler for receiving a chat room invitation
  socket.on("response:chat:initiate", () => {
    // const chatRoomId = data.chatRoomId;
    console.log("Received chat room invitation===:");
    // Perform any necessary actions with the received chat room ID
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
    socket.emit('chat:initiate', { storeId: storeId });
  });

  // Bind the joinChatRoomButton click event to join a chat room
  joinChatRoomButton.addEventListener("click", () => {
    console.log('Joining chat room...');
    socket.emit('chat:join', { chatRoomId: localStorage.getItem('ChatRoomId') });
  })
}

function login() {
  // get email from input
  const email = emailInput.value;

  axios.post(`${serverURL}/auth/signin`, {
    email,
    password: 'testpassword'
  }).then((res) => {
    console.log(res.data)
    const { access_token } = res.data;
    const {id } = res.data.user;
    localStorage.setItem('emaill', email);
    localStorage.setItem('userId', id);
    localStorage.setItem(`access_token:${email}`, access_token);
    loginButton.style.display = "none";
    connectToSocket();
  }).catch((err) => {
    console.log(err)
    return;
  });
}

loginButton.addEventListener('click', login);
