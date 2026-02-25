import { NextResponse } from 'next/server';
import { batchGenerateGaPairs } from '@/lib/services/ga/ga-pairs';
import { getUploadFileInfoById } from '@/lib/db/upload-files';

/**
 * Batch generate GA pairs for multiple files
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { fileIds, modelConfigId, language = 'en', appendMode = false } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'File IDs array is required' }, { status: 400 });
    }

    if (!modelConfigId) {
      return NextResponse.json({ error: 'Model configuration ID is required' }, { status: 400 });
    }

    console.log('Processing batch generate GA pairs request');
    console.log('Project ID:', projectId);
    console.log('Requested file IDs:', fileIds);

    // Validate files one by one using getUploadFileInfoById
    const validFiles = [];
    const invalidFileIds = [];

    for (const fileId of fileIds) {
      try {
        console.log(`Validating file: ${fileId}`);
        const fileInfo = await getUploadFileInfoById(fileId);

        if (fileInfo && fileInfo.projectId === projectId) {
          console.log(`File validated: ${fileInfo.fileName}`);
          validFiles.push(fileInfo);
        } else if (fileInfo) {
          console.log(`File belongs to another project: ${fileInfo.projectId} != ${projectId}`);
          invalidFileIds.push(fileId);
        } else {
          console.log(`File not found: ${fileId}`);
          invalidFileIds.push(fileId);
        }
      } catch (error) {
        console.error(`Error validating file ${fileId}:`, String(error));
        invalidFileIds.push(fileId);
      }
    }

    console.log(`File validation complete: ${validFiles.length} valid, ${invalidFileIds.length} invalid`);

    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid files found',
          debug: {
            projectId,
            requestedIds: fileIds,
            invalidIds: invalidFileIds,
            message: 'None of the requested files belong to this project or exist in the database'
          }
        },
        { status: 404 }
      );
    }

    // Batch generate GA pairs
    console.log('Starting batch GA pair generation...');
    console.log('Append mode:', appendMode);
    const results = await batchGenerateGaPairs(
      projectId,
      validFiles,
      modelConfigId,
      language,
      appendMode // Append mode param
    );

    // Count results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Batch generation complete: ${successCount} succeeded, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount,
        processed: validFiles.length,
        skipped: invalidFileIds.length
      },
      message: `Generated GA pairs for ${successCount} files, ${failureCount} failed, ${invalidFileIds.length} files not found`
    });
  } catch (error) {
    console.error('Error batch generating GA pairs:', String(error));
    return NextResponse.json({ error: String(error) || 'Failed to batch generate GA pairs' }, { status: 500 });
  }
}
