import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { db } from '@/lib/db';

export async function POST(req, { params }) {
  try {
    const auth = await requireProjectAuth(req, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, datasetId } = params;

    // 1. Get dataset details
    const dataset = await db.datasets.findUnique({
      where: { id: datasetId, projectId }
    });

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // 2. Try to find chunkId via questionId
    let chunkId = null;
    if (dataset.questionId) {
      const question = await db.questions.findUnique({
        where: { id: dataset.questionId }
      });
      if (question) {
        chunkId = question.chunkId;
      }
    }

    // 3. Create eval dataset record
    // Use open_ended type by default (QA pairs fit evaluation)
    let evalTags = [];
    try {
      evalTags = JSON.parse(dataset.tags || '[]');
      if (!Array.isArray(evalTags)) evalTags = [];
    } catch (e) {
      evalTags = [];
    }

    // Exclude 'Eval' tag, convert array to comma-separated string
    const evalTagsString = evalTags.filter(tag => tag !== 'Eval').join(',');

    const evalDataset = await db.evalDatasets.create({
      data: {
        projectId,
        question: dataset.question,
        questionType: 'open_ended',
        correctAnswer: dataset.answer,
        tags: evalTagsString,
        note: dataset.note,
        chunkId: chunkId,
        options: '' // Open-ended questions need no options
      }
    });

    // 4. Update original dataset with 'Eval' tag
    let currentTags = [];
    try {
      currentTags = JSON.parse(dataset.tags || '[]');
    } catch (e) {
      // ignore error
    }

    if (!currentTags.includes('Eval')) {
      currentTags.push('Eval');
      await db.datasets.update({
        where: { id: datasetId },
        data: {
          tags: JSON.stringify(currentTags)
        }
      });
    }

    return NextResponse.json({ success: true, evalDataset });
  } catch (error) {
    console.error('Failed to copy dataset to eval:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
