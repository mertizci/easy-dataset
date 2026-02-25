import { NextRequest, NextResponse } from 'next/server';
import { requireProjectAuth } from '@/lib/auth/apiGuard';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Batch edit chunk content
 * POST /api/projects/[projectId]/chunks/batch-edit
 */
export async function POST(request, { params }) {
  try {
    const auth = await requireProjectAuth(request, params, { requireAdmin: true });
    if (auth.response) return auth.response;
    const { projectId } = params;
    const body = await request.json();
    const { position, content, chunkIds } = body;

    // Validate params
    if (!position || !content || !chunkIds || !Array.isArray(chunkIds) || chunkIds.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters: position, content, chunkIds' }, { status: 400 });
    }

    if (!['start', 'end'].includes(position)) {
      return NextResponse.json({ error: 'Position must be "start" or "end"' }, { status: 400 });
    }

    // Verify project access (fetch chunks to edit)
    const chunksToUpdate = await prisma.chunks.findMany({
      where: {
        id: { in: chunkIds },
        projectId: projectId
      },
      select: {
        id: true,
        content: true,
        name: true
      }
    });

    if (chunksToUpdate.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (chunksToUpdate.length !== chunkIds.length) {
      return NextResponse.json({ error: 'Some chunks not found' }, { status: 400 });
    }

    // Prepare update data
    const updates = chunksToUpdate.map(chunk => {
      let newContent;

      if (position === 'start') {
        // Prepend content
        newContent = content + '\n\n' + chunk.content;
      } else {
        // Append content
        newContent = chunk.content + '\n\n' + content;
      }

      return {
        where: { id: chunk.id },
        data: {
          content: newContent,
          size: newContent.length,
          updateAt: new Date()
        }
      };
    });

    async function processBatches(items, batchSize, processFn) {
      const results = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processFn));
        results.push(...batchResults);
      }
      return results;
    }

    const BATCH_SIZE = 50; // Process 50 per batch
    await processBatches(updates, BATCH_SIZE, update => prisma.chunks.update(update));

    // Log operation (optional)
    console.log(`Successfully updated ${chunksToUpdate.length} chunks`);

    return NextResponse.json({
      success: true,
      updatedCount: chunksToUpdate.length,
      message: `Successfully updated ${chunksToUpdate.length} chunks`
    });
  } catch (error) {
    console.error('Batch edit chunks failed:', error);

    return NextResponse.json(
      {
        error: 'Batch edit chunks failed',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
