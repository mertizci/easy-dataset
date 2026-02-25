const { SignJWT, jwtVerify } = require('jose');

const JWT_SECRET = process.env.JWT_SECRET || 'easydataset-default-secret-change-in-production';
const JWT_EXPIRY = '1d'; // 1 day

/**
 * Create JWT token for user
 * @param {{ userId: string, email: string, role: string }} payload
 * @returns {Promise<string>} - JWT token
 */
async function createToken(payload) {
  const secret = new TextEncoder().encode(JWT_SECRET);
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);
  return token;
}

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Promise<{ userId: string, email: string, role: string } | null>} - Decoded payload or null
 */
async function verifyToken(token) {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
  } catch {
    return null;
  }
}

module.exports = {
  createToken,
  verifyToken
};
