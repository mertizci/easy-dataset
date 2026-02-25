import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getProjectRoot } from '@/lib/db/base';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId, modelId } = params;

    // Validate project ID and model ID
    if (!projectId || !modelId) {
      return NextResponse.json({ error: 'The project ID and model ID cannot be empty' }, { status: 400 });
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
      return NextResponse.json({ error: 'The model configuration does not exist' }, { status: 404 });
    }

    // Read model config file
    const modelConfigData = await fs.readFile(modelConfigPath, 'utf-8');
    const modelConfig = JSON.parse(modelConfigData);

    // Find model by ID
    const model = modelConfig.find(model => model.id === modelId);

    if (!model) {
      return NextResponse.json({ error: 'The model does not exist' }, { status: 404 });
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error('Error getting model:', String(error));
    return NextResponse.json({ error: 'Failed to get model' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, modelId } = params;

    // Validate project ID and model ID
    if (!projectId || !modelId) {
      return NextResponse.json({ error: 'The project ID and model ID cannot be empty' }, { status: 400 });
    }

    // Get request body
    const modelData = await request.json();

    // Validate request body
    if (!modelData || !modelData.provider || !modelData.name) {
      return NextResponse.json({ error: 'The model data is incomplete' }, { status: 400 });
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

    // Read model config file
    let modelConfig = [];
    try {
      const modelConfigData = await fs.readFile(modelConfigPath, 'utf-8');
      modelConfig = JSON.parse(modelConfigData);
    } catch (error) {
      // If file does not exist, create empty array
    }

    // Update model data
    const modelIndex = modelConfig.findIndex(model => model.id === modelId);

    if (modelIndex >= 0) {
      // Update existing model
      modelConfig[modelIndex] = {
        ...modelConfig[modelIndex],
        ...modelData,
        id: modelId // Ensure ID unchanged
      };
    } else {
      // Add new model
      modelConfig.push({
        ...modelData,
        id: modelId
      });
    }

    // Write model config file
    await fs.writeFile(modelConfigPath, JSON.stringify(modelConfig, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Model configuration updated successfully' });
  } catch (error) {
    console.error('Error updating model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to update model configuration' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, modelId } = params;

    // Validate project ID and model ID
    if (!projectId || !modelId) {
      return NextResponse.json({ error: 'The project ID and model ID cannot be empty' }, { status: 400 });
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
      return NextResponse.json({ error: 'The model configuration does not exist' }, { status: 404 });
    }

    // Read model config file
    const modelConfigData = await fs.readFile(modelConfigPath, 'utf-8');
    let modelConfig = JSON.parse(modelConfigData);

    // Filter out model to delete
    const initialLength = modelConfig.length;
    modelConfig = modelConfig.filter(model => model.id !== modelId);

    // Check if model was found and deleted
    if (modelConfig.length === initialLength) {
      return NextResponse.json({ error: 'The model does not exist' }, { status: 404 });
    }

    // Write model config file
    await fs.writeFile(modelConfigPath, JSON.stringify(modelConfig, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting model:', String(error));
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}
