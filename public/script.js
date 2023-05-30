{/* <script> */ }
var socket = io("http://localhost:8082"); // Replace with your server URL

const messagesContainer = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");

// Listen for a successful connection
socket.on("connection", () => {
  console.log("Connected to Socket.IO server");
});

// Listen for receiving a message from the server
socket.on("message", (message) => {
  displayMessage(message);
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
{/* </script> */ }