import { NextResponse } from 'next/server';
import { getImageDatasetById, updateImageDataset, deleteImageDataset } from '@/lib/db/imageDatasets';
import { getProjectPath } from '@/lib/db/base';
import { requireAuth, requireProjectAccess, isRatingOnlyUser } from '@/lib/auth/apiGuard';
import fs from 'fs/promises';
import path from 'path';

// 获取单个数据集详情
export async function GET(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const { projectId, datasetId } = params;
    const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
    if (accessError) return accessError;

    const dataset = await getImageDatasetById(datasetId);

    if (!dataset || dataset.projectId !== projectId) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // 获取项目路径
    const projectPath = await getProjectPath(projectId);

    // 读取图片 base64
    let base64 = null;
    try {
      const imagePath = path.join(projectPath, 'images', dataset.imageName);
      const imageBuffer = await fs.readFile(imagePath);
      const base64Data = imageBuffer.toString('base64');
      const ext = path.extname(dataset.imageName).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      base64 = `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error(`Failed to read image ${dataset.imageName}:`, error);
    }

    // 添加图片 base64
    const datasetWithImage = {
      ...dataset,
      base64
    };

    return NextResponse.json(datasetWithImage);
  } catch (error) {
    console.error('Failed to get dataset detail:', error);
    return NextResponse.json({ error: error.message || 'Failed to get dataset detail' }, { status: 500 });
  }
}

// 更新数据集
// Reviewer: 仅允许更新 score
export async function PUT(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;

    const { projectId, datasetId } = params;
    const { allowed, response: accessError } = await requireProjectAccess(session.userId, projectId);
    if (accessError) return accessError;

    let updates = await request.json();

    // 验证数据集存在且属于该项目
    const dataset = await getImageDatasetById(datasetId);
    if (!dataset || dataset.projectId !== projectId) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // Reviewer: 仅允许更新 score
    const ratingOnly = await isRatingOnlyUser(session.userId, projectId);
    if (ratingOnly) {
      updates = { score: updates.score };
    }

    // 更新数据集
    const updated = await updateImageDataset(datasetId, updates);

    // 获取项目路径
    const projectPath = await getProjectPath(projectId);

    // 读取图片 base64
    let base64 = null;
    try {
      const imagePath = path.join(projectPath, 'images', updated.imageName);
      const imageBuffer = await fs.readFile(imagePath);
      const base64Data = imageBuffer.toString('base64');
      const ext = path.extname(updated.imageName).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      base64 = `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error(`Failed to read image ${updated.imageName}:`, error);
    }

    // 添加图片 base64
    const updatedWithImage = {
      ...updated,
      base64
    };

    return NextResponse.json(updatedWithImage);
  } catch (error) {
    console.error('Failed to update dataset:', error);
    return NextResponse.json({ error: error.message || 'Failed to update dataset' }, { status: 500 });
  }
}

// 删除数据集（仅 admin）
export async function DELETE(request, { params }) {
  try {
    const { session, response: authError } = await requireAuth(request);
    if (authError) return authError;
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden', message: 'Admin only' }, { status: 403 });
    }

    const { projectId, datasetId } = params;

    // 验证数据集存在且属于该项目
    const dataset = await getImageDatasetById(datasetId);
    if (!dataset || dataset.projectId !== projectId) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    await deleteImageDataset(datasetId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete dataset:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete dataset' }, { status: 500 });
  }
}
