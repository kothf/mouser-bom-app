import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'saved-bom.json');

export async function GET() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const activeCart = body.activeCart || null;

    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      DATA_FILE,
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

export async function DELETE() {
  try {
    await fs.unlink(DATA_FILE).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to clear saved BOM' },
      { status: 500 }
    );
  }
}
