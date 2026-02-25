import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { saveChunks, deleteChunksByFileId } from '@/lib/db/chunks';
import path from 'path';
import fs from 'fs/promises';
import { getProjectRoot } from '@/lib/db/base';

/**
 * Handle custom split request
 * @param {Request} request - Request object
 * @param {Object} params - Route params
 * @returns {Promise<Response>} - Response object
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { fileId, fileName, content, splitPoints } = await request.json();

    // Parameter validation
    if (!projectId || !fileId || !fileName || !content || !splitPoints) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get project root
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);

    // Check if project exists
    try {
      await fs.access(projectPath);
    } catch (error) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }

    // Delete existing chunks for this file
    await deleteChunksByFileId(projectId, fileId);

    // Split file content by split points
    const customChunks = generateCustomChunks(projectId, fileId, fileName, content, splitPoints);

    // Save new chunks
    await saveChunks(customChunks);

    return NextResponse.json({
      success: true,
      message: 'Custom chunks saved successfully',
      totalChunks: customChunks.length
    });
  } catch (error) {
    console.error('Custom split processing error:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to process custom split request' }, { status: 500 });
  }
}

/**
 * Generate custom chunks from split points
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {string} fileName - File name
 * @param {string} content - File content
 * @param {Array} splitPoints - Split points array
 * @returns {Array} - Generated chunks array
 */
function generateCustomChunks(projectId, fileId, fileName, content, splitPoints) {
  // Sort split points by position
  const sortedPoints = [...splitPoints].sort((a, b) => a.position - b.position);

  // Create chunks
  const chunks = [];
  let startPos = 0;

  // Process each split point
  for (let i = 0; i < sortedPoints.length; i++) {
    const endPos = sortedPoints[i].position;

    // Extract current chunk content
    const chunkContent = content.substring(startPos, endPos);

    // Skip empty chunks
    if (chunkContent.trim().length === 0) {
      startPos = endPos;
      continue;
    }

    // Create chunk object
    const chunk = {
      projectId,
      name: `${path.basename(fileName, path.extname(fileName))}-part-${i + 1}`,
      fileId,
      fileName,
      content: chunkContent,
      summary: `${fileName} custom chunk ${i + 1}/${sortedPoints.length + 1}`,
      size: chunkContent.length
    };

    chunks.push(chunk);
    startPos = endPos;
  }

  // Add last chunk (if has content)
  const lastChunkContent = content.substring(startPos);
  if (lastChunkContent.trim().length > 0) {
    const lastChunk = {
      projectId,
      name: `${path.basename(fileName, path.extname(fileName))}-part-${sortedPoints.length + 1}`,
      fileId,
      fileName,
      content: lastChunkContent,
      summary: `${fileName} custom chunk ${sortedPoints.length + 1}/${sortedPoints.length + 1}`,
      size: lastChunkContent.length
    };

    chunks.push(lastChunk);
  }

  return chunks;
}
