import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getChunkByName } from '@/lib/db/chunks';

/**
 * Get chunk by name
 * @param {Request} request - Request object
 * @param {object} context - Context with path params
 * @returns {Promise<NextResponse>} - Response object
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Get chunkName from query params
    const { searchParams } = new URL(request.url);
    const chunkName = searchParams.get('chunkName');

    if (!chunkName) {
      return NextResponse.json({ error: 'Chunk name is required' }, { status: 400 });
    }

    // Query chunk by name and project ID
    const chunk = await getChunkByName(projectId, chunkName);

    if (!chunk) {
      return NextResponse.json({ error: 'Chunk not found' }, { status: 404 });
    }

    // Return chunk info
    return NextResponse.json(chunk);
  } catch (error) {
    console.error('Failed to get chunk by name:', String(error));
    return NextResponse.json({ error: 'Failed to get chunk: ' + error.message }, { status: 500 });
  }
}
