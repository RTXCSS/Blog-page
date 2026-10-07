const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { io: connect } = require('socket.io-client');
const { createHmac } = require('node:crypto');
process.env.JWT_SECRET = 'test-only-secret-with-more-than-32-characters';
process.env.RAG_SERVICE_TOKEN = 'test-only-service-token-with-32-characters';
const { createApp } = require('../app');
const User = require('../models/user');
const { Document } = require('../models/workspace');
const { Message } = require('../models/chat');
let mongo,
  server,
  io,
  rag,
  base,
  a,
  b,
  c,
  userA,
  userB,
  cookieA,
  cookieB,
  ragCalls = [],
  failIndex = false;
const headers = { 'X-Requested-With': 'SecondBrain' };
before(
  async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all([User.init(), Message.init()]);
    rag = http.createServer(async (req, res) => {
      let input = '';
      for await (const chunk of req) input += chunk;
      const body = input ? JSON.parse(input) : {};
      ragCalls.push({ path: req.url, body });
      assert.equal(req.headers['x-service-token'], process.env.RAG_SERVICE_TOKEN);
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/ingest' && failIndex) {
        res.statusCode = 503;
        return res.end(JSON.stringify({ detail: 'Embedding service temporarily unavailable.' }));
      }
      res.end(
        JSON.stringify(
          req.url === '/ingest'
            ? { chunks: 2 }
            : req.url === '/ask'
              ? {
                  answer: 'A grounded test answer [1].',
                  sources: [
                    {
                      documentId: '123456789012345678901234',
                      title: 'Test source',
                      excerpt: 'Evidence',
                      citation: 1,
                    },
                  ],
                }
              : req.url === '/search'
                ? { sources: [] }
                : { ok: true, ready: true },
        ),
      );
    });
    await new Promise((r) => rag.listen(0, '127.0.0.1', r));
    process.env.RAG_URL = 'http://127.0.0.1:' + rag.address().port;
    ({ server, io } = createApp());
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    base = 'http://127.0.0.1:' + server.address().port;
    a = request.agent(server);
    b = request.agent(server);
    c = request.agent(server);
    const ra = await a
      .post('/api/auth/register')
      .set(headers)
      .send({
        fullName: 'Alice Curious',
        email: 'alice@example.test',
        password: 'Strong-password-123',
      })
      .expect(201);
    const rb = await b
      .post('/api/auth/register')
      .set(headers)
      .send({ fullName: 'Bob Builder', email: 'bob@example.test', password: 'Strong-password-456' })
      .expect(201);
    await c
      .post('/api/auth/register')
      .set(headers)
      .send({
        fullName: 'Carol Third',
        email: 'carol@example.test',
        password: 'Strong-password-789',
      })
      .expect(201);
    userA = ra.body.user;
    userB = rb.body.user;
    cookieA = ra.headers['set-cookie'][0].split(';')[0];
    cookieB = rb.headers['set-cookie'][0].split(';')[0];
    assert.match(ra.headers['set-cookie'][0], /HttpOnly/);
    assert.match(ra.headers['set-cookie'][0], /SameSite=Lax/);
  },
  { timeout: 180000 },
);
after(async () => {
  if (io) io.close();
  if (server) await new Promise((r) => server.close(r));
  if (rag) await new Promise((r) => rag.close(r));
  await mongoose.disconnect();
  await mongo?.stop();
});
test('JWT cookies are private; anonymous and cross-origin writes are rejected', async () => {
  await request(server).get('/api/documents').expect(401);
  await a.post('/api/projects').send({ name: 'No CSRF header' }).expect(403);
  await a
    .post('/api/projects')
    .set(headers)
    .set('Origin', 'https://attacker.example')
    .send({ name: 'Bad origin' })
    .expect(403);
  const me = await a.get('/api/auth/me').expect(200);
  assert.equal(me.body.user.email, 'alice@example.test');
  assert.equal(me.body.user.password, undefined);
  const stored = await User.findById(userA._id).select('+password');
  assert.ok(stored.password.startsWith('$2'));
  await request(server)
    .post('/api/auth/login')
    .set(headers)
    .send({ email: 'alice@example.test', password: 'wrong' })
    .expect(401);
});
test('notes, projects, conversations, and RAG identities are isolated by account', async () => {
  const project = (
    await a.post('/api/projects').set(headers).send({ name: 'Private research' }).expect(201)
  ).body;
  await b
    .post('/api/documents/note')
    .set(headers)
    .send({ title: 'No access', content: 'Nope', project: project._id })
    .expect(404);
  const doc = (
    await a
      .post('/api/documents/note')
      .set(headers)
      .send({
        title: 'JWT research',
        content: 'JWT cookies should be HttpOnly.',
        project: project._id,
        owner: userB._id,
      })
      .expect(201)
  ).body;
  assert.equal(doc.status, 'ready');
  assert.equal(doc.chunks, 2);
  assert.equal(doc.owner, userA._id);
  assert.equal(ragCalls.find((x) => x.path === '/ingest').body.owner, userA._id);
  await b.get('/api/documents/' + doc._id).expect(404);
  await b
    .delete('/api/documents/' + doc._id)
    .set(headers)
    .expect(404);
  assert.equal((await b.get('/api/documents')).body.length, 0);
  const conv = (
    await a
      .post('/api/ask')
      .set(headers)
      .send({ question: 'What is JWT?', project: project._id, owner: userB._id })
      .expect(200)
  ).body;
  assert.equal(conv.messages.length, 2);
  assert.equal(conv.messages[1].sources[0].citation, 1);
  await b.get('/api/conversations/' + conv._id).expect(404);
  await b
    .post('/api/ask')
    .set(headers)
    .send({ question: 'Steal context', conversationId: conv._id })
    .expect(404);
  await a.post('/api/search').set(headers).send({ query: 'JWT', mode: 'keyword' }).expect(200);
  assert.equal(ragCalls.find((x) => x.path === '/search').body.owner, userA._id);
  await a
    .delete('/api/documents/' + doc._id)
    .set(headers)
    .expect(200);
  assert.ok(ragCalls.some((x) => x.path === '/delete' && x.body.document_id === doc._id));
});
test('file ingestion validates formats and hides storage paths', async () => {
  await a
    .post('/api/documents/upload')
    .set(headers)
    .attach('file', Buffer.from('pretend executable'), 'bad.exe')
    .expect(400);
  await a
    .post('/api/documents/upload')
    .set(headers)
    .attach('file', Buffer.from('not a PDF'), 'bad.pdf')
    .expect(400);
  const uploaded = (
    await a
      .post('/api/documents/upload')
      .set(headers)
      .attach('file', Buffer.from('const token = "test";'), 'auth.js')
      .expect(201)
  ).body;
  assert.equal(uploaded.kind, 'code');
  assert.equal(uploaded.filePath, undefined);
  await b.get('/api/documents/' + uploaded._id + '/download').expect(404);
  await a.get('/api/documents/' + uploaded._id + '/download').expect(200);
  await a
    .delete('/api/documents/' + uploaded._id)
    .set(headers)
    .expect(200);
});
test('indexing failures preserve the document and can be retried', async () => {
  failIndex = true;
  const doc = (
    await a
      .post('/api/documents/note')
      .set(headers)
      .send({ title: 'Keep this note', content: 'An important thought.' })
      .expect(201)
  ).body;
  assert.equal(doc.status, 'failed');
  assert.match(doc.error, /unavailable/);
  assert.equal((await a.get('/api/documents/' + doc._id)).body.content, 'An important thought.');
  failIndex = false;
  const retried = (
    await a
      .post('/api/documents/' + doc._id + '/retry')
      .set(headers)
      .expect(200)
  ).body;
  assert.equal(retried.status, 'ready');
  assert.equal(retried.error, undefined);
  await a
    .post('/api/documents/' + doc._id + '/retry')
    .set(headers)
    .expect(409);
});
test('blog CRUD keeps the original collection and imports writing into knowledge', async () => {
  const blog = (
    await a
      .post('/api/blogs')
      .set(headers)
      .send({ title: 'My first post', body: 'A good idea.' })
      .expect(201)
  ).body;
  await b
    .put('/api/blogs/' + blog._id)
    .set(headers)
    .send({ title: 'Hijack', body: 'No' })
    .expect(404);
  await a
    .put('/api/blogs/' + blog._id)
    .set(headers)
    .send({ title: 'My better post', body: 'A better idea.' })
    .expect(200);
  const doc = (
    await a
      .post('/api/blogs/' + blog._id + '/import')
      .set(headers)
      .expect(201)
  ).body;
  assert.equal(doc.content, 'A better idea.');
  assert.deepEqual(doc.tags, ['blog']);
  await a
    .delete('/api/blogs/' + blog._id)
    .set(headers)
    .expect(200);
});
function openSocket(cookie) {
  return new Promise((resolve, reject) => {
    const socket = connect(base, {
      extraHeaders: { Cookie: cookie },
      transports: ['websocket'],
      reconnection: false,
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (e) => {
      socket.close();
      reject(e);
    });
  });
}
test('Socket.IO authenticates, persists delivery, deduplicates, and protects rooms', async () => {
  await assert.rejects(openSocket(''));
  const room = (
    await a.post('/api/chat/rooms').set(headers).send({ userId: userB._id }).expect(200)
  ).body;
  await c.get('/api/chat/rooms/' + room._id + '/messages').expect(404);
  const sa = await openSocket(cookieA),
    sb = await openSocket(cookieB);
  try {
    const received = new Promise((resolve) => sb.once('message:new', resolve));
    const data = {
      roomId: room._id,
      content: 'Hello from Alice',
      clientId: 'test-deduplicate-123',
    };
    const result = await sa.timeout(3000).emitWithAck('message:send', data);
    assert.equal(result.ok, true);
    assert.equal((await received).content, data.content);
    await sa.timeout(3000).emitWithAck('message:send', data);
    assert.equal(await Message.countDocuments({ room: room._id }), 1);
    assert.ok(
      (
        await sa
          .timeout(3000)
          .emitWithAck('message:send', { ...data, roomId: '123456789012345678901234' })
      ).error,
    );
    const history = await b.get('/api/chat/rooms/' + room._id + '/messages').expect(200);
    assert.equal(history.body[0].sender._id, userA._id);
  } finally {
    sa.close();
    sb.close();
  }
});
test('publication, comments and stale edits preserve privacy and authorship', async () => {
  const guest = request(server);
  const original = {
    title: 'Literal [Learning] notes',
    body: 'Private until I publish.',
    tags: ['Learning'],
  };
  const draft = (await a.post('/api/blogs').set(headers).send(original).expect(201)).body;
  await guest.get('/api/public/blogs/' + draft._id).expect(404);
  await b.get('/api/blogs/' + draft._id).expect(404);
  await b
    .post('/api/blogs/' + draft._id + '/comments')
    .set(headers)
    .send({ content: 'Cannot see drafts' })
    .expect(404);
  const published = (
    await a
      .put('/api/blogs/' + draft._id)
      .set(headers)
      .send({ ...original, status: 'published', version: draft.__v })
      .expect(200)
  ).body;
  const result = (
    await guest
      .get('/api/public/blogs?q=' + encodeURIComponent('[Learning]') + '&tag=Learning')
      .expect(200)
  ).body;
  assert.equal(result.total, 1);
  assert.equal(result.posts[0]._id, draft._id);
  assert.equal(result.posts[0].body, undefined);
  assert.equal(result.posts[0].createdBy.email, undefined);
  await guest.get('/api/public/blogs/' + draft._id).expect(200);
  await a
    .put('/api/blogs/' + draft._id)
    .set(headers)
    .send({ ...original, version: draft.__v })
    .expect(409);
  await guest
    .post('/api/blogs/' + draft._id + '/comments')
    .set(headers)
    .send({ content: 'Anonymous' })
    .expect(401);
  const response = (
    await b
      .post('/api/blogs/' + draft._id + '/comments')
      .set(headers)
      .send({ content: 'A useful thought.' })
      .expect(201)
  ).body;
  await c
    .delete('/api/blogs/' + draft._id + '/comments/' + response._id)
    .set(headers)
    .expect(404);
  assert.equal(
    (await guest.get('/api/public/blogs/' + draft._id + '/comments').expect(200)).body.length,
    1,
  );
  await a
    .delete('/api/blogs/' + draft._id + '/comments/' + response._id)
    .set(headers)
    .expect(200);
  await a
    .put('/api/blogs/' + draft._id)
    .set(headers)
    .send({ ...original, status: 'draft', version: published.__v })
    .expect(200);
  await guest.get('/api/public/blogs/' + draft._id).expect(404);
  await guest.get('/api/public/blogs/' + draft._id + '/comments').expect(404);
  await a
    .delete('/api/blogs/' + draft._id)
    .set(headers)
    .expect(200);
});
test('legacy Blog-page passwords migrate and logout revokes old tokens', async () => {
  const salt = 'legacy-salt';
  await User.collection.insertOne({
    fullName: 'Legacy user',
    email: 'legacy@example.test',
    salt,
    password: createHmac('sha256', salt).update('legacy-pass').digest('hex'),
  });
  await request(server)
    .post('/api/auth/login')
    .set(headers)
    .send({ email: 'legacy@example.test', password: 'legacy-pass' })
    .expect(200);
  const migrated = await User.findOne({ email: 'legacy@example.test' }).select('+password +salt');
  assert.ok(migrated.password.startsWith('$2'));
  assert.equal(migrated.salt, undefined);
  await a.post('/api/auth/logout').set(headers).expect(200);
  await request(server).get('/api/auth/me').set('Cookie', cookieA).expect(401);
  await assert.rejects(openSocket(cookieA));
});
