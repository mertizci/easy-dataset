import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { deleteChunkById, getChunkById, updateChunkById } from '@/lib/db/chunks';

// Get chunk content
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId, chunkId } = params;
    // Validate params
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }
    if (!chunkId) {
      return NextResponse.json({ error: 'Text block ID cannot be empty' }, { status: 400 });
    }
    // Get chunk content
    const chunk = await getChunkById(chunkId);

    return NextResponse.json(chunk);
  } catch (error) {
    console.error('Failed to get text block content:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get text block content' }, { status: 500 });
  }
}

// Delete chunk
export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, chunkId } = params;
    // Validate params
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }
    if (!chunkId) {
      return NextResponse.json({ error: 'Text block ID cannot be empty' }, { status: 400 });
    }
    await deleteChunkById(chunkId);

    return NextResponse.json({ message: 'Text block deleted successfully' });
  } catch (error) {
    console.error('Failed to delete text block:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to delete text block' }, { status: 500 });
  }
}

// Edit chunk content
export async function PATCH(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, chunkId } = params;

    // Validate params
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    if (!chunkId) {
      return NextResponse.json({ error: 'Chunk ID is required' }, { status: 400 });
    }

    // Parse request body for new content
    const requestData = await request.json();
    const { content } = requestData;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    let res = await updateChunkById(chunkId, { content });
    return NextResponse.json(res);
  } catch (error) {
    console.error('Failed to edit chunk:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to edit chunk' }, { status: 500 });
  }
}
