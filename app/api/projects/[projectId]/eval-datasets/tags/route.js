import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { db } from '@/lib/db/index';

/**
 * Get all evaluation dataset tags in the project
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Fetch tags for all datasets in the project
    const datasets = await db.evalDatasets.findMany({
      where: { projectId },
      select: { tags: true }
    });

    // Extract and de-duplicate tags
    const tagsSet = new Set();
    datasets.forEach(dataset => {
      if (dataset.tags) {
        // Support both English and Chinese commas
        const tags = dataset.tags
          .split(/[,，]/)
          .map(t => t.trim())
          .filter(Boolean);
        tags.forEach(tag => tagsSet.add(tag));
      }
    });

    return NextResponse.json({ tags: Array.from(tagsSet).sort() });
  } catch (error) {
    console.error('Failed to get tags:', error);
    return NextResponse.json({ error: error.message || 'Failed to get tags' }, { status: 500 });
  }
}
