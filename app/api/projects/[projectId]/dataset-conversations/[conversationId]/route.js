/**
 * Single multi-turn conversation dataset operations API
 */

import { NextResponse } from 'next/server';
import {
  getDatasetConversationById,
  updateDatasetConversation,
  deleteDatasetConversation,
  getConversationNavigationItems
} from '@/lib/db/dataset-conversations';
import { requireAuth, requireProjectAccess, isRatingOnlyUser } from '@/lib/auth/apiGuard';

/**
 * Get single multi-turn conversation dataset details
 */
export async function GET(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const { projectId, conversationId } = params;
    const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
    if (accessError) return accessError;
    const { searchParams } = new URL(request.url);
    const operateType = searchParams.get('operateType');

    // If navigation operation, return navigation items
    if (operateType !== null) {
      const data = await getConversationNavigationItems(projectId, conversationId, operateType);
      return NextResponse.json(data);
    }

    const conversation = await getDatasetConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation dataset not found'
        },
        { status: 404 }
      );
    }

    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation dataset does not belong to the specified project'
        },
        { status: 403 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Failed to get conversation dataset details:', error);
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
 * Update multi-turn conversation dataset
 * Reviewer: only score updates allowed
 */
export async function PUT(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const { projectId, conversationId } = params;
    const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
    if (accessError) return accessError;

    const body = await request.json();

    // Verify conversation dataset exists and belongs to project
    const conversation = await getDatasetConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation dataset not found'
        },
        { status: 404 }
      );
    }

    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation dataset does not belong to the specified project'
        },
        { status: 403 }
      );
    }

    // Reviewer: only score updates allowed
    const ratingOnly = await isRatingOnlyUser(session.userId, projectId);
    const allowedFields = ratingOnly
      ? ['score']
      : ['score', 'tags', 'note', 'confirmed', 'aiEvaluation', 'messages'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (body.hasOwnProperty(field)) {
        if (field === 'messages') {
          // Convert messages array to rawMessages string for storage
          updateData['rawMessages'] = JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No valid update fields'
        },
        { status: 400 }
      );
    }

    const updatedConversation = await updateDatasetConversation(conversationId, updateData);

    return NextResponse.json({
      success: true,
      data: updatedConversation
    });
  } catch (error) {
    console.error('Failed to update conversation dataset:', error);
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
 * Delete multi-turn conversation dataset (admin only)
 */
export async function DELETE(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin only' }, { status: 403 });
    }

    const { projectId, conversationId } = params;

    // Verify conversation dataset exists and belongs to project
    const conversation = await getDatasetConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation dataset not found'
        },
        { status: 404 }
      );
    }

    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Conversation dataset does not belong to the specified project'
        },
        { status: 403 }
      );
    }

    await deleteDatasetConversation(conversationId);

    return NextResponse.json({
      success: true,
      message: 'Deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete conversation dataset:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}
