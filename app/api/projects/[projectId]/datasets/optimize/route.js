import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getDatasetsById, updateDataset } from '@/lib/db/datasets';
import { getQuestionById } from '@/lib/db/questions';
import { getChunkById } from '@/lib/db/chunks';
import LLMClient from '@/lib/llm/core/index';
import { getNewAnswerPrompt } from '@/lib/llm/prompts/newAnswer';
import { extractJsonFromLLMOutput } from '@/lib/llm/common/util';

// Optimize dataset answer
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }

    // Get request body
    const { datasetId, model, advice, language } = await request.json();

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID cannot be empty' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: 'Model cannot be empty' }, { status: 400 });
    }

    if (!advice) {
      return NextResponse.json({ error: 'Please provide optimization suggestions' }, { status: 400 });
    }

    // Get dataset content
    const dataset = await getDatasetsById(datasetId);
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset does not exist' }, { status: 404 });
    }

    // Create LLM client
    const llmClient = new LLMClient(model);

    const { question, answer, cot, chunkContent: storedChunkContent, questionId } = dataset;

    let chunkContent = storedChunkContent || '';

    if (!chunkContent && questionId) {
      try {
        const questionRecord = await getQuestionById(questionId);
        if (questionRecord?.chunkId) {
          const chunkRecord = await getChunkById(questionRecord.chunkId);
          chunkContent = chunkRecord?.content || '';
        }
      } catch (error) {
        console.error('Failed to load chunk content by questionId:', error);
      }
    }

    // Generate optimized answer and chain-of-thought
    const prompt = await getNewAnswerPrompt(language, { question, answer, cot, advice, chunkContent }, projectId);

    const response = await llmClient.getResponse(prompt);

    // Extract JSON optimization result from LLM output
    const optimizedResult = extractJsonFromLLMOutput(response);

    if (!optimizedResult || !optimizedResult.answer) {
      return NextResponse.json({ error: 'Failed to optimize answer, please try again' }, { status: 500 });
    }

    // Update dataset
    const updatedDataset = {
      ...dataset,
      answer: optimizedResult.answer,
      cot: cot ? optimizedResult.cot || cot : '' // Do not update if no CoT provided
    };

    await updateDataset(updatedDataset);

    // Return optimized dataset
    return NextResponse.json({
      success: true,
      dataset: updatedDataset
    });
  } catch (error) {
    console.error('Failed to optimize answer:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to optimize answer' }, { status: 500 });
  }
}
