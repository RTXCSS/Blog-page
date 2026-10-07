require('dotenv').config();
const express = require('express'),
  http = require('node:http'),
  path = require('node:path'),
  fs = require('node:fs');
const mongoose = require('mongoose');
const { rateLimit } = require('express-rate-limit');
const { requireAuth } = require('./middleware/auth');
function createApp() {
  const app = express(),
    server = http.createServer(app);
  const origins = (
    process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:8000'
  ).split(',');
  app.disable('x-powered-by');
  app.use(
    require('helmet')({
      contentSecurityPolicy: {
        directives: { 'img-src': ["'self'", 'data:'], 'connect-src': ["'self'", 'ws:', 'wss:'] },
      },
    }),
  );
  app.use(require('cors')({ origin: origins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(require('cookie-parser')());
  app.use(
    '/api',
    rateLimit({ windowMs: 60000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }),
  );
  app.use('/api', (req, res, next) => {
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      (req.get('X-Requested-With') !== 'SecondBrain' ||
        (req.get('origin') && !origins.includes(req.get('origin'))))
    )
      return res.status(403).json({ error: 'Request origin could not be verified.' });
    next();
  });
  const io = require('./services/socket').attachChat(server, origins);
  app.set('io', io);
  app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', database: mongoose.connection.readyState === 1 }),
  );
  app.use('/api/auth', require('./routes/user'));
  app.use('/api/public/blogs', require('./routes/public-blogs'));
  app.use('/api', requireAuth, require('./routes/workspace'));
  app.use('/api/blogs', requireAuth, require('./routes/blog'));
  app.use('/api/chat', requireAuth, require('./routes/chat'));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  const dist = path.join(__dirname, 'Frontend', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('/{*path}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  app.use((err, req, res, next) => {
    const status =
      err.status ||
      (err.code === 11000
        ? 409
        : ['ValidationError', 'CastError', 'MulterError'].includes(err.name)
          ? 400
          : 500);
    if (status >= 500) console.error(err.message);
    res.status(status).json({
      error:
        status >= 500 && !err.expose
          ? 'Something went wrong. Please try again.'
          : err.code === 11000
            ? 'That record already exists.'
            : err.message,
    });
  });
  return { app, server, io };
}
async function start({ onShutdown = async () => {} } = {}) {
  if (!process.env.MONGO_URL) throw new Error('Set MONGO_URL in .env. See .env.example.');
  for (const key of ['JWT_SECRET', 'RAG_SERVICE_TOKEN'])
    if (!process.env[key] || process.env[key].length < 32)
      throw new Error(key + ' must contain at least 32 characters.');
  await mongoose.connect(process.env.MONGO_URL);
  await require('./models/workspace').Document.updateMany(
    { status: 'indexing' },
    { status: 'failed', error: 'Indexing was interrupted. Retry this document.' },
  );
  const { server, io } = createApp();
  server.listen(process.env.PORT || 8000, () =>
    console.log('Second Brain API ready on port ' + (process.env.PORT || 8000)),
  );
  let closing = false;
  const shutdown = () => {
    if (closing) return;
    closing = true;
    io.close(async () => {
      await mongoose.disconnect();
      await onShutdown();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
if (require.main === module)
  start().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
module.exports = { createApp, start };
