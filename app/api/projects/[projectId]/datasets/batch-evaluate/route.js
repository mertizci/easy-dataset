/**
 * Batch dataset evaluation task API
 * Create async task for batch dataset quality evaluation
 */

import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { db } from '@/lib/db/index';
import { processTask } from '@/lib/services/tasks/index';

/**
 * Create batch dataset evaluation task
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { model, language = 'zh-CN' } = await request.json();

    if (!projectId) {
      return NextResponse.json({ success: false, message: 'Project ID is required' }, { status: 400 });
    }

    if (!model || !model.modelId) {
      return NextResponse.json({ success: false, message: 'Model configuration is required' }, { status: 400 });
    }

    // Create batch evaluation task
    const newTask = await db.task.create({
      data: {
        projectId,
        taskType: 'dataset-evaluation',
        status: 0, // Initial: processing
        modelInfo: JSON.stringify(model),
        language: language || 'zh-CN',
        detail: '',
        totalCount: 0,
        note: 'Preparing to batch evaluate dataset quality...',
        completedCount: 0
      }
    });

    // Process task asynchronously
    processTask(newTask.id).catch(err => {
      console.error(`Batch evaluation task failed to start: ${newTask.id}`, String(err));
    });

    return NextResponse.json({
      success: true,
      message: 'Batch evaluation task created',
      data: { taskId: newTask.id }
    });
  } catch (error) {
    console.error('Failed to create batch evaluation task:', error);
    return NextResponse.json({ success: false, message: `Failed to create task: ${error.message}` }, { status: 500 });
  }
}
