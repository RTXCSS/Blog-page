const { Router } = require('express');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/user');
const { createToken, cookieOptions, publicUser } = require('../services/auth');
const { requireAuth } = require('../middleware/auth');
const { z } = require('zod');
const router = Router();
const password = z
  .string()
  .min(10)
  .max(72)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72);
const credentials = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password,
});
router.use(
  rateLimit({
    windowMs: 15 * 60000,
    limit: 35,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again in 15 minutes.' },
  }),
);
router.post('/register', async (req, res) => {
  const parsed = credentials
    .extend({ fullName: z.string().trim().min(2).max(80) })
    .safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({ error: 'Enter a name, valid email, and a password of 10–72 characters.' });
  const user = await User.create(parsed.data);
  res
    .cookie('token', createToken(user), cookieOptions())
    .status(201)
    .json({ user: publicUser(user) });
});
router.post('/login', async (req, res) => {
  const parsed = credentials
    .extend({
      password: z
        .string()
        .min(1)
        .max(72)
        .refine((value) => Buffer.byteLength(value, 'utf8') <= 72),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const user = await User.findOne({ email: parsed.data.email }).select('+password +salt');
  const valid = user
    ? await user.checkPassword(parsed.data.password)
    : await require('bcryptjs').compare(
        parsed.data.password,
        '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW',
      );
  if (!user || !valid) return res.status(401).json({ error: 'Email or password is incorrect.' });
  res.cookie('token', createToken(user), cookieOptions()).json({ user: publicUser(user) });
});
router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
router.post('/logout', requireAuth, async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  req.app
    .get('io')
    .in('user:' + req.user._id)
    .disconnectSockets(true);
  const options = cookieOptions();
  delete options.maxAge;
  res.clearCookie('token', options).json({ ok: true });
});
module.exports = router;
