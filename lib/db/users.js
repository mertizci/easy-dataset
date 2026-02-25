'use server';

import { db } from '@/lib/db/index';
import { hashPassword } from '@/lib/auth/password';

/**
 * Find user by email
 */
export async function getUserByEmail(email) {
  return db.users.findUnique({
    where: { email: email.toLowerCase().trim() }
  });
}

/**
 * Find user by id
 */
export async function getUserById(id) {
  return db.users.findUnique({
    where: { id }
  });
}

/**
 * Create user
 */
export async function createUser({ email, password, name, role = 'reviewer' }) {
  const passwordHash = await hashPassword(password);
  return db.users.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name || null,
      role
    }
  });
}

/**
 * Check if any admin exists (for first-time setup)
 */
export async function hasAnyAdmin() {
  const count = await db.users.count({
    where: { role: 'admin' }
  });
  return count > 0;
}
