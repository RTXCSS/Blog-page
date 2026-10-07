const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');
const { createHmac, timingSafeEqual } = require('node:crypto');
const schema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    salt: { type: String, select: false },
    tokenVersion: { type: Number, default: 0 },
    pfp: String,
    role: { type: String, enum: ['User', 'Admin'], default: 'User' },
  },
  { timestamps: true },
);
schema.pre('save', async function () {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
    this.salt = undefined;
  }
});
schema.methods.checkPassword = async function (password) {
  if (this.salt) {
    // Migrate the original Blog-page hash only after successful sign-in.
    const actual = Buffer.from(createHmac('sha256', this.salt).update(password).digest('hex'));
    const expected = Buffer.from(this.password);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    this.password = password;
    await this.save();
    return true;
  }
  return bcrypt.compare(password, this.password);
};
module.exports = model('User', schema);
