import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getProject } from '@/lib/db/projects';
import path from 'path';
import { getProjectRoot, ensureDir } from '@/lib/db/base';
import { promises as fs } from 'fs';
import {
  checkUploadFileInfoByMD5,
  createUploadFileInfo,
  delUploadFileInfoById,
  getUploadFilesPagination
} from '@/lib/db/upload-files';
import { getFileMD5 } from '@/lib/util/file';
import { batchSaveTags } from '@/lib/db/tags';
import { getProjectChunks, getProjectTocByName } from '@/lib/file/text-splitter';
import { handleDomainTree } from '@/lib/util/domain-tree';

// Replace the deprecated config export with the new export syntax
export const dynamic = 'force-dynamic';
// This tells Next.js not to parse the request body automatically
export const bodyParser = false;

// Get project file list
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 10; // 10 files per page
    const fileName = searchParams.get('fileName') || '';
    const getAllIds = searchParams.get('getAllIds') === 'true'; // Flag to get all file IDs

    // If requesting all file IDs, return ID list directly
    if (getAllIds) {
      const allFiles = await getUploadFilesPagination(projectId, 1, 9999, fileName); // Get all files
      const allFileIds = allFiles.data?.map(file => String(file.id)) || [];
      return NextResponse.json({ allFileIds });
    }
    // Get file list
    const files = await getUploadFilesPagination(projectId, page, pageSize, fileName);

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error obtaining file list:', String(error));
    return NextResponse.json({ error: error.message || 'Error obtaining file list' }, { status: 500 });
  }
}

// Delete file
export async function DELETE(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const domainTreeAction = searchParams.get('domainTreeAction') || 'keep';

    // Get model info and language from request body
    const requestData = await request.json();
    const model = requestData.model;
    const language = requestData.language || 'en';

    // Validate project ID and file name
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }

    if (!fileId) {
      return NextResponse.json({ error: 'The file name cannot be empty' }, { status: 400 });
    }

    // Get project info
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
    }

    // Delete file and related chunks, questions, datasets
    const { stats, fileName, fileInfo } = await delUploadFileInfoById(fileId);
    const deleteToc = await getProjectTocByName(projectId, fileName);
    try {
      const projectRoot = await getProjectRoot();
      const projectPath = path.join(projectRoot, projectId);
      const tocDir = path.join(projectPath, 'toc');
      const baseName = path.basename(fileInfo.fileName, path.extname(fileInfo.fileName));
      const tocPath = path.join(tocDir, `${baseName}-toc.json`);

      // Check file exists before delete
      await fs.unlink(tocPath);
      console.log(`Successfully deleted TOC file: ${tocPath}`);
    } catch (error) {
      console.error(`Failed to delete TOC file:`, String(error));
      // TOC file delete failure does not affect overall result
    }

    // If keep domain tree selected, return delete result directly
    if (domainTreeAction === 'keep') {
      return NextResponse.json({
        message: 'File deleted successfully',
        stats: stats,
        domainTreeAction: 'keep',
        cascadeDelete: true
      });
    }

    // Handle domain tree update
    try {
      // Get all project files
      const { chunks, toc } = await getProjectChunks(projectId);

      // If no chunks exist, project has no files
      if (!chunks || chunks.length === 0) {
        // Clear domain tree
        await batchSaveTags(projectId, []);
        return NextResponse.json({
          message: 'File deleted successfully, domain tree cleared',
          stats: stats,
          domainTreeAction,
          cascadeDelete: true
        });
      }

      // Call domain tree handler
      await handleDomainTree({
        projectId,
        action: domainTreeAction,
        allToc: toc,
        model,
        language,
        deleteToc,
        project
      });
    } catch (error) {
      console.error('Error updating domain tree after file deletion:', String(error));
      // Domain tree update failure does not affect file delete result
    }

    return NextResponse.json({
      message: 'File deleted successfully',
      stats: stats,
      domainTreeAction,
      cascadeDelete: true
    });
  } catch (error) {
    console.error('Error deleting file:', String(error));
    return NextResponse.json({ error: error.message || 'Error deleting file' }, { status: 500 });
  }
}

// Upload file
export async function POST(request, { params }) {
  const auth = await requireProjectAuth(request, params, { requireAdmin: true });
  if (auth.response) return auth.response;
  console.log('File upload request processing, parameters:', params);
  const { projectId } = params;

  // Validate project ID
  if (!projectId) {
    console.log('The project ID cannot be empty, returning 400 error');
    return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
  }

  // Get project info
  const project = await getProject(projectId);
  if (!project) {
    console.log('The project does not exist, returning 404 error');
    return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
  }
  console.log('Project information retrieved successfully:', project.name || project.id);

  try {
    console.log('Try using alternate methods for file upload...');

    // Check if request header contains file name
    const encodedFileName = request.headers.get('x-file-name');
    const fileName = encodedFileName ? decodeURIComponent(encodedFileName) : null;
    console.log('Get file name from request header:', fileName);

    if (!fileName) {
      console.log('The request header does not contain a file name');
      return NextResponse.json(
        { error: 'The request header does not contain a file name (x-file-name)' },
        { status: 400 }
      );
    }

    // Check file type
    if (!fileName.endsWith('.md') && !fileName.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only Markdown files are supported' }, { status: 400 });
    }

    // Read binary data from request body
    const fileBuffer = Buffer.from(await request.arrayBuffer());

    // Save file
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    const filesDir = path.join(projectPath, 'files');

    await ensureDir(filesDir);

    const filePath = path.join(filesDir, fileName);
    await fs.writeFile(filePath, fileBuffer);
    // Get file size
    const stats = await fs.stat(filePath);
    // Get file md5
    const md5 = await getFileMD5(filePath);
    // Get file extension
    const ext = path.extname(filePath);

    // let res = await checkUploadFileInfoByMD5(projectId, md5);
    // if (res) {
    //   return NextResponse.json({ error: `File [${fileName}] already exists in this project` }, { status: 400 });
    // }

    let fileInfo = await createUploadFileInfo({
      projectId,
      fileName,
      size: stats.size,
      md5,
      fileExt: ext,
      path: filesDir
    });

    console.log('The file upload process is complete, and a successful response is returned');
    return NextResponse.json({
      message: 'File uploaded successfully',
      fileName,
      filePath,
      fileId: fileInfo.id
    });
  } catch (error) {
    console.error('Error processing file upload:', String(error));
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'File upload failed: ' + (error.message || 'Unknown error')
      },
      { status: 500 }
    );
  }
}
