require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { MongoMemoryServer } = require('mongodb-memory-server');
async function main() {
  const dbPath = path.resolve('storage/dev-mongo');
  fs.mkdirSync(dbPath, { recursive: true });
  const mongo = await MongoMemoryServer.create({
    instance: { dbPath, storageEngine: 'wiredTiger', dbName: 'second-brain' },
  });
  process.env.MONGO_URL = mongo.getUri('second-brain');
  console.log('Local development MongoDB started. Data persists in storage/dev-mongo.');
  await require('../app').start({
    onShutdown: () => mongo.stop({ doCleanup: false, force: false }),
  });
}
main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
