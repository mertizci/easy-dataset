import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { deleteChunkById, getChunkByFileIds, getChunkById, getChunksByFileIds, updateChunkById } from '@/lib/db/chunks';

// Get chunk content
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    // Validate params
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }
    const { array } = await request.json();
    // Get chunk content
    const chunk = await getChunksByFileIds(array);

    return NextResponse.json(chunk);
  } catch (error) {
    console.error('Failed to get text block content:', String(error));
    return NextResponse.json({ error: String(error) || 'Failed to get text block content' }, { status: 500 });
  }
}
