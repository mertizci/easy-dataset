/**
 * Multi-turn conversation dataset management API
 */

import { NextResponse } from 'next/server';
import {
  getDatasetConversationsByPagination,
  getAllDatasetConversationIds,
  createDatasetConversation
} from '@/lib/db/dataset-conversations';
import { generateMultiTurnConversation } from '@/lib/services/multi-turn/index';
import { requireProjectAuth } from '@/lib/auth/apiGuard';

/**
 * Get multi-turn conversation dataset list (with pagination and filters)
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    const getAllIds = searchParams.get('getAllIds') === 'true'; // Flag to get all conversation IDs

    // Filter conditions
    const filters = {
      keyword: searchParams.get('keyword'),
      roleA: searchParams.get('roleA'),
      roleB: searchParams.get('roleB'),
      scenario: searchParams.get('scenario'),
      scoreMin: searchParams.get('scoreMin'),
      scoreMax: searchParams.get('scoreMax'),
      confirmed: searchParams.get('confirmed')
    };

    // Remove empty values
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    // If requesting all IDs
    if (getAllIds) {
      const allConversationIds = await getAllDatasetConversationIds(projectId, filters);
      return NextResponse.json({ allConversationIds });
    }

    // Normal paginated query
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const result = await getDatasetConversationsByPagination(projectId, page, pageSize, filters);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Failed to get multi-turn conversation dataset:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Create multi-turn conversation dataset
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const body = await request.json();

    const { questionId, systemPrompt, scenario, rounds, roleA, roleB, model, language = 'en' } = body;

    if (!questionId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Question ID is required'
        },
        { status: 400 }
      );
    }

    if (!model || !model.modelId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Model configuration is required'
        },
        { status: 400 }
      );
    }

    // Build config
    const config = {
      systemPrompt: systemPrompt || '',
      scenario: scenario || '',
      rounds: rounds || 3,
      roleA: roleA || 'User',
      roleB: roleB || 'Assistant',
      model,
      language
    };

    // Generate multi-turn conversation
    const result = await generateMultiTurnConversation(projectId, questionId, config);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Failed to create multi-turn conversation dataset:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}
