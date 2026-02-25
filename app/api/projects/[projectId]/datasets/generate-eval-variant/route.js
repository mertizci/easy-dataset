import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getDatasetsById } from '@/lib/db/datasets';
import LLMClient from '@/lib/llm/core/index';
import { getEvalQuestionPrompt } from '@/lib/llm/prompts/evalQuestion';
import { extractJsonFromLLMOutput } from '@/lib/llm/common/util';

export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { datasetId, model, language, questionType = 'open_ended', count = 1 } = await request.json();

    if (!datasetId || !model) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Get original dataset
    const dataset = await getDatasetsById(datasetId);
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // 2. Build prompt
    // Merge question and answer as context text
    const text = `Question: ${dataset.question}\nAnswer: ${dataset.answer}`;

    const prompt = await getEvalQuestionPrompt(language || 'zh-CN', questionType, { text, number: count }, projectId);

    // 3. Call LLM
    const client = new LLMClient(model);

    const response = await client.getResponse(prompt);
    const result = extractJsonFromLLMOutput(response);

    // Result should be an array
    if (!result || !Array.isArray(result)) {
      throw new Error('Failed to parse LLM output or output is not an array');
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Generate eval variant failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
