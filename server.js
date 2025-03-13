const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const players = {};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    players[socket.id] = {
        x: 0,
        y: 0,
        z: 0,
        rotationY: 0
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('newPlayer', { id: socket.id, x: 0, y: 0, z: 0, rotationY: 0 });

    socket.on('updatePosition', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].z = data.z;
            players[socket.id].rotationY = data.rotationY;
            data.id = socket.id; // Add the socket ID to the data object
            socket.broadcast.emit('playerMoved', data); // Send the full data object, including legAngle
        }
    });

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