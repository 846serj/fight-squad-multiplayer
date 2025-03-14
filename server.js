const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const players = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Initialize player with default username
    players[socket.id] = {
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0,
        username: 'Player' + socket.id.slice(0, 4) // Default username
    };

    // Send current players to the new player
    socket.emit('currentPlayers', players);
    // Notify others of the new player
    socket.broadcast.emit('newPlayer', { 
        id: socket.id, 
        x: 0, 
        y: 0, 
        z: 0, 
        rotationY: 0, 
        username: players[socket.id].username 
    });

    // Handle username setting
    socket.on('setUsername', (username) => {
        players[socket.id].username = username;
        console.log(`Player ${socket.id} set username to: ${username}`);
        io.emit('usernameSet', { id: socket.id, username }); // Broadcast to all, including sender
    });

    // Handle position updates
    socket.on('updatePosition', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].z = data.z;
            players[socket.id].rotationY = data.rotationY;
            data.id = socket.id;
            data.username = players[socket.id].username; // Include username in movement data
            socket.broadcast.emit('playerMoved', data); // Send full data, including legAngle and username
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

app.use(express.static('public'));

const PORT = process.env.PORT || 3000; // Use environment port or default to 3000
server.listen(PORT, '0.0.0.0', () => { // Bind to all interfaces
    console.log(`Server running on port ${PORT}`);
});