import { NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { getProjectPath } from '@/lib/db/base';
import { importImagesFromDirectories } from '@/lib/services/images';
import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';

// Extract ZIP and import images
export async function POST(request, { params }) {
  let tempZipPath = null;
  let tempExtractDir = null;

  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const formData = await request.formData();
    const zipFile = formData.get('file');

    if (!zipFile) {
      return NextResponse.json({ error: 'Please select a ZIP file' }, { status: 400 });
    }

    if (!zipFile.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Only ZIP format is supported' }, { status: 400 });
    }

    const projectPath = await getProjectPath(projectId);
    const tempDir = path.join(projectPath, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    // 1. Save ZIP to temp directory
    tempZipPath = path.join(tempDir, `temp_${Date.now()}_${zipFile.name}`);
    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    await fs.writeFile(tempZipPath, zipBuffer);

    // 2. Create temp extract directory
    tempExtractDir = path.join(tempDir, `zip_extract_${Date.now()}`);
    await fs.mkdir(tempExtractDir, { recursive: true });

    // 3. Extract with adm-zip
    console.log('Extracting ZIP...');
    const zip = new AdmZip(tempZipPath);
    const zipEntries = zip.getEntries();

    // Supported image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    let extractedCount = 0;

    // Iterate all files in ZIP
    for (const entry of zipEntries) {
      // Skip directories and hidden files
      if (
        entry.isDirectory ||
        entry.entryName.startsWith('__MACOSX') ||
        path.basename(entry.entryName).startsWith('.')
      ) {
        continue;
      }

      const ext = path.extname(entry.entryName).toLowerCase();
      if (imageExtensions.includes(ext)) {
        // Extract filename (without path)
        const fileName = path.basename(entry.entryName);
        const targetPath = path.join(tempExtractDir, fileName);

        // Extract file
        zip.extractEntryTo(entry, tempExtractDir, false, true, false, fileName);
        extractedCount++;
      }
    }

    console.log(`ZIP extracted, image count: ${extractedCount}`);

    if (extractedCount === 0) {
      throw new Error('No supported image files found in ZIP');
    }

    // 4. Call service to import images
    const importResult = await importImagesFromDirectories(projectId, [tempExtractDir]);

    // 5. Clean up temp files
    try {
      if (tempZipPath) {
        await fs.unlink(tempZipPath);
      }
      if (tempExtractDir) {
        const tempImages = await fs.readdir(tempExtractDir);
        for (const img of tempImages) {
          await fs.unlink(path.join(tempExtractDir, img));
        }
        await fs.rmdir(tempExtractDir);
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
      zipName: zipFile.name
    });
  } catch (error) {
    console.error('Failed to import ZIP:', error);

    // Clean up temp files
    try {
      if (tempZipPath) {
        await fs.unlink(tempZipPath).catch(() => {});
      }
      if (tempExtractDir) {
        const tempImages = await fs.readdir(tempExtractDir).catch(() => []);
        for (const img of tempImages) {
          await fs.unlink(path.join(tempExtractDir, img)).catch(() => {});
        }
        await fs.rmdir(tempExtractDir).catch(() => {});
      }
    } catch (cleanupErr) {
      console.warn('Failed to clean up temp files:', cleanupErr);
    }

    return NextResponse.json({ error: error.message || 'Failed to import ZIP' }, { status: 500 });
  }
}
