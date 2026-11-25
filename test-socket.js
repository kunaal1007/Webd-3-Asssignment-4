const { io } = require('socket.io-client');

const socket = io('http://localhost:5000');

socket.on('connect', () => {
  console.log('Connected to server with ID:', socket.id);

  socket.emit('chatMessage', {
    username: 'Ayush',
    room: 'general',
    message: 'Hey team, backend is ready',
  });

  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 1000);
});