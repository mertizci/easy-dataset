import { NextResponse } from 'next/server';
import { getDatasetsById, getDatasetsCounts, getNavigationItems, updateDatasetMetadata } from '@/lib/db/datasets';
import { requireAuth, requireProjectAccess, isRatingOnlyUser } from '@/lib/auth/apiGuard';

/**
 * 获取项目的所有数据集
 */
export async function GET(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const { projectId, datasetId } = params;
    const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
    if (accessError) return accessError;
    // 验证项目ID
    if (!projectId) {
      return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 });
    }
    if (!datasetId) {
      return NextResponse.json({ error: '数据集ID不能为空' }, { status: 400 });
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
    console.error('获取数据集详情失败:', String(error));
    return NextResponse.json(
      {
        error: error.message || '获取数据集详情失败'
      },
      { status: 500 }
    );
  }
}

/**
 * 更新数据集元数据（评分、标签、备注）
 * Reviewer: 仅允许更新 score
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

    // Reviewer: 仅允许更新 score
    const ratingOnly = await isRatingOnlyUser(session.userId, projectId);
    if (ratingOnly) {
      tags = undefined;
      note = undefined;
    }

    // 验证评分范围
    if (score !== undefined && (score < 0 || score > 5)) {
      return NextResponse.json({ error: '评分必须在0-5之间' }, { status: 400 });
    }

    // 验证标签格式（仅 admin）
    if (tags !== undefined && !Array.isArray(tags)) {
      return NextResponse.json({ error: '标签必须是数组格式' }, { status: 400 });
    }

    // 更新数据集元数据
    const updatedDataset = await updateDatasetMetadata(datasetId, { score, tags, note });

    return NextResponse.json({
      success: true,
      dataset: updatedDataset
    });
  } catch (error) {
    console.error('更新数据集元数据失败:', String(error));
    return NextResponse.json(
      {
        error: error.message || '更新数据集元数据失败'
      },
      { status: 500 }
    );
  }
}
