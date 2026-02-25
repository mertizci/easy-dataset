import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getAllDatasetConversations } from '@/lib/db/dataset-conversations';

/**
 * Get all tags from project conversation datasets
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Fetch all project conversation datasets
    const conversations = await getAllDatasetConversations(projectId);

    // Extract all tags
    const allTags = new Set();

    conversations.forEach(conversation => {
      if (conversation.tags && typeof conversation.tags === 'string') {
        const tags = conversation.tags.split(/\s+/).filter(tag => tag.trim().length > 0);
        tags.forEach(tag => allTags.add(tag.trim()));
      }
    });

    return NextResponse.json({
      success: true,
      tags: Array.from(allTags).sort()
    });
  } catch (error) {
    console.error('Failed to fetch conversation tags:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}
