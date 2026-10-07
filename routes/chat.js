const { Router } = require('express');
const User = require('../models/user');
const { Room, Message } = require('../models/chat');
const router = Router();
router.get('/users', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
  if (q.length < 2) return res.json([]);
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  res.json(
    await User.find({
      _id: { $ne: req.user._id },
      $or: [{ fullName: { $regex: escaped, $options: 'i' } }, { email: q.toLowerCase() }],
    })
      .select('fullName')
      .limit(10),
  );
});
router.get('/rooms', async (req, res) =>
  res.json(
    await Room.find({ participants: req.user._id })
      .populate('participants', 'fullName')
      .sort({ updatedAt: -1 }),
  ),
);
router.post('/rooms', async (req, res) => {
  const id = req.body.userId;
  if (
    typeof id !== 'string' ||
    !/^[a-f\d]{24}$/i.test(id) ||
    id === String(req.user._id) ||
    !(await User.exists({ _id: id }))
  )
    return res.status(400).json({ error: 'Choose another user.' });
  const participants = [String(req.user._id), id].sort();
  const room = await Room.findOneAndUpdate(
    { key: participants.join(':') },
    { $setOnInsert: { participants } },
    { new: true, upsert: true },
  ).populate('participants', 'fullName');
  participants.forEach((p) =>
    req.app
      .get('io')
      .to('user:' + p)
      .emit('room:updated', room),
  );
  res.json(room);
});
router.get('/rooms/:id/messages', async (req, res) => {
  if (!(await Room.exists({ _id: req.params.id, participants: req.user._id })))
    return res.status(404).json({ error: 'Conversation not found.' });
  const filter = { room: req.params.id };
  if (req.query.before) {
    if (!/^[a-f\d]{24}$/i.test(req.query.before))
      return res.status(400).json({ error: 'Invalid cursor.' });
    filter._id = { $lt: req.query.before };
  }
  const messages = await Message.find(filter)
    .populate('sender', 'fullName')
    .sort({ _id: -1 })
    .limit(50);
  res.json(messages.reverse());
});
module.exports = router;
