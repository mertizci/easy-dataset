import { NextResponse } from 'next/server';
import { getUploadFileInfoById } from '@/lib/db/upload-files';
import { createGaPairs, getGaPairsByFileId } from '@/lib/db/ga-pairs';

/**
 * Batch manually add GA pairs to multiple files
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { fileIds, gaPair, appendMode = false } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'File IDs array is required' }, { status: 400 });
    }

    if (!gaPair || !gaPair.genreTitle || !gaPair.audienceTitle) {
      return NextResponse.json({ error: 'GA pair with genreTitle and audienceTitle is required' }, { status: 400 });
    }

    console.log('Processing batch manual add GA pairs request');
    console.log('Project ID:', projectId);
    console.log('Requested file IDs:', fileIds);
    console.log('GA pair:', gaPair);

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

    // Batch manually add GA pairs
    console.log('Starting batch manual add GA pairs...');
    console.log('Append mode:', appendMode);
    const results = [];

    for (const file of validFiles) {
      try {
        console.log(`Processing file: ${file.fileName}`);

        // Check if GA pairs already exist
        const existingPairs = await getGaPairsByFileId(file.id);

        let pairNumber = 1;
        if (appendMode && existingPairs && existingPairs.length > 0) {
          // Append mode: add after existing GA pairs
          pairNumber = existingPairs.length + 1;
        } else if (!appendMode && existingPairs && existingPairs.length > 0) {
          // Non-append mode: skip if GA pairs already exist
          console.log(`File ${file.fileName} already has GA pairs, skipping`);
          results.push({
            fileId: file.id,
            fileName: file.fileName,
            success: true,
            skipped: true,
            message: 'GA pairs already exist'
          });
          continue;
        }

        // Create GA pair data
        const gaPairData = [
          {
            projectId,
            fileId: file.id,
            pairNumber,
            genreTitle: gaPair.genreTitle.trim(),
            genreDesc: gaPair.genreDesc?.trim() || '',
            audienceTitle: gaPair.audienceTitle.trim(),
            audienceDesc: gaPair.audienceDesc?.trim() || '',
            isActive: true
          }
        ];

        // Save GA pairs
        if (appendMode) {
          // Append mode: only create new GA pairs
          await createGaPairs(gaPairData);
        } else {
          // Non-append mode: use saveGaPairs to replace existing
          const { saveGaPairs } = await import('@/lib/db/ga-pairs');
          await saveGaPairs(projectId, file.id, [
            {
              genre: { title: gaPair.genreTitle.trim(), description: gaPair.genreDesc?.trim() || '' },
              audience: { title: gaPair.audienceTitle.trim(), description: gaPair.audienceDesc?.trim() || '' }
            }
          ]);
        }

        results.push({
          fileId: file.id,
          fileName: file.fileName,
          success: true,
          skipped: false,
          message: 'GA pair added successfully'
        });

        console.log(`GA pair added successfully for file ${file.fileName}`);
      } catch (error) {
        console.error(`Failed to add GA pair for file ${file.fileName}:`, error);
        results.push({
          fileId: file.id,
          fileName: file.fileName,
          success: false,
          skipped: false,
          error: error.message,
          message: `Failed: ${error.message}`
        });
      }
    }

    // Count results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Batch manual add complete: ${successCount} succeeded, ${failureCount} failed`);

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
      message: `Added GA pairs to ${successCount} files, ${failureCount} failed, ${invalidFileIds.length} files not found`
    });
  } catch (error) {
    console.error('Error batch adding manual GA pairs:', String(error));
    return NextResponse.json({ error: String(error) || 'Failed to batch add manual GA pairs' }, { status: 500 });
  }
}
