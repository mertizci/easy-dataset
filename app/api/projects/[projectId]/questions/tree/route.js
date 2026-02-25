import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getQuestionsForTree, getQuestionsByTag } from '@/lib/db/questions';

/**
 * Get project question tree view data
 * @param {Request} request - Request object
 * @param {Object} params - Route params
 * @returns {Promise<Response>} - Response with question data
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const input = searchParams.get('input');
    const tagsOnly = searchParams.get('tagsOnly') === 'true';
    const isDistill = searchParams.get('isDistill') === 'true';
    // Exclude image questions by default, override with excludeImage=false
    const excludeImage = searchParams.get('excludeImage') !== 'false';

    if (tag) {
      // Get questions by tag (full fields)
      const questions = await getQuestionsByTag(projectId, tag, input, isDistill, excludeImage);
      return NextResponse.json(questions);
    } else if (tagsOnly) {
      // Get tags only (id and label fields)
      const treeData = await getQuestionsForTree(projectId, input, isDistill, excludeImage);
      return NextResponse.json(treeData);
    } else {
      // Legacy: get tree view data (id and label fields)
      const treeData = await getQuestionsForTree(projectId, null, isDistill, excludeImage);
      return NextResponse.json(treeData);
    }
  } catch (error) {
    console.error('Failed to get question tree data:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get question tree data' }, { status: 500 });
  }
}
