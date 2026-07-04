const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.TOKEN_EXPIRY || '2h'
  });
}

async function hashPassword(plain) {
  const saltRounds = 10;
  return await bcrypt.hash(plain, saltRounds);
}

async function verifyPassword(plain, hash) {
  return await bcrypt.compare(plain, hash);
}

module.exports = { generateToken, hashPassword, verifyPassword }; 