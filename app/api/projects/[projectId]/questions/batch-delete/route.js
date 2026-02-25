import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { batchDeleteQuestions } from '@/lib/db/questions';

// Batch delete questions
export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const body = await request.json();
    const { questionIds } = body;

    // Validate params
    if (questionIds.length === 0) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    // Delete questions
    await batchDeleteQuestions(questionIds);

    return NextResponse.json({ success: true, message: 'Delete successful' });
  } catch (error) {
    console.error('Delete failed:', String(error));
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
  }
}
