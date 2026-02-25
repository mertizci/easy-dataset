import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { PrismaClient } from '@prisma/client';
import { getImageById, getImageChunk } from '@/lib/db/images';
import { createImageDataset } from '@/lib/db/imageDatasets';

const prisma = new PrismaClient();

// Create annotation
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { imageId, questionId, question, answerType, answer, note } = await request.json();

    // Validate required fields
    if (!imageId || !question || !answerType || answer === undefined || answer === null) {
      return NextResponse.json({ error: 'Required parameters missing: imageId, question, answerType, answer' }, { status: 400 });
    }

    // Validate image exists
    const image = await getImageById(imageId);
    if (!image || image.projectId !== projectId) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Validate answer type
    if (!['text', 'label', 'custom_format'].includes(answerType)) {
      return NextResponse.json({ error: 'Invalid answer type' }, { status: 400 });
    }

    // Validate answer content
    if (answerType === 'text' && typeof answer !== 'string') {
      return NextResponse.json({ error: 'Text answer must be a string' }, { status: 400 });
    }
    if (answerType === 'label' && !Array.isArray(answer)) {
      return NextResponse.json({ error: 'Label answer must be an array' }, { status: 400 });
    }

    // Serialize answer
    let answerString = answer;
    if (answerType !== 'text' && typeof answerString !== 'string') {
      answerString = JSON.stringify(answer, null, 2);
    }

    // 1. Get question record (questionId from frontend points to existing question)
    if (!questionId) {
      return NextResponse.json({ error: 'Required parameter missing: questionId' }, { status: 400 });
    }

    const questionRecord = await prisma.questions.findUnique({
      where: { id: questionId }
    });

    if (!questionRecord) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Validate question belongs to this image
    if (questionRecord.imageId !== imageId) {
      return NextResponse.json({ error: 'Question does not belong to this image' }, { status: 400 });
    }

    // 2. Update question as answered
    await prisma.questions.update({
      where: { id: questionRecord.id },
      data: { answered: true }
    });

    // 3. Create ImageDataset record
    const dataset = await createImageDataset(projectId, {
      imageId: image.id,
      imageName: image.imageName,
      questionId: questionRecord.id,
      question,
      answer: answerString,
      answerType,
      model: 'manual',
      note: note || ''
    });

    return NextResponse.json({
      success: true,
      dataset,
      questionId: questionRecord.id
    });
  } catch (error) {
    console.error('Failed to create annotation:', error);
    return NextResponse.json({ error: error.message || 'Failed to create annotation' }, { status: 500 });
  }
}
