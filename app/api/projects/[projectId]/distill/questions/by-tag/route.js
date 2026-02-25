import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { db } from '@/lib/db';

/**
 * Get question list by tag ID
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    // Validate parameters
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    // Get tag info
    const tag = await db.tags.findUnique({
      where: { id: tagId }
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Get or create distill chunk
    let distillChunk = await db.chunks.findFirst({
      where: {
        projectId,
        name: 'Distilled Content'
      }
    });

    if (!distillChunk) {
      // Create a special distill chunk
      distillChunk = await db.chunks.create({
        data: {
          name: 'Distilled Content',
          projectId,
          fileId: 'distilled',
          fileName: 'distilled.md',
          content:
            'This text block is used to store questions generated through data distillation and is not related to actual literature.',
          summary: 'Questions generated through data distillation',
          size: 0
        }
      });
    }
    const questions = await db.questions.findMany({
      where: {
        projectId,
        label: tag.label,
        chunkId: distillChunk.id
      }
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('[distill/questions/by-tag] Failed to get questions:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get questions' }, { status: 500 });
  }
}
