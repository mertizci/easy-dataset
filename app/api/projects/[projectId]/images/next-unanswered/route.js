import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { PrismaClient } from '@prisma/client';
import { getImageDetailWithQuestions } from '@/lib/services/images';

const prisma = new PrismaClient();

// Get next image with unanswered questions
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Find first image with unanswered questions
    const unansweredQuestion = await prisma.questions.findFirst({
      where: {
        projectId,
        imageId: {
          not: null
        },
        answered: false
      }
    });

    if (!unansweredQuestion) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    // Call service to get image details
    const imageData = await getImageDetailWithQuestions(projectId, unansweredQuestion.imageId);

    return NextResponse.json({
      success: true,
      data: imageData
    });
  } catch (error) {
    console.error('Failed to get next unanswered image:', error);
    return NextResponse.json({ error: error.message || 'Failed to get next unanswered image' }, { status: 500 });
  }
}
