import { NextResponse } from 'next/server';
import {
  deleteDataset,
  getDatasetsByPagination,
  getDatasetsIds,
  getDatasetsById,
  updateDataset
} from '@/lib/db/datasets';
import datasetService from '@/lib/services/datasets';
import { requireProjectAuth } from '@/lib/auth/apiGuard';

// Chain-of-thought optimization moved to service layer

/**
 * Generate dataset (generate answer for single question)
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { questionId, model, language } = await request.json();

    // Use dataset generation service
    const result = await datasetService.generateDatasetForQuestion(projectId, questionId, {
      model,
      language
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to generate dataset:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate dataset'
      },
      { status: 500 }
    );
  }
}

/**
 * Get all datasets for project
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    const page = parseInt(searchParams.get('page')) || 1;
    const size = parseInt(searchParams.get('size')) || 10;
    const input = searchParams.get('input');
    const field = searchParams.get('field') || 'question';
    const status = searchParams.get('status');
    const hasCot = searchParams.get('hasCot');
    const isDistill = searchParams.get('isDistill');
    const scoreRange = searchParams.get('scoreRange');
    const customTag = searchParams.get('customTag');
    const noteKeyword = searchParams.get('noteKeyword');
    const chunkName = searchParams.get('chunkName');
    let confirmed = undefined;
    if (status === 'confirmed') confirmed = true;
    if (status === 'unconfirmed') confirmed = false;

    let selectedAll = searchParams.get('selectedAll');

    if (selectedAll) {
      let data = await getDatasetsIds(
        projectId,
        confirmed,
        input,
        field,
        hasCot,
        isDistill,
        scoreRange,
        customTag,
        noteKeyword,
        chunkName
      );
      return NextResponse.json(data);
    }

    // Get datasets
    const datasets = await getDatasetsByPagination(
      projectId,
      page,
      size,
      confirmed,
      input,
      field, // Search field param
      hasCot, // Chain-of-thought filter param
      isDistill, // Distilled dataset filter param
      scoreRange, // Score range filter param
      customTag, // Custom tag filter param
      noteKeyword, // Note keyword filter param
      chunkName // Chunk name filter param
    );

    return NextResponse.json(datasets);
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

/**
 * Delete dataset
 */
export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('id');
    if (!datasetId) {
      return NextResponse.json(
        {
          error: 'Dataset ID cannot be empty'
        },
        { status: 400 }
      );
    }

    const dataset = await getDatasetsById(datasetId);
    if (dataset && dataset.projectId !== params.projectId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteDataset(datasetId);

    return NextResponse.json({
      success: true,
      message: 'Dataset deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete dataset:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to delete dataset'
      },
      { status: 500 }
    );
  }
}

/**
 * Edit dataset
 */
export async function PATCH(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('id');
    const { answer, cot, question, confirmed } = await request.json();
    if (!datasetId) {
      return NextResponse.json(
        {
          error: 'Dataset ID cannot be empty'
        },
        { status: 400 }
      );
    }
    // Get all datasets
    let dataset = await getDatasetsById(datasetId);
    if (!dataset) {
      return NextResponse.json(
        {
          error: 'Dataset does not exist'
        },
        { status: 404 }
      );
    }
    let data = { id: datasetId };
    if (confirmed !== undefined) data.confirmed = confirmed;
    if (answer) data.answer = answer;
    if (cot) data.cot = cot;
    if (question) data.question = question;

    // Save updated dataset list
    await updateDataset(data);

    return NextResponse.json({
      success: true,
      message: 'Dataset updated successfully',
      dataset: dataset
    });
  } catch (error) {
    console.error('Failed to update dataset:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to update dataset'
      },
      { status: 500 }
    );
  }
}
