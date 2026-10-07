const { authenticate } = require('../services/auth');
async function requireAuth(req, res, next) {
  try {
    req.user = (await authenticate(req.cookies.token)).user;
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in to continue.' });
  }
}
module.exports = { requireAuth };
