import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getImageDetailWithQuestions } from '@/lib/services/images';

// Get image details by image ID, including question list and annotations
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId, imageId } = params;

    // Call service to get image details
    const imageData = await getImageDetailWithQuestions(projectId, imageId);

    return NextResponse.json({
      success: true,
      data: imageData
    });
  } catch (error) {
    console.error('Failed to get image details:', error);

    // Return different status codes by error type (service may throw Chinese)
    const errorMsgMap = {
      '缺少图片ID': 'Image ID is required',
      '图片不存在': 'Image not found',
      '图片不属于指定项目': 'Image does not belong to the specified project'
    };
    let statusCode = 500;
    if (error.message === '缺少图片ID' || error.message === 'Image ID is required') {
      statusCode = 400;
    } else if (error.message === '图片不存在' || error.message === 'Image not found') {
      statusCode = 404;
    } else if (error.message === '图片不属于指定项目' || error.message === 'Image does not belong to the specified project') {
      statusCode = 403;
    }
    const displayError = errorMsgMap[error.message] || error.message || 'Failed to get image details';

    return NextResponse.json({ error: displayError }, { status: statusCode });
  }
}
