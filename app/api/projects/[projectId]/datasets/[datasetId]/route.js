import { NextResponse } from 'next/server';
import { getDatasetsById, getDatasetsCounts, getNavigationItems, updateDatasetMetadata } from '@/lib/db/datasets';
import { requireAuth, requireProjectAccess, isRatingOnlyUser } from '@/lib/auth/apiGuard';

/**
 * Get all datasets for project
 */
export async function GET(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const { projectId, datasetId } = params;
    const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
    if (accessError) return accessError;
    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID is required' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const operateType = searchParams.get('operateType');
    if (operateType !== null) {
      const data = await getNavigationItems(projectId, datasetId, operateType);
      return NextResponse.json(data);
    }
    const datasets = await getDatasetsById(datasetId);
    let counts = await getDatasetsCounts(projectId);

    return NextResponse.json({ datasets, ...counts });
  } catch (error) {
    console.error('Failed to get dataset details:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to get dataset details'
      },
      { status: 500 }
    );
  }
}

/**
 * Update dataset metadata (score, tags, note)
 * Reviewer: only score updates allowed
 */
export async function PATCH(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const { projectId, datasetId } = params;
    const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
    if (accessError) return accessError;

    const body = await request.json();
    let { score, tags, note } = body;

    // Reviewer: only score updates allowed
    const ratingOnly = await isRatingOnlyUser(session.userId, projectId);
    if (ratingOnly) {
      tags = undefined;
      note = undefined;
    }

    // Validate score range
    if (score !== undefined && (score < 0 || score > 5)) {
      return NextResponse.json({ error: 'Score must be between 0 and 5' }, { status: 400 });
    }

    // Validate tags format (admin only)
    if (tags !== undefined && !Array.isArray(tags)) {
      return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 });
    }

    // Update dataset metadata
    const updatedDataset = await updateDatasetMetadata(datasetId, { score, tags, note });

    return NextResponse.json({
      success: true,
      dataset: updatedDataset
    });
  } catch (error) {
    console.error('Failed to update dataset metadata:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to update dataset metadata'
      },
      { status: 500 }
    );
  }
}
