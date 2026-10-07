const { Blog } = require('../models/blog');
const { Comment } = require('../models/comments');

const readingMinutes = (body) => Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 220));
const plainExcerpt = (body) =>
  body
    .replace(/[#*_>`\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 210);
function presentBlog(blog, { body = true } = {}) {
  const result = blog.toObject ? blog.toObject() : { ...blog };
  result.readingMinutes = readingMinutes(result.body || '');
  result.summary = result.summary || plainExcerpt(result.body || '');
  // Old posts remain private until their author explicitly publishes them.
  result.status = result.status || 'draft';
  result.tags = result.tags || [];
  result.coverTheme = result.coverTheme || 'sage';
  delete result.coverimage;
  if (!body) delete result.body;
  return result;
}
async function publishedPost(id) {
  return Blog.findOne({ _id: id, status: 'published' }).populate('createdBy', 'fullName');
}
async function commentsFor(blogId, before) {
  const filter = { blogID: blogId };
  if (before) filter._id = { $lt: before };
  return Comment.find(filter).populate('createdBy', 'fullName').sort({ _id: -1 }).limit(30);
}
module.exports = { presentBlog, publishedPost, commentsFor };
