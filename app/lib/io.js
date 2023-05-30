const socketWrapper = require('../middlewares/wsWrapper');
const authenticate = require('../middlewares/authWares').authenticate;
const { createServer } = require('http');
const { Server } = require('socket.io');
const { addClient, removeClient } = require('../utils/clients');
const app = require("../../app");
const { randomUUID } = require('crypto');

const initializeSocketEventHandlers = (socket) => {
    require('./ws/event-handlers/chat.events')(io, socket);
}

const initializeSocketListeners = (socket) => {
    try {
        console.log(`User connected ${socket.id}`);
        // Initialize socket listeners
        socket.on('message', (message) => {
            console.log(message);
            socket.broadcast.emit('message', message);
        });

        socket.on('disconnect', () => {
            console.log(socket.user.email + ': disconnected');

            // Remove client from clients map
            removeClient(socket);
        });

        socket.on('error', (error) => {
            // Send error to client
            console.log(error);

            // Close connection
            socket.disconnect();
        });

        // Initialize socket event handlers
        // initializeSocketEventHandlers(socket);

    } catch (error) {
        console.log(error);
    }
};

let curr_client;
const onConnection = async (socket) => {
    // Authenticate socket
    
    // const authenticated_socket = await authenticate(socket);

    // if (authenticated_socket instanceof Error) {
    //     // Send error to client
    //     socket.emit('error', 'Authentication failed');

    //     // Close connection
    //     socket.disconnect();

    //     throw new Error('Authentication failed');
    // }

    // socket = authenticated_socket; curr_client = socket;
    // console.log(`${socket.user.email}: connected`);

    // // Add client to clients map
    // addClient(curr_client);

    // Initialize socket listeners
    initializeSocketListeners(socket);
};

// Create http server with express app
const httpServer = createServer(app);

// Create socket server with http server
const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:8082',
    }
});

// io.use(socketWrapper((socket, next) => {
//     const { origin } = socket.handshake.headers;

//     const allowed_origins = ['http://localhost:8082', 'http://localhost:3001'];
//     if (allowed_origins.includes(origin)) {
//         next();
//     } else {
//         next(new Error('Not allowed by CORS'));
//     }
// }));

    io.on('connection', socketWrapper(onConnection));

    io.on('error', socketWrapper((error) => {
        // Send error to client
        console.log(error);

        // Close connection
        io.close();
    }));

    module.exports = httpServer;
