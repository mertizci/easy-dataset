import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import {
  getCustomPrompts,
  getCustomPrompt,
  saveCustomPrompt,
  deleteCustomPrompt,
  batchSaveCustomPrompts,
  toggleCustomPrompt,
  getPromptTemplates
} from '@/lib/db/custom-prompts';

// Get project custom prompts
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const promptType = searchParams.get('promptType');
    const language = searchParams.get('language');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const customPrompts = await getCustomPrompts(projectId, promptType, language);
    const templates = await getPromptTemplates();

    return NextResponse.json({
      success: true,
      customPrompts,
      templates
    });
  } catch (error) {
    console.error('Failed to fetch custom prompts:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Save custom prompt
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Batch save
    if (body.prompts && Array.isArray(body.prompts)) {
      const results = await batchSaveCustomPrompts(projectId, body.prompts);
      return NextResponse.json({
        success: true,
        results
      });
    }

    // Single save
    const { promptType, promptKey, language, content } = body;
    if (!promptType || !promptKey || !language || content === undefined) {
      return NextResponse.json(
        {
          error: 'promptType, promptKey, language and content are required'
        },
        { status: 400 }
      );
    }

    const result = await saveCustomPrompt(projectId, promptType, promptKey, language, content);
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Failed to save custom prompt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete custom prompt
export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const promptType = searchParams.get('promptType');
    const promptKey = searchParams.get('promptKey');
    const language = searchParams.get('language');

    if (!projectId || !promptType || !promptKey || !language) {
      return NextResponse.json(
        {
          error: 'projectId, promptType, promptKey and language are required'
        },
        { status: 400 }
      );
    }

    const success = await deleteCustomPrompt(projectId, promptType, promptKey, language);
    return NextResponse.json({
      success
    });
  } catch (error) {
    console.error('Failed to delete custom prompt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
