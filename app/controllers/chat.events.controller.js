const { randomUUID } = require("crypto")
const { ChatRoom, Message, User, Brand } = require("../../models")
const { Ride } = require("../../models/ride.model")
const { clients, joinRoom } = require("../utils/clients")
const { join } = require("path")

const sendChatRoomInviteToClient = async (target_user_id, room_id) => {
    const target_user_data = await User.findByPk(target_user_id);

    const target_client = clients.get(target_user_data.email)
    const client_in_chatroom = room_id in target_client.rooms

    // Send invite to target client if not already in room
    if (!client_in_chatroom) {
        target_client.emit("chat:invite", { chat_room_id: room_id });
    }

    return;
}


const initiateChat = async (req, res) => {
    const socket = this;
    const { storeId, userId } = req.data;

    // Check if the store and user exist
    const store = await Brand.findByPk(storeId);
    const user = await User.findByPk(userId);
    if (!store || !user) {
        res.send('Invalid store or user');
        return;
    }

    // get store users id list
    const storeUsers = await Brand.findAll({
        where: { id: storeId },
        include: {
            model: User,
            attributes: ['id'],
            through: {
                attributes: [],
                where: {
                    role: ['owner', 'staff'],
                }
            },
        },
    });

    const storeUsersIdList = storeUsers.map(storeUser => storeUser.id);
    // check if user is part of the store
    if (!storeUsersIdList.includes(socket.user.id) && user.id !== socket.user.id) {
        res.send('Unauthorized');
        return;
    }

    // Check if a chat room already exists between the store and user
    const existingChatRoom = await ChatRoom.findOne({
        where: {
            users: [user.id, socket.user.id],
            storeId: store.id,
        },
    });

    if (existingChatRoom) {
        // Add the initiator to the chat room
        joinRoom(socket, existingChatRoom.id);

        // Send chat room invitation to the user
        await sendChatRoomInviteToClient(user.id, existingChatRoom.id);

        // Notify the initiator of the chat room ID
        res.send(null, { chatRoomId: existingChatRoom.id });

        return;
    }

    // Create a new chat room
    const newChatRoom = await ChatRoom.create({
        users: [user.id, socket.user.id],
        storeId: store.id,
    });

    // Add the initiator to the chat room
    joinRoom(socket, newChatRoom.id);

    // Send chat room invitation to the user
    await sendChatRoomInviteToClient(user.id, newChatRoom.id);

    res.send(null, { chatRoomId: newChatRoom.id });
    return;
};



const sendMessageToChatRoom = async (req, res) => {
    const socket = this;
    const { chatRoomId, message } = req.body;

    // Check if the chat room exists
    const chatRoom = await ChatRoom.findByPk(chatRoomId);
    if (!chatRoom) {
        res.send('Chat room not found');
        return;
    }

    // Check if the user is part of the chat room
    const isUserInChatRoom = chatRoom.users.includes(socket.user.id);

    if (!isUserInChatRoom) {
        res.send('User is not part of the chat room');
        return;
    }

    // Create a new message
    const newMessage = await Message.create({
        chatRoomId: chatRoom.id,
        senderId: socket.user.id,
        message,
    });

    // Add sender's data to the message
    newMessage.sender = (await User.findByPk(socket.user.id)).profileImage;

    // Notify all users in the chat room of the new message
    let path = `${chatRoomId}:chat:message:new`;
    io.to(chatRoomId).emit(path, { message: newMessage });

    res.send(null, { messageId: newMessage.id });
    return;

};



const joinChatRoom = async (req, res) => {
    const socket = this;
    const { chatRoomId } = req.data;

    // Check if the chat room exists
    const chatRoom = await ChatRoom.findByPk(chatRoomId);
    if (!chatRoom) {
        res.send('Chat room not found');
        return;
    }

    // Check if the user is part of the chat room
    // const isUserInChatRoom = await chatRoom.hasUser(socket.user.id);
    const isUserInChatRoom = chatRoom.users.includes(socket.user.id);


    if (!isUserInChatRoom) {
        res.send('User is not part of the chat room');
        return;
    }

    // Join the user to the chat room
    joinRoom(socket, chatRoomId);

    res.send(null, { chatRoomId });
    return;
};



const getPreviousChatRoomMessages = async (req, res) => {
    const socket = this;
    const { chatRoomId } = req.data;

    // Check if the chat room exists
    const chatRoom = await ChatRoom.findByPk(chatRoomId);
    if (!chatRoom) {
        res.send('Chat room not found');
        return;
    }

    // Check if the user is part of the chat room
    const isUserInChatRoom = chatRoom.users.includes(socket.user.id);


    if (!isUserInChatRoom) {
        res.send('User is not part of the chat room');
        return;
    }

    // Get previous messages in the chat room
    const messages = await Message.findAll({
        where: {
            chatRoomId,
        },
        order: [['createdAt', 'DESC']],
        limit: 10,
    });

    res.send(null, { messages });
    return;

};


module.exports = (io, socket) => {
    try {
        global.io = io;

        const res = new Map()
        res.send = (error, data) => {
            const response_path = res.path
            const response_data = { error, data }

            if (error) console.log(error);
            socket.emit(response_path, response_data)
        }

        async function socketHandlerMiddleware(data, path) {
            try {
                const socket = this;

                // Get request handler from socket_paths
                const socketRequestHandler = socket_paths[path];

                const req = { user: socket.user, data, path }
                res.path = 'response:' + path;

                // Check if user is authenticated 
                // if authenticated socket.user will be set by auth middleware
                let response = null;
                if (socket.user) {
                    response = await socketRequestHandler.call(socket, req, res);
                    return;
                }
                if (response instanceof Error) { throw response };

                res.send(res.path, { error: 'User is not authenticated' })
            } catch (error) {
                console.log(error)
                res.send(res.path, { error: 'Something went wrong' })
            }
        }

        const socket_paths = {
            "chat:initiate": initiateChat,
            "chat:message:new": sendMessageToChatRoom,
            "chat:message:previous": getPreviousChatRoomMessages,
            "chat:join": joinChatRoom,
        };

        socket.on("chat:initiate",
            (data) => socketHandlerMiddleware.call(socket, data, "chat:initiate"));
        socket.on("chat:message:new",
            (data) => socketHandlerMiddleware.call(socket, data, "chat:message:new"));
        socket.on("chat:message:previous",
            (data) => socketHandlerMiddleware.call(socket, data, "chat:message:previous"));
        socket.on("chat:join",
            (data) => socketHandlerMiddleware.call(socket, data, "chat:join"))

    } catch (error) {
        console.log(error)
    }
}
