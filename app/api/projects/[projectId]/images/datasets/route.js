import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getImageByName } from '@/lib/db/images';
import imageService from '@/lib/services/images';

// Generate image dataset
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { imageName, question, model, language = 'zh', previewOnly = false } = await request.json();

    if (!imageName || !question) {
      return NextResponse.json({ error: 'Required parameters are missing' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: 'Please select a vision model' }, { status: 400 });
    }

    // Get image info
    const image = await getImageByName(projectId, imageName);
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Call image dataset generation service
    const result = await imageService.generateDatasetForImage(projectId, image.id, question, {
      model,
      language,
      previewOnly
    });

    return NextResponse.json({
      success: true,
      answer: result.answer,
      dataset: result.dataset
    });
  } catch (error) {
    console.error('Failed to generate image dataset:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate dataset' }, { status: 500 });
  }
}
