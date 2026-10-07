const { Router } = require('express');
const { Blog } = require('../models/blog');
const { presentBlog, publishedPost, commentsFor } = require('../services/blogs');
const router = Router();
const objectId = /^[a-f\d]{24}$/i;
router.param('id', (req, res, next, id) =>
  objectId.test(id) ? next() : res.status(404).json({ error: 'Story not found.' }),
);
router.get('/', async (req, res) => {
  const page = Math.max(1, Math.min(1000, parseInt(req.query.page, 10) || 1));
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const tag = typeof req.query.tag === 'string' ? req.query.tag.trim().slice(0, 30) : '';
  const filter = { status: 'published' };
  if (query) {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { title: { $regex: escaped, $options: 'i' } },
      { summary: { $regex: escaped, $options: 'i' } },
    ];
  }
  if (tag) filter.tags = tag;
  const [posts, total] = await Promise.all([
    Blog.find(filter)
      .populate('createdBy', 'fullName')
      .sort({ publishedAt: -1, _id: -1 })
      .skip((page - 1) * 9)
      .limit(9),
    Blog.countDocuments(filter),
  ]);
  res.json({
    posts: posts.map((p) => presentBlog(p, { body: false })),
    total,
    page,
    pages: Math.ceil(total / 9),
  });
});
router.get('/:id', async (req, res) => {
  const post = await publishedPost(req.params.id);
  if (!post)
    return res.status(404).json({ error: 'This story is unavailable or has not been published.' });
  res.json(presentBlog(post));
});
router.get('/:id/comments', async (req, res) => {
  if (!(await publishedPost(req.params.id)))
    return res.status(404).json({ error: 'Story not found.' });
  if (req.query.before && !objectId.test(req.query.before))
    return res.status(400).json({ error: 'Invalid comment cursor.' });
  res.json(await commentsFor(req.params.id, req.query.before));
});
module.exports = router;
