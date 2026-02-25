import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getImages, deleteImage, getImageDetail } from '@/lib/db/images';
import { getProjectPath } from '@/lib/db/base';
import { db } from '@/lib/db/index';
import { importImagesFromDirectories } from '@/lib/services/images';
import fs from 'fs/promises';
import path from 'path';

// Get image list
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 20;
    const imageName = searchParams.get('imageName') || '';
    const hasQuestions = searchParams.get('hasQuestions');
    const hasDatasets = searchParams.get('hasDatasets');
    const simple = searchParams.get('simple');

    const result = await getImages(projectId, page, pageSize, imageName, hasQuestions, hasDatasets, simple);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get images:', error);
    return NextResponse.json({ error: error.message || 'Failed to get images' }, { status: 500 });
  }
}

// Import images
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { directories } = await request.json();

    // Call service to handle image import
    const result = await importImagesFromDirectories(projectId, directories);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to import images:', error);
    return NextResponse.json({ error: error.message || 'Failed to import images' }, { status: 500 });
  }
}

// Delete image
export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Get image info
    const image = await getImageDetail(imageId);

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete related datasets
    await db.imageDatasets.deleteMany({
      where: { imageId }
    });

    // Delete related questions
    await db.questions.deleteMany({
      where: { imageId }
    });

    // Delete file
    const projectPath = await getProjectPath(projectId);
    const filePath = path.join(projectPath, 'images', image.imageName);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('Failed to delete file:', err);
    }

    // Delete database record
    await deleteImage(imageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete image:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete image' }, { status: 500 });
  }
}
