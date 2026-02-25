import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getQuestionsForChunk } from '@/lib/db/questions';
import logger from '@/lib/util/logger';
import questionService from '@/lib/services/questions';

// Generate questions for specified chunk
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, chunkId } = params;

    // Validate project ID and chunk ID
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'Project ID or text block ID cannot be empty' }, { status: 400 });
    }
    const { model, language = 'en', number, enableGaExpansion = false } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Model cannot be empty' }, { status: 400 });
    }

    // Service will use GA expansion based on enableGaExpansion
    const serviceFunc = questionService.generateQuestionsForChunkWithGA;

    // Use question generation service
    const result = await serviceFunc(projectId, chunkId, {
      model,
      language,
      number,
      enableGaExpansion
    });

    // Unified response format with GA expansion info
    const response = {
      chunkId,
      questions: result.questions || result.labelQuestions || [],
      total: result.total || (result.questions || result.labelQuestions || []).length,
      gaExpansionUsed: result.gaExpansionUsed || false,
      gaPairsCount: result.gaPairsCount || 0,
      expectedTotal: result.expectedTotal || result.total
    };

    // Return generated questions
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error generating questions:', error);
    return NextResponse.json({ error: error.message || 'Error generating questions' }, { status: 500 });
  }
}

// Get questions for specified chunk
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId, chunkId } = params;

    // Validate project ID and chunk ID
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'Project ID and Chunk ID are required' }, { status: 400 });
    }

    // Get chunk questions
    const questions = await getQuestionsForChunk(projectId, chunkId);

    // Return question list
    return NextResponse.json({
      chunkId,
      questions,
      total: questions.length
    });
  } catch (error) {
    console.error('Error getting questions:', String(error));
    return NextResponse.json({ error: error.message || 'Error getting questions' }, { status: 500 });
  }
}
