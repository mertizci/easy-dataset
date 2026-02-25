import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getDatasetsById } from '@/lib/db/datasets';
import { getEncoding } from '@langchain/core/utils/tiktoken';

/**
 * Async compute token count for dataset text
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId, datasetId } = params;

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID is required' }, { status: 400 });
    }

    const datasets = await getDatasetsById(datasetId);
    const tokenCounts = {
      answerTokens: 0,
      cotTokens: 0
    };

    try {
      if (datasets.answer || datasets.cot) {
        // Use cl100k_base encoding (gpt-3.5-turbo, gpt-4)
        const encoding = await getEncoding('cl100k_base');

        if (datasets.answer) {
          const tokens = encoding.encode(datasets.answer);
          tokenCounts.answerTokens = tokens.length;
        }

        if (datasets.cot) {
          const tokens = encoding.encode(datasets.cot);
          tokenCounts.cotTokens = tokens.length;
        }
      }
    } catch (error) {
      console.error('Failed to compute token count:', String(error));
      return NextResponse.json({ error: 'Failed to compute token count' }, { status: 500 });
    }

    return NextResponse.json(tokenCounts);
  } catch (error) {
    console.error('Failed to get token count:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to get token count'
      },
      { status: 500 }
    );
  }
}
