import { NextRequest, NextResponse } from 'next/server';
import { mouserClient } from '@/lib/mouser/client';
import { globalMouserRateLimiter } from '@/lib/mouser/rate-limiter';
import { MouserPart } from '@/lib/mouser/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { partNumbers } = body;

    if (!Array.isArray(partNumbers) || partNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Missing or empty "partNumbers" array in request body' },
        { status: 400 }
      );
    }

    const headerKey = req.headers.get('x-mouser-search-key') || undefined;

    // Process parts through rate limiter
    const results: Record<string, { parts: MouserPart[]; error?: string }> = {};

    await globalMouserRateLimiter.processBatch(
      partNumbers,
      async (item: string | { partNumber: string; description?: string; notes?: string; designator?: string }) => {
        const pn = typeof item === 'string' ? item : item.partNumber;
        const desc = typeof item === 'string' ? undefined : (item.description || item.notes);
        const desig = typeof item === 'string' ? undefined : item.designator;
        const clean = String(pn || '').trim();
        if (!clean) return;
        const res = await mouserClient.searchByPartNumber(clean, headerKey, desc, desig);
        results[clean] = res;
      }
    );

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error('Error in /api/mouser/search/batch:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to process batch search' },
      { status: 500 }
    );
  }
}
