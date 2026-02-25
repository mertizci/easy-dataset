import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all tasks for project
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    // Optional params: task type and status
    const taskType = searchParams.get('taskType');
    const statusStr = searchParams.get('status');

    // Pagination params
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build query conditions
    const where = { projectId };

    if (taskType) {
      where.taskType = taskType;
    }

    if (statusStr && !isNaN(parseInt(statusStr))) {
      where.status = parseInt(statusStr);
    }

    // Get total task count
    const total = await prisma.task.count({ where });

    // Get task list, ordered by creation time desc, with pagination
    const tasks = await prisma.task.findMany({
      where,
      orderBy: {
        createAt: 'desc'
      },
      skip: page * limit,
      take: limit
    });

    return NextResponse.json({
      code: 0,
      data: tasks,
      total,
      page,
      limit,
      message: 'Task list retrieved successfully'
    });
  } catch (error) {
    console.error('Failed to get task list:', String(error));
    return NextResponse.json(
      {
        code: 500,
        error: 'Failed to get task list',
        message: error.message
      },
      { status: 500 }
    );
  }
}
