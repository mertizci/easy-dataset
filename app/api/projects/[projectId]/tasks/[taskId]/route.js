import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get task details
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId, taskId } = params;

    // Validate required params
    if (!projectId || !taskId) {
      return NextResponse.json(
        {
          code: 400,
          error: 'Missing required parameters'
        },
        { status: 400 }
      );
    }

    // Query task details
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        projectId
      }
    });

    if (!task) {
      return NextResponse.json(
        {
          code: 404,
          error: 'Task not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code: 0,
      data: task,
      message: 'Task details retrieved successfully'
    });
  } catch (error) {
    console.error('Failed to get task details:', String(error));
    return NextResponse.json(
      {
        code: 500,
        error: 'Failed to get task details',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// Update task status
export async function PATCH(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, taskId } = params;
    const data = await request.json();

    // Validate required params
    if (!projectId || !taskId) {
      return NextResponse.json(
        {
          code: 400,
          error: 'Missing required parameters'
        },
        { status: 400 }
      );
    }

    // Get fields to update
    const { status, completedCount, totalCount, detail, note, endTime } = data;

    // Build update data
    const updateData = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (completedCount !== undefined) {
      updateData.completedCount = completedCount;
    }

    if (totalCount !== undefined) {
      updateData.totalCount = totalCount;
    }

    if (detail !== undefined) {
      updateData.detail = detail;
    }

    if (note !== undefined) {
      updateData.note = note;
    }

    // Add end time when status becomes completed, failed, or interrupted
    if (status === 1 || status === 2 || status === 3) {
      updateData.endTime = endTime || new Date();
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId
      },
      data: updateData
    });

    return NextResponse.json({
      code: 0,
      data: updatedTask,
      message: 'Task status updated successfully'
    });
  } catch (error) {
    console.error('Failed to update task status:', String(error));
    return NextResponse.json(
      {
        code: 500,
        error: 'Failed to update task status',
        message: error.message
      },
      { status: 500 }
    );
  }
}

// Delete task
export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, taskId } = params;

    // Validate required params
    if (!projectId || !taskId) {
      return NextResponse.json(
        {
          code: 400,
          error: 'Missing required parameters'
        },
        { status: 400 }
      );
    }

    // Delete task
    await prisma.task.delete({
      where: {
        id: taskId,
        projectId
      }
    });

    return NextResponse.json({
      code: 0,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete task:', String(error));
    return NextResponse.json(
      {
        code: 500,
        error: 'Failed to delete task',
        message: error.message
      },
      { status: 500 }
    );
  }
}
