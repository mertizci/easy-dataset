import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getUsedCustomTags } from '@/lib/db/datasets';

/**
 * Get custom tags used in project
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

    const tags = await getUsedCustomTags(projectId);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to get custom tags:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to get custom tags'
      },
      { status: 500 }
    );
  }
}
