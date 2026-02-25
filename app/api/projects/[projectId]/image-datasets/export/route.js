import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getImageDatasetsForExport } from '@/lib/db/imageDatasets';

/**
 * Export image dataset
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const body = await request.json();

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }

    const confirmedOnly = body.confirmedOnly || false;

    // Get datasets
    const datasets = await getImageDatasetsForExport(projectId, confirmedOnly);

    return NextResponse.json(datasets);
  } catch (error) {
    console.error('Failed to export image datasets:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to export image datasets'
      },
      { status: 500 }
    );
  }
}
