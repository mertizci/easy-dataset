import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { db } from '@/lib/db';

/**
 * Update tag API
 */
export async function PUT(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, tagId } = params;

    // Validate parameters
    if (!projectId || !tagId) {
      return NextResponse.json({ error: 'Project ID and Tag ID are required' }, { status: 400 });
    }

    const { label } = await request.json();

    if (!label || !label.trim()) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    // Check if tag exists
    const existingTag = await db.tags.findUnique({
      where: { id: tagId }
    });

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Check project ID matches
    if (existingTag.projectId !== projectId) {
      return NextResponse.json({ error: 'No permission to edit this tag' }, { status: 403 });
    }

    // Check if new tag name already exists (sibling tags)
    const duplicateTag = await db.tags.findFirst({
      where: {
        projectId,
        label: label.trim(),
        parentId: existingTag.parentId,
        id: { not: tagId }
      }
    });

    if (duplicateTag) {
      return NextResponse.json({ error: 'Sibling tag name already exists' }, { status: 400 });
    }

    // Update tag
    const updatedTag = await db.tags.update({
      where: { id: tagId },
      data: { label: label.trim() }
    });

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('[Tag edit] Failed to update tag:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to update tag' }, { status: 500 });
  }
}
