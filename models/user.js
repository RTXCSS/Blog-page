const { Schema, model } = require("mongoose");
const { createHmac, randomBytes } = require("node:crypto");
const { createToken } = require("../services/auth");

const UserSchema = new Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
  },
  salt: String,
  password: {
    type: String,
    required: true,
  },
  pfp: {
    type: String,
    default: "/images/pfp.png",
  },
  role: {
    type: String,
    enum: ["User", "Admin"],
    default: "User",
  }
}, { timestamps: true });

UserSchema.pre("save", function (next) {
  if (!this.isModified("password")) return next();

  const salt = randomBytes(16).toString("hex");
  const hashedPass = createHmac("sha256", salt)
    .update(this.password)
    .digest("hex");

  this.salt = salt;
  this.password = hashedPass;
  next();
});

UserSchema.statics.Matchpassword = async function(email, password) {
  const user = await this.findOne({ email });
  if (!user) throw new Error("User not found");

  const hashedPass = createHmac("sha256", user.salt)
    .update(password)
    .digest("hex");
  if (hashedPass !== user.password) throw new Error("Wrong password");

  const token = createToken({
    id: user._id,
    email: user.email,
    role: user.role
  });
  return token;
};

const User = model("User", UserSchema);
module.exports = User;
