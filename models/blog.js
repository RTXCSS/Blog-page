const { Schema, model } = require('mongoose');

const blogschema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    coverimage: {
      type: String,
      required: false,
    },
    summary: { type: String, default: '', maxlength: 280 },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    coverTheme: { type: String, enum: ['sage', 'peach', 'lavender', 'ink'], default: 'sage' },
    publishedAt: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);
blogschema.index({ status: 1, publishedAt: -1 });
blogschema.index({ createdBy: 1, updatedAt: -1 });

const Blog = model('blog', blogschema);

module.exports = {
  Blog,
};
