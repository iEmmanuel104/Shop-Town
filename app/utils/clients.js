const clients = new Map();

const addClient = (socket) => {
    const user_identifier = socket.user.email || socket.user.id
    clients.set(user_identifier, socket);
};

const removeClient = (socket) => {
    const user_identifier = socket.user.email || socket.user.id
    clients.delete(user_identifier);
    console.log(clients.keys())
};

function joinRoom(client, room_id) {
    room_id = room_id.toString()

    const client_in_chatroom = room_id in client.rooms
    if (!client_in_chatroom) {
        client.join(room_id)
    }
}


module.exports = {
    removeClient,
    addClient,
    joinRoom,
    clients,
};
