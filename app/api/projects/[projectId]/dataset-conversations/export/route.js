/**
 * Multi-turn conversation dataset export API
 * Exports raw ShareGPT format dataset
 */

import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getAllDatasetConversations } from '@/lib/db/dataset-conversations';

/**
 * Export multi-turn conversation dataset
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    // Filter conditions
    const filters = {
      confirmed: searchParams.get('confirmed')
    };

    // Remove empty values
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    // Fetch all conversation datasets
    const conversations = await getAllDatasetConversations(projectId, filters);

    if (conversations.length === 0) {
      return NextResponse.json([]);
    }

    // Convert to ShareGPT format array
    const shareGptData = [];

    for (const conversation of conversations) {
      try {
        // Parse rawMessages
        const messages = JSON.parse(conversation.rawMessages || '[]');

        if (messages.length > 0) {
          // Build ShareGPT format object
          const shareGptItem = {
            messages: messages
          };

          shareGptData.push(shareGptItem);
        }
      } catch (error) {
        console.error(`Failed to parse conversation messages ${conversation.id}:`, error);
        // Skip failed conversations, continue with others
        continue;
      }
    }

    return NextResponse.json(shareGptData);
  } catch (error) {
    console.error('Failed to export conversation dataset:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}
