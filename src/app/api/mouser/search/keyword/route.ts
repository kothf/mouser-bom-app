import { NextRequest, NextResponse } from 'next/server';
import { mouserClient } from '@/lib/mouser/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, records, pageNumber, useDemoMode } = body;

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "keyword" in request body' },
        { status: 400 }
      );
    }

    const headerKey = req.headers.get('x-mouser-search-key') || undefined;

    const result = await mouserClient.searchByKeyword(
      keyword,
      headerKey,
      Number(records) || 20,
      Number(pageNumber) || 1,
      Boolean(useDemoMode)
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in /api/mouser/search/keyword:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to search keyword' },
      { status: 500 }
    );
  }
}
