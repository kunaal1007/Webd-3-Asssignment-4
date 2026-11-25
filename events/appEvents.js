const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}
const appEvents = new AppEventEmitter();

appEvents.on('user:registered', (user) => {
  console.log(`[event] User registered -> id=${user._id}, username=${user.username}, role=${user.role}`);
});

appEvents.on('user:login', (user) => {
  console.log(`[event] User logged in -> id=${user._id}, email=${user.email}`);
});

appEvents.on('note:created', (note) => {
  console.log(`[event] Note created -> id=${note._id}, owner=${note.owner}, title="${note.title}"`);
});

appEvents.on('note:updated', (note) => {
  console.log(`[event] Note updated -> id=${note._id}, owner=${note.owner}`);
});

appEvents.on('note:deleted', (noteId, userId) => {
  console.log(`[event] Note deleted -> id=${noteId}, by=${userId}`);
});

module.exports = appEvents;