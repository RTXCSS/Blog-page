const { Schema, model } = require('mongoose');
const roomSchema = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    key: { type: String, unique: true },
    lastMessage: String,
  },
  { timestamps: true },
);
const messageSchema = new Schema(
  {
    room: { type: Schema.Types.ObjectId, ref: 'Room', index: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User' },
    content: String,
    clientId: String,
  },
  { timestamps: true },
);
messageSchema.index({ room: 1, sender: 1, clientId: 1 }, { unique: true });
module.exports = { Room: model('Room', roomSchema), Message: model('Message', messageSchema) };
