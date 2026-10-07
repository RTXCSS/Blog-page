const { Router } = require('express');
const { z } = require('zod');
const { Blog } = require('../models/blog');
const { Comment } = require('../models/comments');
const { Document } = require('../models/workspace');
const { indexDocument } = require('../services/documents');
const { presentBlog, publishedPost } = require('../services/blogs');
const router = Router();
const objectId = /^[a-f\d]{24}$/i;
const fields = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(100000),
  summary: z.string().trim().max(280).default(''),
  tags: z.array(z.string().trim().min(1).max(30)).max(5).default([]),
  status: z.enum(['draft', 'published']).optional(),
  coverTheme: z.enum(['sage', 'peach', 'lavender', 'ink']).default('sage'),
  version: z.number().int().nonnegative().optional(),
});
router.param('id', (req, res, next, id) =>
  objectId.test(id) ? next() : res.status(404).json({ error: 'Story not found.' }),
);
router.get('/', async (req, res) => {
  const posts = await Blog.find({ createdBy: req.user._id })
    .populate('createdBy', 'fullName')
    .sort({ updatedAt: -1 });
  res.json(posts.map((p) => presentBlog(p)));
});
router.get('/:id', async (req, res) => {
  const post = await Blog.findOne({ _id: req.params.id, createdBy: req.user._id }).populate(
    'createdBy',
    'fullName',
  );
  if (!post) return res.status(404).json({ error: 'Story not found.' });
  res.json(presentBlog(post));
});
router.post('/', async (req, res) => {
  const parsed = fields.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({
        error: 'Add a title and body. Use up to 5 tags and a summary under 280 characters.',
      });
  const { version, ...data } = parsed.data;
  const post = await Blog.create({
    ...data,
    createdBy: req.user._id,
    ...(data.status === 'published' ? { publishedAt: new Date() } : {}),
  });
  await post.populate('createdBy', 'fullName');
  res.status(201).json(presentBlog(post));
});
router.put('/:id', async (req, res) => {
  const parsed = fields.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: 'Check your title, body, summary and tags.' });
  const post = await Blog.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!post) return res.status(404).json({ error: 'Story not found.' });
  const { version, ...data } = parsed.data;
  if (version !== undefined && version !== post.__v)
    return res
      .status(409)
      .json({
        error:
          'This story changed in another tab. Copy your edits, then reload to get the latest version.',
      });
  Object.assign(post, data);
  if (post.status === 'published' && !post.publishedAt) post.publishedAt = new Date();
  try {
    await post.save();
  } catch (error) {
    if (error.name !== 'VersionError') throw error;
    return res
      .status(409)
      .json({ error: 'Another edit was saved first. Copy your changes before reloading.' });
  }
  await post.populate('createdBy', 'fullName');
  res.json(presentBlog(post));
});
router.delete('/:id', async (req, res) => {
  const post = await Blog.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!post) return res.status(404).json({ error: 'Story not found.' });
  await Comment.deleteMany({ blogID: req.params.id });
  res.json({ ok: true });
});
router.post('/:id/import', async (req, res) => {
  const blog = await Blog.findOne({ _id: req.params.id, createdBy: req.user._id });
  if (!blog) return res.status(404).json({ error: 'Story not found.' });
  const doc = await Document.create({
    title: blog.title,
    content: blog.body,
    kind: 'note',
    tags: [...new Set(['blog', ...blog.tags])],
    owner: req.user._id,
  });
  await indexDocument(doc, req.app.get('io'));
  res.status(201).json(doc);
});
router.post('/:id/comments', async (req, res) => {
  const parsed = z.object({ content: z.string().trim().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: 'Write a comment of 1–2,000 characters.' });
  if (!(await publishedPost(req.params.id)))
    return res.status(404).json({ error: 'Story not found.' });
  const comment = await Comment.create({
    content: parsed.data.content,
    blogID: req.params.id,
    createdBy: req.user._id,
  });
  await comment.populate('createdBy', 'fullName');
  res.status(201).json(comment);
});
router.delete('/:id/comments/:commentId', async (req, res) => {
  if (!objectId.test(req.params.commentId))
    return res.status(404).json({ error: 'Comment not found.' });
  const post = await Blog.findById(req.params.id);
  if (!post) return res.status(404).json({ error: 'Story not found.' });
  const filter = { _id: req.params.commentId, blogID: req.params.id };
  if (String(post.createdBy) !== String(req.user._id)) filter.createdBy = req.user._id;
  const removed = await Comment.findOneAndDelete(filter);
  if (!removed) return res.status(404).json({ error: 'Comment not found.' });
  res.json({ ok: true });
});
module.exports = router;
