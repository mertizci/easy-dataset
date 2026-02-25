import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { splitProjectFile, getProjectChunks } from '@/lib/file/text-splitter';
import { getProject, updateProject } from '@/lib/db/projects';
import { getTags } from '@/lib/db/tags';
import { handleDomainTree } from '@/lib/util/domain-tree';

// Handle text split request
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Get request body
    const { fileNames, model, language, domainTreeAction = 'rebuild' } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Please Select Model' }, { status: 400 });
    }

    const project = await getProject(projectId);

    let result = {
      totalChunks: 0,
      chunks: [],
      toc: ''
    };
    for (let i = 0; i < fileNames.length; i++) {
      const fileName = fileNames[i];
      // Split text
      const { toc, chunks, totalChunks } = await splitProjectFile(projectId, fileName);
      result.toc += toc;
      result.chunks.push(...chunks);
      result.totalChunks += totalChunks;
      console.log(projectId, fileName, `Text split completed, ${domainTreeAction} domain tree`);
    }

    // Call domain tree handler
    const tags = await handleDomainTree({
      projectId,
      action: domainTreeAction,
      newToc: result.toc,
      model,
      language,
      fileNames,
      project
    });

    if (!tags && domainTreeAction !== 'keep') {
      await updateProject(projectId, { ...project });
      return NextResponse.json(
        { error: 'AI analysis failed, please check model configuration, delete file and retry!' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ...result, tags });
  } catch (error) {
    console.error('Text split error:', String(error));
    return NextResponse.json({ error: error.message || 'Text split failed' }, { status: 500 });
  }
}

// Get all text chunks in project
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get chunk details
    const result = await getProjectChunks(projectId, filter);

    const tags = await getTags(projectId);

    // Return chunk details and file result (single file)
    return NextResponse.json({
      chunks: result.chunks,
      ...result.fileResult, // Single file result, not array
      tags
    });
  } catch (error) {
    console.error('Failed to get text chunks:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get text chunks' }, { status: 500 });
  }
}
