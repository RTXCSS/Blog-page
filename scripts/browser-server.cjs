// Isolated browser-test backend: never reads or writes the development database.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
Object.assign(process.env, {
  JWT_SECRET: 'browser-test-secret-at-least-thirty-two-characters',
  RAG_SERVICE_TOKEN: 'browser-test-service-secret-at-least-thirty-two-characters',
  CLIENT_ORIGIN: 'http://127.0.0.1:18107',
  NODE_ENV: 'test',
  RAG_URL: 'http://127.0.0.1:1',
});
async function main() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const { server, io } = require('../app').createApp();
  server.listen(18107, '127.0.0.1', () => console.log('Browser-test app ready'));
  let closing = false;
  const stop = () => {
    if (closing) return;
    closing = true;
    io.close(async () => {
      await mongoose.disconnect();
      await mongo.stop();
      process.exit(0);
    });
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
