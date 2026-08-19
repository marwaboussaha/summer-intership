import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../database/models/User.js";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "7d";

function generateToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function toPublicUser(user) {
  return { id: user._id, name: user.name, email: user.email };
}

export async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    const err = new Error("Un compte existe déjà avec cet email.");
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email, passwordHash });

  return { user: toPublicUser(user), token: generateToken(user) };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    const err = new Error("Email ou mot de passe incorrect.");
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const err = new Error("Email ou mot de passe incorrect.");
    err.status = 401;
    throw err;
  }

  return { user: toPublicUser(user), token: generateToken(user) };
}

export { toPublicUser };