const { Server } = require('socket.io');
const cookie = require('cookie');
const { authenticate } = require('./auth');
const { Room, Message } = require('../models/chat');
function attachChat(server, origins) {
  const io = new Server(server, {
    cors: { origin: origins, credentials: true },
    maxHttpBufferSize: 20000,
    allowRequest: (req, done) =>
      done(null, !req.headers.origin || origins.includes(req.headers.origin)),
  });
  io.use(async (socket, next) => {
    try {
      const auth = await authenticate(cookie.parse(socket.request.headers.cookie || '').token);
      socket.data.user = auth.user;
      socket.data.expires = auth.expires;
      next();
    } catch {
      next(new Error('Please sign in to chat.'));
    }
  });
  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join('user:' + user._id);
    const expiry = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.data.expires * 1000 - Date.now()),
    );
    let count = 0,
      windowStart = Date.now();
    const limited = () => {
      if (Date.now() - windowStart > 60000) {
        count = 0;
        windowStart = Date.now();
      }
      return ++count > 100;
    };
    const member = async (id) =>
      typeof id === 'string' &&
      /^[a-f\d]{24}$/i.test(id) &&
      (await Room.findOne({ _id: id, participants: user._id }));
    socket.on('message:send', async (data, ack = () => {}) => {
      if (typeof ack !== 'function') return;
      try {
        if (limited()) throw new Error('Slow down a little and try again.');
        if (
          !data ||
          typeof data.content !== 'string' ||
          !data.content.trim() ||
          data.content.length > 4000 ||
          typeof data.clientId !== 'string' ||
          !/^[\w-]{8,80}$/.test(data.clientId)
        )
          throw new Error('Invalid message.');
        const room = await member(data.roomId);
        if (!room) throw new Error('Conversation not found.');
        let message;
        try {
          message = await Message.create({
            room: room._id,
            sender: user._id,
            content: data.content.trim(),
            clientId: data.clientId,
          });
        } catch (err) {
          if (err.code !== 11000) throw err;
          message = await Message.findOne({
            room: room._id,
            sender: user._id,
            clientId: data.clientId,
          });
        }
        await message.populate('sender', 'fullName');
        room.lastMessage = message.content.slice(0, 100);
        await room.save();
        room.participants.forEach((p) => io.to('user:' + p).emit('message:new', message));
        ack({ ok: true, message });
      } catch (err) {
        ack({ error: err.message });
      }
    });
    socket.on('typing', async (data) => {
      if (limited()) return;
      try {
        const room = await member(data?.roomId);
        if (room)
          room.participants
            .filter((p) => String(p) !== String(user._id))
            .forEach((p) =>
              io.to('user:' + p).emit('typing', { roomId: data.roomId, name: user.fullName }),
            );
      } catch {
        /* Ignore invalid transient events. */
      }
    });
    socket.on('disconnect', () => clearTimeout(expiry));
  });
  return io;
}
module.exports = { attachChat };
