import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getProjectPath } from '@/lib/db/base';
import { importImagesFromDirectories } from '@/lib/services/images';
import fs from 'fs/promises';
import path from 'path';
import { savePdfAsImages } from '@/lib/util/file';

// Convert PDF to images and import
export async function POST(request, { params }) {
  let tempPdfPath = null;
  let tempImagesDir = null;

  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const formData = await request.formData();
    const pdfFile = formData.get('file');

    if (!pdfFile) {
      return NextResponse.json({ error: 'Please select a PDF file' }, { status: 400 });
    }

    if (!pdfFile.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const projectPath = await getProjectPath(projectId);
    const tempDir = path.join(projectPath, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // 1. Save PDF to temp directory
    tempPdfPath = path.join(tempDir, `temp_${Date.now()}_${pdfFile.name}`);
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    await fs.writeFile(tempPdfPath, pdfBuffer);

    // 2. Create temp images directory
    tempImagesDir = path.join(tempDir, `pdf_images_${Date.now()}`);
    await fs.mkdir(tempImagesDir, { recursive: true });

    // 3. Convert PDF to images with pdf2md-js
    console.log('Converting PDF to images...');
    const imagePaths = await savePdfAsImages(tempPdfPath, tempImagesDir, 3);
    console.log('PDF conversion complete, image count:', imagePaths.length);

    if (!imagePaths || imagePaths.length === 0) {
      throw new Error('PDF conversion failed, no images generated');
    }

    // 4. Call service to import images
    const importResult = await importImagesFromDirectories(projectId, [tempImagesDir]);

    // 5. Clean up temp files
    try {
      if (tempPdfPath) {
        await fs.unlink(tempPdfPath);
      }
      if (tempImagesDir) {
        const tempImages = await fs.readdir(tempImagesDir);
        for (const img of tempImages) {
          await fs.unlink(path.join(tempImagesDir, img));
        }
        await fs.rmdir(tempImagesDir);
      }
      const tempDirContents = await fs.readdir(tempDir);
      if (tempDirContents.length === 0) {
        await fs.rmdir(tempDir);
      }
    } catch (cleanupErr) {
      console.warn('Failed to clean up temp files:', cleanupErr);
    }

    return NextResponse.json({
      success: true,
      count: importResult.count,
      images: importResult.images,
      pdfName: pdfFile.name
    });
  } catch (error) {
    console.error('Failed to convert PDF:', error);

    // Clean up temp files
    try {
      if (tempPdfPath) {
        await fs.unlink(tempPdfPath).catch(() => {});
      }
      if (tempImagesDir) {
        const tempImages = await fs.readdir(tempImagesDir).catch(() => []);
        for (const img of tempImages) {
          await fs.unlink(path.join(tempImagesDir, img)).catch(() => {});
        }
        await fs.rmdir(tempImagesDir).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('Failed to clean up temp files:', cleanupErr);
    }

    return NextResponse.json({ error: error.message || 'Failed to convert PDF' }, { status: 500 });
  }
}
