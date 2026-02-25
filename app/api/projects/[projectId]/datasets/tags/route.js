import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getUsedCustomTags } from '@/lib/db/datasets';

/**
 * 获取项目中使用过的自定义标签
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // 验证项目ID
    if (!projectId) {
      return NextResponse.json({ error: '项目ID不能为空' }, { status: 400 });
    }

    const tags = await getUsedCustomTags(projectId);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('获取自定义标签失败:', String(error));
    return NextResponse.json(
      {
        error: error.message || '获取自定义标签失败'
      },
      { status: 500 }
    );
  }
}
