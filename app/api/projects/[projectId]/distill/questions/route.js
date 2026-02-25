import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { distillQuestionsPrompt } from '@/lib/llm/prompts/distillQuestions';
import { db } from '@/lib/db';

const LLMClient = require('@/lib/llm/core');

/**
 * Generate questions API: construct questions by tag path
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { tagPath, currentTag, tagId, count = 5, model, language = 'zh' } = await request.json();

    if (!currentTag || !tagPath) {
      const errorMsg = language === 'en' ? 'Tag information cannot be empty' : 'Tag information is required';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Get or create distill chunk first
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

    // Get existing questions to avoid duplicates
    const existingQuestions = await db.questions.findMany({
      where: {
        projectId,
        label: currentTag,
        chunkId: distillChunk.id // Use distill chunk ID
      },
      select: { question: true }
    });

    const existingQuestionTexts = existingQuestions.map(q => q.question);

    const llmClient = new LLMClient(model);
    const prompt = await distillQuestionsPrompt(
      language,
      { tagPath, currentTag, count, existingQuestionTexts },
      projectId
    );
    const { answer } = await llmClient.getResponseWithCOT(prompt);

    let questions = [];
    try {
      questions = JSON.parse(answer);
    } catch (error) {
      console.error('Failed to parse question JSON:', String(error));
      // Try to extract questions with regex
      const matches = answer.match(/"([^"]+)"/g);
      if (matches) {
        questions = matches.map(match => match.replace(/"/g, ''));
      }
    }

    // Save questions to database
    const savedQuestions = [];
    for (const questionText of questions) {
      const question = await db.questions.create({
        data: {
          question: questionText,
          projectId,
          label: currentTag,
          chunkId: distillChunk.id
        }
      });
      savedQuestions.push(question);
    }

    return NextResponse.json(savedQuestions);
  } catch (error) {
    console.error('Failed to generate questions:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
  }
}
