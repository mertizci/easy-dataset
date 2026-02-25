import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { evaluateDataset } from '@/lib/services/datasets/evaluation';

/**
 * Evaluate single dataset quality
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, datasetId } = params;
    const { model, language = 'zh-CN' } = await request.json();

    if (!projectId || !datasetId) {
      return NextResponse.json({ success: false, message: 'Project ID and Dataset ID are required' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ success: false, message: 'Model configuration is required' }, { status: 400 });
    }

    // Use evaluation service
    const result = await evaluateDataset(projectId, datasetId, model, language);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Dataset evaluation completed',
      data: result.data
    });
  } catch (error) {
    console.error('Dataset evaluation failed:', error);
    return NextResponse.json({ success: false, message: `Evaluation failed: ${error.message}` }, { status: 500 });
  }
}
