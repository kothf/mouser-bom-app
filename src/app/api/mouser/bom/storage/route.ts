import { NextRequest } from 'next/server';
import { createBomStorageHandlers } from '@/lib/storage/bom-file-storage';

const handlers = createBomStorageHandlers('saved-bom.json');

export async function GET() {
  return handlers.GET();
}

export async function POST(req: NextRequest) {
  return handlers.POST(req);
}

export async function DELETE() {
  return handlers.DELETE();
}
