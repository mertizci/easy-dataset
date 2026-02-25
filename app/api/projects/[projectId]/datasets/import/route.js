import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { createDataset } from '@/lib/db/datasets';
import { nanoid } from 'nanoid';

export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { datasets, sourceInfo } = await request.json();

    if (!datasets || !Array.isArray(datasets)) {
      return NextResponse.json({ error: 'Invalid datasets data' }, { status: 400 });
    }

    const results = [];
    const errors = [];
    let successCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < datasets.length; i++) {
      try {
        const dataset = datasets[i];

        // Safe get and sanitize fields
        const q = typeof dataset?.question === 'string' ? dataset.question.trim() : '';
        const a = typeof dataset?.answer === 'string' ? dataset.answer.trim() : '';

        // Validate required fields: skip if missing
        if (!q || !a) {
          errors.push(`Record ${i + 1}: missing required fields (question/answer), skipped`);
          skippedCount++;
          continue;
        }

        // Normalize optional fields
        const chunkName = dataset?.chunkName || 'Imported Data';
        const chunkContent = dataset?.chunkContent || 'Imported from external source';
        const model = dataset?.model || 'imported';
        const questionLabel = dataset?.questionLabel || '';
        const cot = typeof dataset?.cot === 'string' ? dataset.cot : '';
        const confirmed = typeof dataset?.confirmed === 'boolean' ? dataset.confirmed : false;
        const score = typeof dataset?.score === 'number' ? dataset.score : 0;
        // tags: support array/string/object
        let tags = '[]';
        if (Array.isArray(dataset?.tags)) {
          try {
            tags = JSON.stringify(dataset.tags);
          } catch {
            tags = '[]';
          }
        } else if (typeof dataset?.tags === 'string') {
          tags = dataset.tags;
        } else if (dataset?.tags && typeof dataset.tags === 'object') {
          try {
            tags = JSON.stringify(dataset.tags);
          } catch {
            tags = '[]';
          }
        }
        // other: object or string
        let other = '{}';
        if (typeof dataset?.other === 'string') {
          other = dataset.other;
        } else if (dataset?.other && typeof dataset.other === 'object') {
          try {
            other = JSON.stringify(dataset.other);
          } catch {
            other = '{}';
          }
        }
        const note = typeof dataset?.note === 'string' ? dataset.note : '';

        // Create dataset record
        const newDataset = await createDataset({
          projectId,
          questionId: nanoid(), // Generate unique question ID
          question: q,
          answer: a,
          chunkName,
          chunkContent,
          model,
          questionLabel,
          cot,
          confirmed,
          score,
          tags,
          note,
          other
        });

        results.push(newDataset);
        successCount++;
      } catch (error) {
        errors.push(`Record ${i + 1}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: successCount,
      total: datasets.length,
      failed: errors.length,
      skipped: skippedCount,
      errors,
      sourceInfo
    });
  } catch (error) {
    console.error('Import datasets error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
