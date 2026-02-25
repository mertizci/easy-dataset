import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import fs from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/db/base';
import { getUploadFileInfoById } from '@/lib/db/upload-files';

// Get file content
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId, fileId } = params;

    // Validate params
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }

    // Get file info
    let fileInfo = await getUploadFileInfoById(fileId);
    if (!fileInfo) {
      return NextResponse.json({ error: 'file does not exist' }, { status: 400 });
    }

    // Get file path
    let filePath = path.join(fileInfo.path, fileInfo.fileName);
    if (fileInfo.fileExt !== '.md') {
      filePath = path.join(fileInfo.path, fileInfo.fileName.replace(/\.[^/.]+$/, '.md'));
    }
    // Read file
    const buffer = fs.readFileSync(filePath);

    const text = buffer.toString('utf-8');

    return NextResponse.json({
      fileId: fileId,
      fileName: fileInfo.fileName,
      content: text
    });
  } catch (error) {
    console.error('Failed to get text block content:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get text block content' }, { status: 500 });
  }
}
