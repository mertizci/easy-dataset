import { db } from '@/lib/db/index';

/**
 * Check if user can access project (admin: all, reviewer: only assigned)
 * @param {string} userId
 * @param {string} projectId
 * @returns {Promise<boolean>}
 */
async function canAccessProject(userId, projectId) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  if (!user) return false;
  if (user.role === 'admin') return true;
  const access = await db.projectUserAccess.findUnique({
    where: {
      projectId_userId: { projectId, userId }
    }
  });
  return !!access;
}

/**
 * Check if user can only rate (reviewer with project access)
 * @param {string} userId
 * @param {string} projectId
 * @returns {Promise<boolean>}
 */
async function canOnlyRate(userId, projectId) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  if (!user) return false;
  if (user.role === 'admin') return false; // admin has full access
  const access = await db.projectUserAccess.findUnique({
    where: {
      projectId_userId: { projectId, userId }
    }
  });
  return !!access; // reviewer with access can only rate
}

/**
 * Get project IDs that a reviewer can access
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
async function getAccessibleProjectIds(userId) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { role: true }
  });
  if (!user) return [];
  if (user.role === 'admin') return []; // empty means "all" for admin
  const accesses = await db.projectUserAccess.findMany({
    where: { userId },
    select: { projectId: true }
  });
  return accesses.map((a) => a.projectId);
}

module.exports = {
  canAccessProject,
  canOnlyRate,
  getAccessibleProjectIds
};
