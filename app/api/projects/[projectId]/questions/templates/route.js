import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import templateDb from '@/lib/db/questionTemplates';
import { generateQuestionsFromTemplate, checkTemplateGenerationAvailability } from '@/lib/services/questions/template';

// Get question template list
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const sourceType = searchParams.get('sourceType');
    const search = searchParams.get('search');

    const templates = await templateDb.getTemplates(projectId, { sourceType, search });

    // Get usage stats
    const templateIds = templates.map(t => t.id);
    const usageCounts = await templateDb.getTemplatesUsageCount(templateIds);

    // Add usage stats to template data
    const templatesWithUsage = templates.map(template => ({
      ...template,
      usageCount: usageCounts[template.id] || 0
    }));

    return NextResponse.json({
      success: true,
      templates: templatesWithUsage
    });
  } catch (error) {
    console.error('Failed to get templates:', error);
    return NextResponse.json({ error: error.message || 'Failed to get templates' }, { status: 500 });
  }
}

// Create question template
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const data = await request.json();

    const { question, sourceType, answerType, description, labels, customFormat, order, autoGenerate } = data;

    // Validate required fields
    if (!question || !sourceType || !answerType) {
      return NextResponse.json({ error: 'Required parameters missing: question, sourceType, answerType' }, { status: 400 });
    }

    // Validate source type
    if (!['image', 'text'].includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid source type' }, { status: 400 });
    }

    // Validate answer type
    if (!['text', 'label', 'custom_format'].includes(answerType)) {
      return NextResponse.json({ error: 'Invalid answer type' }, { status: 400 });
    }

    // If label type, validate labels
    if (answerType === 'label' && (!labels || !Array.isArray(labels) || labels.length === 0)) {
      return NextResponse.json({ error: 'Label type questions must provide labels list' }, { status: 400 });
    }

    // If custom format, validate customFormat
    if (answerType === 'custom_format' && !customFormat) {
      return NextResponse.json({ error: 'Custom format questions must provide format definition' }, { status: 400 });
    }

    const template = await templateDb.createTemplate(projectId, {
      question,
      sourceType,
      answerType,
      description,
      labels: answerType === 'label' ? labels : [],
      customFormat: answerType === 'custom_format' ? customFormat : null,
      order: order || 0
    });

    let generationResult = null;

    // If auto-generate enabled, create questions for all related data sources
    if (autoGenerate) {
      try {
        // Check for available data sources first
        const availability = await checkTemplateGenerationAvailability(projectId, sourceType);

        if (availability.available) {
          generationResult = await generateQuestionsFromTemplate(projectId, template);
        } else {
          generationResult = {
            success: false,
            successCount: 0,
            failCount: 0,
            message: availability.message
          };
        }
      } catch (error) {
        console.error('Auto-generate questions failed:', error);
        generationResult = {
          success: false,
          successCount: 0,
          failCount: 0,
          message: 'Error occurred while auto-generating questions'
        };
      }
    }

    return NextResponse.json({
      success: true,
      template,
      generation: generationResult
    });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json({ error: error.message || 'Failed to create template' }, { status: 500 });
  }
}
