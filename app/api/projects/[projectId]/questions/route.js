import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import {
  getAllQuestionsByProjectId,
  getQuestions,
  getQuestionsIds,
  saveQuestions,
  updateQuestion
} from '@/lib/db/questions';
import { getImageById, getImageChunk } from '@/lib/db/images';

// Get all project questions
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Missing project ID' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    let status = searchParams.get('status');
    let answered = undefined;
    if (status === 'answered') answered = true;
    if (status === 'unanswered') answered = false;
    const chunkName = searchParams.get('chunkName');
    const sourceType = searchParams.get('sourceType') || 'all'; // 'all', 'text', 'image'
    const searchMatchMode = searchParams.get('searchMatchMode') || 'match'; // 'match', 'notMatch'
    let selectedAll = searchParams.get('selectedAll');
    if (selectedAll) {
      let data = await getQuestionsIds(
        projectId,
        answered,
        searchParams.get('input'),
        chunkName,
        sourceType,
        searchMatchMode
      );
      return NextResponse.json(data);
    }
    let all = searchParams.get('all');
    if (all) {
      let data = await getAllQuestionsByProjectId(projectId);
      return NextResponse.json(data);
    }
    // Get question list
    const questions = await getQuestions(
      projectId,
      parseInt(searchParams.get('page')),
      parseInt(searchParams.get('size')),
      answered,
      searchParams.get('input'),
      chunkName,
      sourceType,
      searchMatchMode
    );

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Failed to get questions:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get questions' }, { status: 500 });
  }
}

// Add question
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const body = await request.json();
    const { question, chunkId, label } = body;

    // Validate required params
    if (!projectId || !question) {
      return NextResponse.json({ error: 'Missing necessary parameters' }, { status: 400 });
    }

    if (!body.chunkId && body.imageId) {
      const chunk = await getImageChunk(projectId);
      body.chunkId = chunk.id;
      body.label = 'image';
    }

    // Add new question
    let questions = [body];
    // Save updated data
    let data = await saveQuestions(projectId, questions);

    // Return success response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to create question:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to create question' }, { status: 500 });
  }
}

// Update question
export async function PUT(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const body = await request.json();
    // Save updated data
    const { imageId } = body;
    if (imageId) {
      body.imageName = (await getImageById(imageId))?.imageName;
    }
    let data = await updateQuestion(body);
    // Return updated question data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update question:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to update question' }, { status: 500 });
  }
}
