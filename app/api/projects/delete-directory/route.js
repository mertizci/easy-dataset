import { getProjectRoot } from '@/lib/db/base';
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { requireAuth } from '@/lib/auth/apiGuard';

const rmdir = promisify(fs.rm);

/**
 * Delete project directory
 * @returns {Promise<Response>} Operation result response
 */
export async function POST(request) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin only' }, { status: 403 });
    }
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project ID is required'
        },
        { status: 400 }
      );
    }

    // Get project root directory
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);

    // Check if directory exists
    if (!fs.existsSync(projectPath)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project directory not found'
        },
        { status: 404 }
      );
    }

    // Recursively remove directory
    await rmdir(projectPath, { recursive: true, force: true });

    return NextResponse.json({
      success: true,
      message: 'Project directory deleted'
    });
  } catch (error) {
    console.error('Failed to delete project directory:', String(error));
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
