import { getChunkContentsByNames } from '@/lib/db/chunks';
import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';

export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { chunkNames } = await request.json();

    if (!chunkNames || !Array.isArray(chunkNames)) {
      return NextResponse.json({ error: 'chunkNames must be an array' }, { status: 400 });
    }

    const chunkContentMap = await getChunkContentsByNames(projectId, chunkNames);

    return NextResponse.json(chunkContentMap);
  } catch (error) {
    console.error('Failed to batch fetch chunk content:', error);
    return NextResponse.json({ error: 'Failed to batch fetch chunk content' }, { status: 500 });
  }
}
