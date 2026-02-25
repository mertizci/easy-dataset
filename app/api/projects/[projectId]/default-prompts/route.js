import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';

// Get default prompt content
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { searchParams } = new URL(request.url);
    const promptType = searchParams.get('promptType');
    const promptKey = searchParams.get('promptKey');

    if (!promptType || !promptKey) {
      return NextResponse.json({ error: 'promptType and promptKey are required' }, { status: 400 });
    }

    // Dynamically import prompt module
    let promptModule;
    try {
      promptModule = await import(`@/lib/llm/prompts/${promptType}`);
    } catch (error) {
      return NextResponse.json({ error: `Prompt module ${promptType} not found` }, { status: 404 });
    }

    // Get specified prompt constant
    const promptContent = promptModule[promptKey];
    if (!promptContent) {
      return NextResponse.json({ error: `Prompt key ${promptKey} not found in module ${promptType}` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      content: promptContent,
      promptType,
      promptKey
    });
  } catch (error) {
    console.error('Failed to fetch default prompt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
