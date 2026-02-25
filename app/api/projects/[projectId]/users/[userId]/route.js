import { NextResponse } from 'next/server';
import { removeProjectUserAccess } from '@/lib/db/project-user-access';
import { requireProjectAuth } from '@/lib/auth/apiGuard';

export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;

    const { projectId, userId } = params;
    await removeProjectUserAccess(projectId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove project user failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
