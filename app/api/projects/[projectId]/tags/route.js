import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getTags, createTag, updateTag, deleteTag } from '@/lib/db/tags';
import { getQuestionsByTagName } from '@/lib/db/questions';

// Get project tag tree
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get tag tree
    const tags = await getTags(projectId);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to get tag tree:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get tag tree' }, { status: 500 });
  }
}

// Update project tag tree
export async function PUT(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get request body
    const { tags } = await request.json();
    if (tags.id === undefined || tags.id === null || tags.id === '') {
      console.log('createTag', tags);
      let res = await createTag(projectId, tags.label, tags.parentId);
      return NextResponse.json({ tags: res });
    } else {
      let res = await updateTag(tags.label, tags.id);
      return NextResponse.json({ tags: res });
    }
  } catch (error) {
    console.error('Failed to update tags:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to update tags' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    const { tagName } = await request.json();
    console.log('tagName', tagName);
    let data = await getQuestionsByTagName(projectId, tagName);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to get tag tree:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get tag tree' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get tag ID to delete
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    console.log(`Deleting tag: ${id}`);
    const result = await deleteTag(id);
    console.log(`Tag deleted successfully: ${id}`);

    return NextResponse.json({ success: true, message: 'Tag deleted successfully', data: result });
  } catch (error) {
    console.error('Failed to delete tag:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to delete tag',
        success: false
      },
      { status: 500 }
    );
  }
}
