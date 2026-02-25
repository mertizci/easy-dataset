'use server';

import { db } from '@/lib/db/index';

/**
 * Add user to project (grant access)
 */
export async function addProjectUserAccess(projectId, userId, role = 'reviewer') {
  return db.projectUserAccess.upsert({
    where: {
      projectId_userId: { projectId, userId }
    },
    create: { projectId, userId, role },
    update: { role }
  });
}

/**
 * Remove user from project
 */
export async function removeProjectUserAccess(projectId, userId) {
  return db.projectUserAccess.delete({
    where: {
      projectId_userId: { projectId, userId }
    }
  });
}

/**
 * Get users with access to a project
 */
export async function getProjectUsers(projectId) {
  return db.projectUserAccess.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true }
      }
    }
  });
}
