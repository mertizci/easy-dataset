import { NextResponse } from 'next/server';
import { getProject, updateProject, getTaskConfig } from '@/lib/db/projects';
import { requireProjectAuth } from '@/lib/auth/apiGuard';

// Get project configuration
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const projectId = params.projectId;
    const config = await getProject(projectId);
    const taskConfig = await getTaskConfig(projectId);
    return NextResponse.json({ ...config, ...taskConfig });
  } catch (error) {
    console.error('Failed to get project configuration:', String(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update project configuration
export async function PUT(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const projectId = params.projectId;
    const newConfig = await request.json();
    const currentConfig = await getProject(projectId);

    // Only update prompts section
    const updatedConfig = {
      ...currentConfig,
      ...newConfig.prompts
    };

    const config = await updateProject(projectId, updatedConfig);
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to update project configuration:', String(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
