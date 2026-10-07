const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
if (fs.existsSync('.env')) {
  console.log('.env already exists; kept your settings.');
  process.exit(0);
}
const template = fs
  .readFileSync('.env.example', 'utf8')
  .replace('replace-with-a-random-secret-at-least-32-characters', randomBytes(48).toString('hex'))
  .replace(
    'replace-with-another-random-secret-at-least-32-characters',
    randomBytes(48).toString('hex'),
  );
fs.writeFileSync('.env', template, { mode: 0o600 });
console.log('Created .env with fresh private secrets. Set OPENAI_API_KEY locally to enable AI.');
