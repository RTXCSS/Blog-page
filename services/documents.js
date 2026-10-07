const fs = require('node:fs/promises');
const { ragRequest } = require('./rag');
async function indexDocument(doc, io) {
  try {
    const file = doc.filePath ? await fs.readFile(doc.filePath) : null;
    const result = await ragRequest('/ingest', {
      owner: String(doc.owner),
      document_id: String(doc._id),
      title: doc.title,
      project: doc.project ? String(doc.project) : '',
      kind: doc.kind,
      text: doc.content,
      filename: doc.originalName || '',
      data: file?.toString('base64'),
    });
    doc.status = 'ready';
    doc.chunks = result.chunks;
    doc.error = undefined;
  } catch (err) {
    doc.status = 'failed';
    doc.error = err.message;
  }
  await doc.save();
  io?.to('user:' + doc.owner).emit('document:updated', {
    _id: String(doc._id),
    status: doc.status,
  });
  return doc;
}
module.exports = { indexDocument };
