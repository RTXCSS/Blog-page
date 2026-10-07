const { Router } = require('express');
const { z } = require('zod');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
const { Document, Project, Conversation } = require('../models/workspace');
const { ragRequest } = require('../services/rag');
const { indexDocument } = require('../services/documents');
const router = Router();
const objectId = /^[a-f\d]{24}$/i;
router.param('id', (req, res, next, id) =>
  objectId.test(id) ? next() : res.status(400).json({ error: 'Invalid record ID.' }),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 5 },
});
const textSchema = z.object({
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(200000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  project: z.string().regex(objectId).nullable().optional(),
});
function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success)
    throw Object.assign(new Error('Please check the fields and try again.'), { status: 400 });
  return result.data;
}
async function checkProject(id, owner) {
  if (id && (!objectId.test(id) || !(await Project.exists({ _id: id, owner }))))
    throw Object.assign(new Error('Project not found.'), { status: 404 });
}
const missing = (res) => res.status(404).json({ error: 'Record not found.' });
router.get('/status', async (req, res) => {
  try {
    res.json(await ragRequest('/health', null, 'GET'));
  } catch {
    res.json({
      ready: false,
      message: 'Start the AI service and add your OpenAI API key to enable answers and indexing.',
    });
  }
});
router.get('/projects', async (req, res) =>
  res.json(await Project.find({ owner: req.user._id }).sort({ createdAt: -1 })),
);
router.post('/projects', async (req, res) =>
  res
    .status(201)
    .json(
      await Project.create({
        ...parse(
          z.object({
            name: z.string().trim().min(1).max(80),
            description: z.string().max(500).default(''),
            color: z.enum(['sage', 'peach', 'lavender']).default('sage'),
          }),
          req.body,
        ),
        owner: req.user._id,
      }),
    ),
);
router.get('/documents', async (req, res) =>
  res.json(
    await Document.find({ owner: req.user._id })
      .select('-content')
      .sort({ createdAt: -1 })
      .limit(500),
  ),
);
router.get('/documents/:id', async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user._id });
  doc ? res.json(doc) : missing(res);
});
router.post('/documents/note', async (req, res) => {
  const data = parse(textSchema, req.body);
  await checkProject(data.project, req.user._id);
  const doc = await Document.create({
    ...data,
    owner: req.user._id,
    kind: 'note',
    size: Buffer.byteLength(data.content),
  });
  await indexDocument(doc, req.app.get('io'));
  res.status(201).json(doc);
});
router.post('/documents/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Choose a file to upload.' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const kinds = {
    '.pdf': 'pdf',
    '.md': 'markdown',
    '.txt': 'text',
    '.js': 'code',
    '.ts': 'code',
    '.jsx': 'code',
    '.tsx': 'code',
    '.py': 'code',
    '.json': 'code',
    '.css': 'code',
    '.html': 'code',
  };
  if (!kinds[ext])
    return res.status(400).json({ error: 'Use a PDF, Markdown, text, or supported code file.' });
  if (ext === '.pdf' && req.file.buffer.subarray(0, 5).toString() !== '%PDF-')
    return res.status(400).json({ error: 'This file is not a valid PDF.' });
  const project = req.body.project || null;
  await checkProject(project, req.user._id);
  const dir = path.resolve(process.env.UPLOAD_DIR || './storage/uploads', String(req.user._id));
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, randomUUID() + ext);
  await fs.writeFile(filePath, req.file.buffer);
  let doc;
  try {
    doc = await Document.create({
      owner: req.user._id,
      title: req.file.originalname.slice(0, 160),
      originalName: req.file.originalname.slice(0, 160),
      kind: kinds[ext],
      size: req.file.size,
      filePath,
      project,
    });
  } catch (err) {
    await fs.unlink(filePath);
    throw err;
  }
  await indexDocument(doc, req.app.get('io'));
  const result = doc.toObject();
  delete result.filePath;
  res.status(201).json(result);
});
router.post('/documents/:id/retry', async (req, res) => {
  const doc = await Document.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id, status: 'failed' },
    { status: 'indexing' },
    { new: true },
  ).select('+filePath');
  if (!doc) return res.status(409).json({ error: 'Only failed documents can be retried.' });
  await indexDocument(doc, req.app.get('io'));
  const result = doc.toObject();
  delete result.filePath;
  res.json(result);
});
router.delete('/documents/:id', async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user._id }).select(
    '+filePath',
  );
  if (!doc) return missing(res);
  if (doc.status === 'indexing')
    return res.status(409).json({ error: 'Wait for indexing to finish before deleting.' });
  await ragRequest('/delete', { owner: String(req.user._id), document_id: String(doc._id) });
  if (doc.filePath) await fs.rm(doc.filePath, { force: true });
  await doc.deleteOne();
  res.json({ ok: true });
});
router.get('/documents/:id/download', async (req, res) => {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user._id }).select(
    '+filePath',
  );
  if (!doc) return missing(res);
  if (doc.filePath) return res.download(doc.filePath, doc.originalName);
  res.attachment('note.txt').send(doc.content);
});
router.post('/search', async (req, res) => {
  const data = parse(
    z.object({
      query: z.string().trim().min(1).max(2000),
      mode: z.enum(['hybrid', 'semantic', 'keyword']).default('hybrid'),
      project: z.string().regex(objectId).nullable().optional(),
    }),
    req.body,
  );
  await checkProject(data.project, req.user._id);
  res.json(
    await ragRequest('/search', {
      owner: String(req.user._id),
      query: data.query,
      mode: data.mode,
      project: data.project || '',
    }),
  );
});
router.get('/conversations', async (req, res) =>
  res.json(
    await Conversation.find({ owner: req.user._id })
      .select('title updatedAt project')
      .sort({ updatedAt: -1 })
      .limit(100),
  ),
);
router.get('/conversations/:id', async (req, res) => {
  const c = await Conversation.findOne({ _id: req.params.id, owner: req.user._id });
  c ? res.json(c) : missing(res);
});
router.delete('/conversations/:id', async (req, res) => {
  await Conversation.deleteOne({ _id: req.params.id, owner: req.user._id });
  res.json({ ok: true });
});
const activeQueries = new Set();
router.post('/ask', async (req, res) => {
  const data = parse(
    z.object({
      question: z.string().trim().min(1).max(4000),
      conversationId: z.string().regex(objectId).nullable().optional(),
      project: z.string().regex(objectId).nullable().optional(),
    }),
    req.body,
  );
  const owner = String(req.user._id);
  if (activeQueries.has(owner))
    return res.status(429).json({ error: 'Please wait for your current answer.' });
  activeQueries.add(owner);
  try {
    let conversation = data.conversationId
      ? await Conversation.findOne({ _id: data.conversationId, owner })
      : null;
    if (data.conversationId && !conversation) return missing(res);
    const project = conversation ? conversation.project : data.project;
    await checkProject(project ? String(project) : null, owner);
    if (conversation?.messages.length >= 200)
      return res.status(400).json({ error: 'Start a new conversation to continue.' });
    const result = await ragRequest('/ask', {
      owner,
      query: data.question,
      project: project ? String(project) : '',
      history: (conversation?.messages || [])
        .slice(-8)
        .map((m) => ({ role: m.role, content: m.content })),
    });
    if (!conversation)
      conversation = new Conversation({
        owner,
        title: data.question.slice(0, 80),
        project: project || null,
        messages: [],
      });
    conversation.messages.push(
      { role: 'user', content: data.question },
      { role: 'assistant', content: result.answer, sources: result.sources },
    );
    await conversation.save();
    res.json(conversation);
  } finally {
    activeQueries.delete(owner);
  }
});
module.exports = router;
