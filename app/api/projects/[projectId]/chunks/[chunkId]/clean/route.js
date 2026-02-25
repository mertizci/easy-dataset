import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import logger from '@/lib/util/logger';
import cleanService from '@/lib/services/clean';

// Data cleaning for specified chunk
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, chunkId } = params;

    // Validate project ID and chunk ID
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'Project ID or text block ID cannot be empty' }, { status: 400 });
    }

    // Get request body
    const { model, language = 'en' } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Model cannot be empty' }, { status: 400 });
    }

    // Use data cleaning service
    const result = await cleanService.cleanDataForChunk(projectId, chunkId, {
      model,
      language
    });

    // Return cleaning result
    return NextResponse.json({
      chunkId,
      originalLength: result.originalLength,
      cleanedLength: result.cleanedLength,
      success: result.success,
      message: 'Data cleaning completed'
    });
  } catch (error) {
    logger.error('Error cleaning data:', error);
    return NextResponse.json({ error: error.message || 'Error cleaning data' }, { status: 500 });
  }
}
