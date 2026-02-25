import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';

export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const body = await request.json();
    const { format, selectedIds, filters } = body;

    let questions;

    // If selected question IDs provided, fetch by IDs
    if (selectedIds && selectedIds.length > 0) {
      questions = await getQuestionsByIds(projectId, selectedIds);
    } else {
      // Otherwise fetch all questions (no pagination)
      questions = await getAllQuestions(
        projectId,
        filters?.searchTerm || '',
        filters?.chunkName || '',
        filters?.sourceType || 'all'
      );
    }

    // Fixed export fields: question content, chunk name, question label
    const filteredQuestions = questions.map(q => ({
      question: q.question,
      chunkName: q.chunk?.name || q.chunkName || '',
      questionLabel: q.questionLabel || ''
    }));

    return NextResponse.json(filteredQuestions);
  } catch (error) {
    console.error('Failed to export questions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Fetch all questions (no pagination)
async function getAllQuestions(projectId, searchTerm = '', chunkName = '', sourceType = 'all') {
  const { db } = await import('@/lib/db/index');

  const whereClause = {
    projectId
  };

  // Search conditions
  if (searchTerm) {
    whereClause.OR = [{ question: { contains: searchTerm } }, { questionLabel: { contains: searchTerm } }];
  }

  // Chunk name filter
  if (chunkName) {
    whereClause.chunk = {
      name: { contains: chunkName }
    };
  }

  // Source type filter
  if (sourceType === 'text') {
    whereClause.imageName = null;
  } else if (sourceType === 'image') {
    whereClause.imageName = { not: null };
  }

  return await db.questions.findMany({
    where: whereClause,
    include: {
      chunk: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createAt: 'desc'
    }
  });
}

// Fetch questions by ID list
async function getQuestionsByIds(projectId, questionIds) {
  const { db } = await import('@/lib/db/index');

  return await db.questions.findMany({
    where: {
      projectId,
      id: { in: questionIds }
    },
    include: {
      chunk: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createAt: 'desc'
    }
  });
}
