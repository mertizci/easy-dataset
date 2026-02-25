// Get project details
import { NextResponse } from 'next/server';
import { deleteProject, getProject, updateProject, getTaskConfig } from '@/lib/db/projects';
import { requireAuth, requireProjectAccess } from '@/lib/auth/apiGuard';

export async function GET(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const { projectId } = params;
    const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
    if (accessError) return accessError;

    const project = await getProject(projectId);
    const taskConfig = await getTaskConfig(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ ...project, taskConfig });
  } catch (error) {
    console.error('Failed to get project details:', String(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Update project
export async function PUT(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin only' }, { status: 403 });
    }

    const { projectId } = params;
    const projectData = await request.json();

    const hasNameField = Object.prototype.hasOwnProperty.call(projectData, 'name');
    const hasDefaultModelField = Object.prototype.hasOwnProperty.call(projectData, 'defaultModelConfigId');

    // At least allow updating name or default model (defaultModelConfigId can be explicitly null)
    if (!hasNameField && !hasDefaultModelField) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    if (hasNameField && !projectData.name && !hasDefaultModelField) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const updatedProject = await updateProject(projectId, projectData);

    if (!updatedProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Failed to update project:', String(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// Delete project
export async function DELETE(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin only' }, { status: 403 });
    }

    const { projectId } = params;
    const success = await deleteProject(projectId);

    if (!success) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
