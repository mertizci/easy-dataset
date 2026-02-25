/**
 * 单个多轮对话数据集操作API
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
 * 获取单个多轮对话数据集详情
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

    // 如果是导航操作，返回导航项
    if (operateType !== null) {
      const data = await getConversationNavigationItems(projectId, conversationId, operateType);
      return NextResponse.json(data);
    }

    const conversation = await getDatasetConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: '对话数据集不存在'
        },
        { status: 404 }
      );
    }

    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: '对话数据集不属于指定项目'
        },
        { status: 403 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('获取多轮对话数据集详情失败:', error);
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
 * 更新多轮对话数据集
 * Reviewer: 仅允许更新 score
 */
export async function PUT(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const { projectId, conversationId } = params;
    const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
    if (accessError) return accessError;

    const body = await request.json();

    // 验证对话数据集是否存在且属于项目
    const conversation = await getDatasetConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: '对话数据集不存在'
        },
        { status: 404 }
      );
    }

    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: '对话数据集不属于指定项目'
        },
        { status: 403 }
      );
    }

    // Reviewer: 仅允许更新 score
    const ratingOnly = await isRatingOnlyUser(session.userId, projectId);
    const allowedFields = ratingOnly
      ? ['score']
      : ['score', 'tags', 'note', 'confirmed', 'aiEvaluation', 'messages'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (body.hasOwnProperty(field)) {
        if (field === 'messages') {
          // 将messages数组转换为rawMessages字符串存储
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
          message: '没有有效的更新字段'
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
    console.error('更新多轮对话数据集失败:', error);
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
 * 删除多轮对话数据集（仅 admin）
 */
export async function DELETE(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin only' }, { status: 403 });
    }

    const { projectId, conversationId } = params;

    // 验证对话数据集是否存在且属于项目
    const conversation = await getDatasetConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: '对话数据集不存在'
        },
        { status: 404 }
      );
    }

    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: '对话数据集不属于指定项目'
        },
        { status: 403 }
      );
    }

    await deleteDatasetConversation(conversationId);

    return NextResponse.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除多轮对话数据集失败:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}
