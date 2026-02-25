import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { distillTagsPrompt } from '@/lib/llm/prompts/distillTags';
import { db } from '@/lib/db';
import { getProject } from '@/lib/db/projects';

const LLMClient = require('@/lib/llm/core');

/**
 * Generate tags API: construct child tags by parent topic/tag
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { parentTag, parentTagId, tagPath, count = 10, model, language = 'zh' } = await request.json();

    if (!parentTag) {
      const errorMsg = language === 'en' ? 'Topic tag name cannot be empty' : 'Topic tag name is required';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // Query existing tags
    const existingTags = await db.tags.findMany({
      where: {
        projectId,
        parentId: parentTagId || null
      }
    });

    const existingTagNames = existingTags.map(tag => tag.label);

    // Create LLM client
    const llmClient = new LLMClient(model);

    // Generate prompt
    const prompt = await distillTagsPrompt(
      language,
      { tagPath, parentTag, existingTags: existingTagNames, count },
      projectId
    );

    // Call LLM to generate tags
    const { answer } = await llmClient.getResponseWithCOT(prompt);

    // Parse returned tags
    let tags = [];

    try {
      tags = JSON.parse(answer);
    } catch (error) {
      console.error('Failed to parse tag JSON:', String(error));
      // Try to extract tags with regex
      const matches = answer.match(/"([^"]+)"/g);
      if (matches) {
        tags = matches.map(match => match.replace(/"/g, ''));
      }
    }

    // Save tags to database
    const savedTags = [];
    for (let i = 0; i < tags.length; i++) {
      const tagName = tags[i];
      try {
        const tag = await db.tags.create({
          data: {
            label: tagName,
            projectId,
            parentId: parentTagId || null
          }
        });
        savedTags.push(tag);
      } catch (error) {
        console.error(`[Tag generation] Failed to save tag ${tagName}:`, String(error));
        throw error;
      }
    }
    return NextResponse.json(savedTags);
  } catch (error) {
    console.error('[Tag generation] Failed to generate tags:', String(error));
    console.error('[Tag generation] Error stack:', error.stack);
    return NextResponse.json({ error: error.message || 'Failed to generate tags' }, { status: 500 });
  }
}
