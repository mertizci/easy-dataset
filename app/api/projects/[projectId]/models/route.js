import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import path from 'path';
import fs from 'fs/promises';
import { getProjectRoot } from '@/lib/db/base';

// Get model config
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }

    // Get project root
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);

    // Check if project exists
    try {
      await fs.access(projectPath);
    } catch (error) {
      return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
    }

    // Get model config file path
    const modelConfigPath = path.join(projectPath, 'model-config.json');

    // Check if model config file exists
    try {
      await fs.access(modelConfigPath);
    } catch (error) {
      // If config file does not exist, return default config
      return NextResponse.json([]);
    }

    // Read model config file
    const modelConfigData = await fs.readFile(modelConfigPath, 'utf-8');
    const modelConfig = JSON.parse(modelConfigData);

    return NextResponse.json(modelConfig);
  } catch (error) {
    console.error('Error obtaining model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to obtain model configuration' }, { status: 500 });
  }
}

// Update model config
export async function PUT(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }

    // Get request body
    const modelConfig = await request.json();

    // Validate request body
    if (!modelConfig || !Array.isArray(modelConfig)) {
      return NextResponse.json({ error: 'The model configuration must be an array' }, { status: 400 });
    }

    // Get project root
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);

    // Check if project exists
    try {
      await fs.access(projectPath);
    } catch (error) {
      return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
    }

    // Get model config file path
    const modelConfigPath = path.join(projectPath, 'model-config.json');

    // Write model config file
    await fs.writeFile(modelConfigPath, JSON.stringify(modelConfig, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Model configuration updated successfully' });
  } catch (error) {
    console.error('Error updating model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to update model configuration' }, { status: 500 });
  }
}
