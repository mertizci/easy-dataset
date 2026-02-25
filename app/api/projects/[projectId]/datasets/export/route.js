import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import {
  getDatasets,
  getBalancedDatasetsByTags,
  getTagsWithDatasetCounts,
  getDatasetsBatch,
  getBalancedDatasetsByTagsBatch,
  getDatasetsByIds,
  getDatasetsByIdsBatch
} from '@/lib/db/datasets';

/**
 * Get export datasets
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }

    const confirmedParam = searchParams.get('confirmed');
    const confirmed = confirmedParam === null ? undefined : confirmedParam === 'true';

    // Get tag statistics
    const tagStats = await getTagsWithDatasetCounts(projectId, confirmed);
    return NextResponse.json(tagStats);
  } catch (error) {
    console.error('Failed to get tag statistics:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to get tag statistics'
      },
      { status: 500 }
    );
  }
}

/**
 * Get tag statistics
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

    let status = body.status;
    let confirmed = undefined;
    if (status === 'confirmed') confirmed = true;
    if (status === 'unconfirmed') confirmed = false;

    // Check if batch export mode
    const batchMode = body.batchMode ? 'true' : 'false';
    const offset = body.offset ?? 0;
    const batchSize = body.batchSize ?? 1000;

    // Check if balanced export
    const balanceMode = body.balanceMode ? 'true' : 'false';
    const balanceConfig = body.balanceConfig;

    // Check for selected dataset IDs
    const selectedIds = Array.isArray(body.selectedIds) ? body.selectedIds : null;

    if (batchMode === 'true') {
      // Batch export mode
      if (selectedIds && selectedIds.length > 0) {
        // Export by selected IDs in batches
        const datasets = await getDatasetsByIdsBatch(projectId, selectedIds, offset, batchSize);
        const hasMore = datasets.length === batchSize;
        return NextResponse.json({
          data: datasets,
          hasMore,
          offset: offset + datasets.length
        });
      } else if (balanceMode === 'true' && balanceConfig) {
        // Balanced batch export
        const parsedConfig = typeof balanceConfig === 'string' ? JSON.parse(balanceConfig) : balanceConfig;
        const result = await getBalancedDatasetsByTagsBatch(projectId, parsedConfig, confirmed, offset, batchSize);
        return NextResponse.json({
          data: result.data,
          hasMore: result.hasMore,
          offset: offset + result.data.length
        });
      } else {
        // Regular batch export
        const datasets = await getDatasetsBatch(projectId, confirmed, offset, batchSize);
        const hasMore = datasets.length === batchSize;
        return NextResponse.json({
          data: datasets,
          hasMore,
          offset: offset + datasets.length
        });
      }
    } else {
      // Legacy one-shot export mode (backward compatible)
      if (selectedIds && selectedIds.length > 0) {
        // Export by selected IDs
        const datasets = await getDatasetsByIds(projectId, selectedIds);
        return NextResponse.json(datasets);
      } else if (balanceMode === 'true' && balanceConfig) {
        // Balanced export mode
        const parsedConfig = typeof balanceConfig === 'string' ? JSON.parse(balanceConfig) : balanceConfig;
        const datasets = await getBalancedDatasetsByTags(projectId, parsedConfig, confirmed);
        return NextResponse.json(datasets);
      } else {
        // Regular export mode
        const datasets = await getDatasets(projectId, confirmed);
        return NextResponse.json(datasets);
      }
    }
  } catch (error) {
    console.error('Failed to get datasets:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to get datasets'
      },
      { status: 500 }
    );
  }
}
