const jwt = require('jsonwebtoken');
const User = require('../models/user');
function createToken(user) {
  return jwt.sign(
    { sub: String(user._id), version: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '7d', issuer: 'second-brain', audience: 'second-brain-web' },
  );
}
async function authenticate(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'second-brain',
    audience: 'second-brain-web',
  });
  const user = await User.findById(payload.sub);
  if (!user || (user.tokenVersion || 0) !== payload.version) throw new Error('Session expired');
  return { user, expires: payload.exp };
}
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 86400000,
});
const publicUser = (user) => ({
  _id: String(user._id),
  fullName: user.fullName,
  email: user.email,
});
module.exports = { createToken, authenticate, cookieOptions, publicUser };
