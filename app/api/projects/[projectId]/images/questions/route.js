import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getImageByName } from '@/lib/db/images';
import imageService from '@/lib/services/images';

// Generate image questions
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { imageName, count = 3, model, language = 'zh' } = await request.json();

    if (!imageName) {
      return NextResponse.json({ error: 'Image name is required' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: 'Please select a vision model' }, { status: 400 });
    }

    // Get image info
    const image = await getImageByName(projectId, imageName);
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Call image question generation service
    const result = await imageService.generateQuestionsForImage(projectId, image.id, {
      model,
      language,
      count
    });

    return NextResponse.json({
      success: true,
      questions: result.questions
    });
  } catch (error) {
    console.error('Failed to generate image questions:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
  }
}
