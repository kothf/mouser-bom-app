import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Route handlers that persist one supplier's BOM to a JSON file in ./data.
 * Each supplier uses its own file so BOMs are never mixed.
 */
export function createBomStorageHandlers(fileName: string) {
  const dataFile = path.join(DATA_DIR, fileName);

  async function GET() {
    try {
      const raw = await fs.readFile(dataFile, 'utf-8');
      const data = JSON.parse(raw);
      return NextResponse.json({
        success: true,
        items: Array.isArray(data.items) ? data.items : [],
        activeCart: data.activeCart || null,
        updatedAt: data.updatedAt || null,
      });
    } catch {
      return NextResponse.json({ success: true, items: [], activeCart: null, updatedAt: null });
    }
  }

  async function POST(req: NextRequest) {
    try {
      const body = await req.json();
      const items = Array.isArray(body.items) ? body.items : [];
      const activeCart = body.activeCart || null;

      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(
        dataFile,
        JSON.stringify(
          {
            items,
            activeCart,
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        'utf-8'
      );

      return NextResponse.json({ success: true, count: items.length });
    } catch (error: unknown) {
      const err = error as Error;
      return NextResponse.json(
        { success: false, error: err.message || 'Failed to save BOM to storage' },
        { status: 500 }
      );
    }
  }

  async function DELETE() {
    try {
      await fs.unlink(dataFile).catch(() => {});
      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const err = error as Error;
      return NextResponse.json(
        { success: false, error: err.message || 'Failed to clear saved BOM' },
        { status: 500 }
      );
    }
  }

  return { GET, POST, DELETE };
}
