import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { generateEvalQuestionsForChunk } from '@/lib/services/eval';
import logger from '@/lib/util/logger';

/**
 * Generate eval questions for specified chunk
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, chunkId } = params;

    // Validate params
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'Project ID and Chunk ID are required' }, { status: 400 });
    }

    // Get request body
    const { model, language = 'zh-CN' } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Model configuration is required' }, { status: 400 });
    }

    // Call service to generate eval questions
    const result = await generateEvalQuestionsForChunk(projectId, chunkId, {
      model,
      language
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error generating eval questions:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate eval questions' }, { status: 500 });
  }
}
