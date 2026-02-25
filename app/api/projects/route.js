import { NextResponse } from 'next/server';
import { createProject, getProjects, isExistByName } from '@/lib/db/projects';
import { createInitModelConfig, getModelConfigByProjectId } from '@/lib/db/model-config';
import { requireAuth } from '@/lib/auth/apiGuard';

export async function POST(request) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin only' }, { status: 403 });
    }

    const projectData = await request.json();
    if (!projectData.name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    if (await isExistByName(projectData.name)) {
      return NextResponse.json({ error: 'Project name already exists' }, { status: 400 });
    }
    const newProject = await createProject(projectData);
    if (projectData.reuseConfigFrom) {
      let data = await getModelConfigByProjectId(projectData.reuseConfigFrom);

      let newData = data.map(item => {
        delete item.id;
        return {
          ...item,
          projectId: newProject.id
        };
      });
      await createInitModelConfig(newData);
    }
    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Failed to create project:', String(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const projects = await getProjects(session.userId);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Failed to get project list:', String(error));
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
