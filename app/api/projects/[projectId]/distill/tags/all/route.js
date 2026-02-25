import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { db } from '@/lib/db';

/**
 * Get all distill tags for the project
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get all tags
    const tags = await db.tags.findMany({
      where: {
        projectId
      },
      orderBy: {
        label: 'asc'
      }
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Failed to get distill tags:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get distill tags' }, { status: 500 });
  }
}
