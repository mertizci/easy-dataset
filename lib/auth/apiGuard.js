import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from './session';
import { canAccessProject, canOnlyRate } from './permissions';

/**
 * Extract session from request (Authorization header or cookie)
 * @param {Request} request
 * @returns {Promise<{ userId: string, email: string, role: string } | null>}
 */
export async function getSessionFromRequest(request) {
  const authHeader = request.headers.get('Authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value;
    } catch {
      // cookies() may not be available in all contexts
    }
  }
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Require auth - returns 401 if not authenticated
 * @param {Request} request
 * @returns {Promise<{ session: object, response?: NextResponse }>}
 */
export async function requireAuth(request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 })
    };
  }
  return { session, response: null };
}

/**
 * Require project access - returns 403 if no access
 * @param {string} userId
 * @param {string} projectId
 * @returns {Promise<{ allowed: boolean, response?: NextResponse }>}
 */
export async function requireProjectAccess(userId, projectId) {
  const allowed = await canAccessProject(userId, projectId);
  if (!allowed) {
    return {
      allowed: false,
      response: NextResponse.json({ error: 'Forbidden', message: 'Access denied to this project' }, { status: 403 })
    };
  }
  return { allowed: true, response: null };
}

/**
 * Check if user is reviewer with rating-only permission for this project
 * @param {string} userId
 * @param {string} projectId
 * @returns {Promise<boolean>}
 */
export async function isRatingOnlyUser(userId, projectId) {
  return canOnlyRate(userId, projectId);
}

/**
 * Require auth + project access. For write operations, also require admin.
 * @param {Request} request
 * @param {{ projectId: string }} params
 * @param {{ requireAdmin?: boolean }} options
 * @returns {Promise<{ session: object, projectId: string } | { response: NextResponse }>}
 */
export async function requireProjectAuth(request, params, { requireAdmin = false } = {}) {
  const { session, response: authError } = await requireAuth(request);
  if (authError) return { response: authError };
  const projectId = params?.projectId;
  if (!projectId) {
    return { response: NextResponse.json({ error: 'Project ID required' }, { status: 400 }) };
  }
  const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
  if (accessError) return { response: accessError };
  if (requireAdmin && session.role !== 'admin') {
    return { response: NextResponse.json({ error: 'Forbidden', message: 'Admin only' }, { status: 403 }) };
  }
  return { session, projectId };
}
