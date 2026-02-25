import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getImageDatasetsTagsByProject } from '@/lib/db/imageDatasets';

// Get all tags used in project
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Get all project datasets
    const datasets = await getImageDatasetsTagsByProject(projectId);

    console.log('datasets', datasets);

    // Extract all tags
    const tagsSet = new Set();
    datasets.forEach(dataset => {
      if (dataset.tags) {
        try {
          const tags = JSON.parse(dataset.tags);
          if (Array.isArray(tags)) {
            tags.forEach(tag => tagsSet.add(tag));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    // Convert to array and sort
    const tags = Array.from(tagsSet).sort();

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to get tags:', error);
    return NextResponse.json({ error: error.message || 'Failed to get tags' }, { status: 500 });
  }
}
