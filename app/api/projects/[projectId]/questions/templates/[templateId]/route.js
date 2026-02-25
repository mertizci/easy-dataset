import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import templateDb from '@/lib/db/questionTemplates';
import { generateQuestionsFromTemplateEdit } from '@/lib/services/questions/template';

// Get single template
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { templateId } = params;

    const template = await templateDb.getTemplateById(templateId);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Get usage stats
    const usageCount = await templateDb.getTemplateUsageCount(templateId);

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        usageCount
      }
    });
  } catch (error) {
    console.error('Failed to get template:', error);
    return NextResponse.json({ error: error.message || 'Failed to get template' }, { status: 500 });
  }
}

// Update question template
export async function PUT(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId, templateId } = params;
    const data = await request.json();

    const { question, sourceType, answerType, description, labels, customFormat, order, autoGenerate } = data;

    // Validate source type
    if (sourceType && !['image', 'text'].includes(sourceType)) {
      return NextResponse.json({ error: 'Invalid source type' }, { status: 400 });
    }

    // Validate answer type
    if (answerType && !['text', 'label', 'custom_format'].includes(answerType)) {
      return NextResponse.json({ error: 'Invalid answer type' }, { status: 400 });
    }

    const updateData = {};
    if (question !== undefined) updateData.question = question;
    if (sourceType !== undefined) updateData.sourceType = sourceType;
    if (answerType !== undefined) updateData.answerType = answerType;
    if (description !== undefined) updateData.description = description;
    if (labels !== undefined) updateData.labels = labels;
    if (customFormat !== undefined) updateData.customFormat = customFormat;
    if (order !== undefined) updateData.order = order;

    const template = await templateDb.updateTemplate(templateId, updateData);

    let generationResult = null;

    // If auto-generate enabled, create questions for data sources without this template
    if (autoGenerate) {
      try {
        generationResult = await generateQuestionsFromTemplateEdit(projectId, template);
      } catch (error) {
        console.error('Auto-generate questions failed in edit mode:', error);
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
    console.error('Failed to update template:', error);
    return NextResponse.json({ error: error.message || 'Failed to update template' }, { status: 500 });
  }
}

// Delete question template
export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { templateId } = params;

    // Check for linked questions
    const usageCount = await templateDb.getTemplateUsageCount(templateId);
    if (usageCount > 0) {
      return NextResponse.json({ error: `Template is used by ${usageCount} questions, cannot delete` }, { status: 400 });
    }

    await templateDb.deleteTemplate(templateId);

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete template' }, { status: 500 });
  }
}
