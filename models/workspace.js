const { Schema, model } = require('mongoose');
const owner = { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true };
const documentSchema = new Schema(
  {
    owner,
    title: { type: String, required: true },
    kind: { type: String, enum: ['note', 'pdf', 'code', 'markdown', 'text'], required: true },
    content: { type: String, default: '' },
    filePath: { type: String, select: false },
    originalName: String,
    size: Number,
    project: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    tags: [String],
    status: { type: String, enum: ['indexing', 'ready', 'failed'], default: 'indexing' },
    chunks: { type: Number, default: 0 },
    error: String,
  },
  { timestamps: true },
);
documentSchema.index({ owner: 1, createdAt: -1 });
const projectSchema = new Schema(
  {
    owner,
    name: { type: String, required: true },
    description: String,
    color: { type: String, default: 'sage' },
  },
  { timestamps: true },
);
const sourceSchema = new Schema(
  {
    documentId: String,
    title: String,
    excerpt: String,
    page: Number,
    lineStart: Number,
    lineEnd: Number,
    citation: Number,
  },
  { _id: false },
);
const conversationSchema = new Schema(
  {
    owner,
    title: String,
    project: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'] },
        content: String,
        sources: [sourceSchema],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);
module.exports = {
  Document: model('Document', documentSchema),
  Project: model('Project', projectSchema),
  Conversation: model('Conversation', conversationSchema),
};
