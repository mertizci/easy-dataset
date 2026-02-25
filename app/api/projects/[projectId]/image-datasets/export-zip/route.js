import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getImageDatasetsForExport } from '@/lib/db/imageDatasets';
import archiver from 'archiver';
import { getProjectPath } from '@/lib/db/base';
import path from 'path';
import fs from 'fs';

/**
 * Export image files as ZIP
 */
export async function GET(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params);
    if (auth.response) return auth.response;
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const confirmedOnly = searchParams.get('confirmedOnly') === 'true';

    // Validate project ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }

    // Get datasets (to determine which images are needed)
    const datasets = await getImageDatasetsForExport(projectId, confirmedOnly);

    if (!datasets || datasets.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 404 });
    }

    // Get all required image names
    const imageNames = new Set(datasets.map(d => d.imageName).filter(Boolean));

    if (imageNames.size === 0) {
      return NextResponse.json({ error: 'No images to export' }, { status: 404 });
    }

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Set response headers
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `images-${projectId}-${dateStr}.zip`;

    // Add image files to archive
    const projectPath = await getProjectPath(projectId);
    const imageDir = path.join(projectPath, 'images');

    if (!fs.existsSync(imageDir)) {
      return NextResponse.json({ error: 'Image directory not found' }, { status: 404 });
    }

    let addedCount = 0;
    for (const imageName of imageNames) {
      const imagePath = path.join(imageDir, imageName);
      if (fs.existsSync(imagePath)) {
        archive.file(imagePath, { name: imageName });
        addedCount++;
      }
    }

    if (addedCount === 0) {
      return NextResponse.json({ error: 'No image files found' }, { status: 404 });
    }

    // Finalize archive
    archive.finalize();

    // Return stream response
    return new NextResponse(archive, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    console.error('Failed to export images:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to export images'
      },
      { status: 500 }
    );
  }
}
