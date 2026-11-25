const jwt = require('jsonwebtoken');
const appEvents = require('../events/appEvents');

function initChatSocket(io) {
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
      } catch (err) {
        return next(new Error('Authentication error'));
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log(`\x1b[32mUser connected: ${socket.id}\x1b[0m`);

    const defaultRoom = 'general';
    socket.join(defaultRoom);
    socket.data.room = defaultRoom;
    socket.data.username = socket.user?.username || 'Anonymous';

    console.log(`${socket.id} joined room ${defaultRoom}`);
    appEvents.emit('socket:joined', { socketId: socket.id, room: defaultRoom });

    socket.on('joinRoom', ({ username, room } = {}) => {
      const targetRoom = (room || defaultRoom).trim();
      if (socket.data.room && socket.data.room !== targetRoom) {
        socket.leave(socket.data.room);
      }
      if (username) {
        socket.data.username = username.trim();
      }
      socket.join(targetRoom);
      socket.data.room = targetRoom;

      console.log(`${socket.id} joined room ${targetRoom}`);
      io.to(targetRoom).emit('systemMessage', {
        room: targetRoom,
        message: `${socket.data.username} joined ${targetRoom}`,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('chatMessage', (payload) => {
      const text = typeof payload === 'string' ? payload : payload?.message;
      const room = (typeof payload === 'object' && payload?.room) || socket.data.room || defaultRoom;
      const sender =
        (typeof payload === 'object' && payload?.username) ||
        socket.data.username ||
        socket.id;

      if (!text || !text.trim()) return;

      socket.data.username = sender;
      const cleanMessage = text.trim();

      console.log(`\x1b[36m[${room}] ${sender}: ${cleanMessage}\x1b[0m`);
      appEvents.emit('chat:message', { room, sender, message: cleanMessage });

      io.to(room).emit('chatMessage', {
        room,
        sender,
        message: cleanMessage,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
}

module.exports = initChatSocket;