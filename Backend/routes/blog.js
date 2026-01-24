const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const { Blog } = require("../models/blog");
const { Comment } = require("../models/comments");
const router = Router();

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(`./images/uploads/${req.user._id}`);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const filename = `${Date.now()}-${file.originalname}`;
    cb(null, filename);
  }
});
const upload = multer({ storage: storage });

// Add new blog form
router.get('/add-new', (req, res) => {
  return res.render("Addblog", { user: req.user });
});

// Post a new comment
router.post("/comment/:blogid", async (req, res) => {
  if (!req.user || !req.user._id) {
    return res.status(401).send("You must be signed in to comment");
  }
  await Comment.create({
    content: req.body.content,
    blogID: req.params.blogid,
    createdBy: req.user._id,
  });
  return res.redirect(`/blog/${req.params.blogid}`);
});
// Create a new blog
router.post("/", upload.single('CoverImage'), async (req, res) => {
  const { title, body } = req.body;
  const blog = await Blog.create({
    title,
    body,
    createdBy: req.user._id,
    coverimage: `/uploads/${req.user._id}/${req.file.filename}`,
  });
  return res.redirect(`/blog/${blog._id}`);
});

// Show a blog with comments
router.get("/:id", async (req, res) => {
  const blogId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(blogId)) {
    return res.status(404).send("Invalid blog ID");
  }

  const blog = await Blog.findById(blogId)
    .populate("createdBy", "fullName email pfp");

  if (!blog) {
    return res.status(404).send("Blog not found");
  }

  const comments = await Comment.find({ blogID: blogId })
    .populate("createdBy", "fullName email pfp")
    .sort({ createdAt: -1 });

  return res.render("blog", {
    user: req.user,
    blog,
    comments,
  });
});

module.exports = router;
