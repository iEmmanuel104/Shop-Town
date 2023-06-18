const { randomUUID } = require("crypto")
const { ChatRoom, Message, User, Brand } = require("../../models")
const { clients, joinRoom } = require("../utils/clients")
const { join } = require("path");
const { log } = require("console");

// const sendChatRoomInviteToClient = async function (target_user_id, room_id) {
//     // check if the target_user_id is an array
//     if (Array.isArray(target_user_id)) {
//         // if it is, then send invite to all users in the array
//     }

//     const target_user_data = await User.findByPk(target_user_id);

//     const target_client = clients.get(target_user_data.email)
//     const client_in_chatroom = room_id in target_client.rooms
//     console.log(target_client.user.email)

//     // Send invite to target client if not already in room
//     if (!client_in_chatroom) {
//         target_client.emit("chat:invite", { chat_room_id: room_id });
//     }

//     return;
// }
const sendChatRoomInviteToClient = async function (target_user_id, room_id) {
    // Check if the target_user_id is an array
    if (Array.isArray(target_user_id)) {
        console.log("target_user_id is an array");
        // Iterate over each user ID in the array and send invite
        for (const user_id of target_user_id) {
            const target_user_data = await User.findByPk(user_id);
            const target_client = clients.get(target_user_data.email);
            const client_in_chatroom = room_id in target_client.rooms;
            console.log(target_client.user.email);

            // Send invite to target client if not already in room
            if (!client_in_chatroom) {
                target_client.emit("chat:invite", { chat_room_id: room_id });
            }
        }
    } else {
        console,log("target_user_id is not an array");
        // Handle the case when target_user_id is not an array
        const target_user_data = await User.findByPk(target_user_id);
        const target_client = clients.get(target_user_data.email);
        const client_in_chatroom = room_id in target_client.rooms;
        console.log(target_client.user.email);

        // Send invite to target client if not already in room
        if (!client_in_chatroom) {
            target_client.emit("chat:invite", { chat_room_id: room_id });
        }
    }

    return;
};


const initiateChat = async function (req, res) {
    const socket = this;
    const { storeId } = req.data;
    // Check if the store and user exist
    const store = await Brand.findByPk(storeId);
    // const user = await User.findByPk(socket.user.id);   
    if (!store) {
        res.send('Invalid store');
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
                },
                required: true,
            },
        },
    });

    const storeUsersIdList = storeUsers.flatMap((storeUser) =>
        storeUser.Users.map((user) => user.id)
    );

    console.log(storeUsersIdList);

    // check if user is part of the store
    if (storeUsersIdList.includes(socket.user.id)) {
        res.send('Unauthorized');
        return;
    }


    // Check if a chat room already exists between the store and user
    const existingChatRoom = await ChatRoom.findOne({
        where: {
            users: [ socket.user.id, ...storeUsersIdList ],
            storeId: store.id,
        },
    });

    if (existingChatRoom) {
        console.log('sender', socket.user.email)

        // Add the initiator to the chat room
        joinRoom(socket, existingChatRoom.id);

        // Send chat room invitation to the user
        await sendChatRoomInviteToClient(store.id, existingChatRoom.id);

        // Notify the initiator of the chat room ID
        res.send(null, { chatRoomId: existingChatRoom.id });

        return;
    }

    // Create a new chat room
    const newChatRoom = await ChatRoom.create({
        users: [ socket.user.id, ...storeUsersIdList ],
        storeId: store.id,
    });

    // Add the initiator to the chat room
    joinRoom(socket, newChatRoom.id);

    // Send chat room invitation to the user
    await sendChatRoomInviteToClient(storeUsersIdList, newChatRoom.id);

    res.send(null, { chatRoomId: newChatRoom.id });
    return;
};

const sendMessageToChatRoom = async function (req, res)  {
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

const joinChatRoom = async function (req, res) {
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

const getPreviousChatRoomMessages = async function (req, res)  {
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

                // console.log(socket)
                // Get request handler from socket_paths
                const socketRequestHandler = socket_paths[path];

                const req = { requser: socket.user, data, path }
                res.path = 'response:' + path;

                // Check if user is authenticated 
                // if authenticated socket.user will be set by auth middleware
                let response = null;
                if (socket.user) {
                    // console.log(socket.user)
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
