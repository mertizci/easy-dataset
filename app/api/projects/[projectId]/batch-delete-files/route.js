import { NextResponse } from 'next/server';
import { getUploadFileInfoById, delUploadFileInfoById } from '@/lib/db/upload-files';
import { getProject } from '@/lib/db/projects';
import { getProjectChunks, getProjectTocByName } from '@/lib/file/text-splitter';
import { batchSaveTags } from '@/lib/db/tags';
import { handleDomainTree } from '@/lib/util/domain-tree';
import path from 'path';
import { getProjectRoot } from '@/lib/db/base';
import { promises as fs } from 'fs';

/**
 * Batch delete files
 * Reuses full single-file delete logic including domain tree revision
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { fileIds, domainTreeAction = 'keep', model, language = 'en' } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'File IDs array is required' }, { status: 400 });
    }

    console.log('Processing batch delete files request');
    console.log('Project ID:', projectId);
    console.log('Requested file IDs:', fileIds);
    console.log('Domain tree action:', domainTreeAction);

    // Get project info
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
    }

    // Validate and delete files
    const results = [];
    const deletedTocs = [];
    let deletedCount = 0;
    let failedCount = 0;
    let totalStats = {
      deletedChunks: 0,
      deletedQuestions: 0,
      deletedDatasets: 0
    };

    for (const fileId of fileIds) {
      try {
        console.log(`Validating file: ${fileId}`);
        const fileInfo = await getUploadFileInfoById(fileId);

        if (!fileInfo) {
          console.log(`File not found: ${fileId}`);
          results.push({
            fileId,
            success: false,
            error: 'File not found'
          });
          failedCount++;
          continue;
        }

        if (fileInfo.projectId !== projectId) {
          console.log(`File belongs to another project: ${fileInfo.projectId} != ${projectId}`);
          results.push({
            fileId,
            success: false,
            error: 'File belongs to another project'
          });
          failedCount++;
          continue;
        }

        // Delete file and related chunks, questions, datasets
        console.log(`Deleting file: ${fileInfo.fileName}`);
        const { stats, fileName } = await delUploadFileInfoById(fileId);

        // Accumulate stats
        totalStats.deletedChunks += stats.deletedChunks || 0;
        totalStats.deletedQuestions += stats.deletedQuestions || 0;
        totalStats.deletedDatasets += stats.deletedDatasets || 0;

        // Get and save deleted TOC info
        const deleteToc = await getProjectTocByName(projectId, fileName);
        if (deleteToc) {
          deletedTocs.push(deleteToc);
        }

        // Delete TOC file
        try {
          const projectRoot = await getProjectRoot();
          const projectPath = path.join(projectRoot, projectId);
          const tocDir = path.join(projectPath, 'toc');
          const baseName = path.basename(fileInfo.fileName, path.extname(fileInfo.fileName));
          const tocPath = path.join(tocDir, `${baseName}-toc.json`);
          await fs.unlink(tocPath);
          console.log(`TOC file deleted successfully: ${tocPath}`);
        } catch (error) {
          console.error(`Failed to delete TOC file:`, String(error));
        }

        results.push({
          fileId,
          fileName: fileInfo.fileName,
          success: true,
          stats
        });
        deletedCount++;

        console.log(`File deleted successfully: ${fileInfo.fileName}`);
      } catch (error) {
        console.error(`Error deleting file ${fileId}:`, error);
        results.push({
          fileId,
          success: false,
          error: error.message
        });
        failedCount++;
      }
    }

    console.log(`Batch delete complete: ${deletedCount} succeeded, ${failedCount} failed`);

    // If keep domain tree selected, return delete result directly
    if (domainTreeAction === 'keep') {
      return NextResponse.json({
        success: true,
        deletedCount,
        failedCount,
        total: fileIds.length,
        results,
        stats: totalStats,
        domainTreeAction: 'keep',
        message: `Successfully deleted ${deletedCount} files, ${failedCount} failed`
      });
    }

    // Handle domain tree update
    try {
      // Get all project files
      const { chunks, toc } = await getProjectChunks(projectId);

      // If no chunks, project has no files left
      if (!chunks || chunks.length === 0) {
        // Clear domain tree
        await batchSaveTags(projectId, []);
        return NextResponse.json({
          success: true,
          deletedCount,
          failedCount,
          total: fileIds.length,
          results,
          stats: totalStats,
          domainTreeAction,
          message: `Successfully deleted ${deletedCount} files, domain tree cleared`,
          domainTreeCleared: true
        });
      }

      // Call domain tree handler
      await handleDomainTree({
        projectId,
        action: domainTreeAction,
        allToc: toc,
        model: model,
        language,
        deleteToc: deletedTocs.length > 0 ? deletedTocs : undefined,
        project
      });

      console.log('Domain tree updated successfully');
    } catch (error) {
      console.error('Error updating domain tree after batch deletion:', String(error));
      // Domain tree update failure does not affect file delete result
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      failedCount,
      total: fileIds.length,
      results,
      stats: totalStats,
      domainTreeAction,
      message: `Successfully deleted ${deletedCount} files, ${failedCount} failed`
    });
  } catch (error) {
    console.error('Error batch deleting files:', String(error));
    return NextResponse.json({ error: String(error) || 'Failed to batch delete files' }, { status: 500 });
  }
}
