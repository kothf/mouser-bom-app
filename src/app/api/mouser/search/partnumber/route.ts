import { NextRequest, NextResponse } from 'next/server';
import { mouserClient } from '@/lib/mouser/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { partNumber, description, notes, designator } = body;

    if (!partNumber || typeof partNumber !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "partNumber" in request body' },
        { status: 400 }
      );
    }

    // Allow user to supply their own key via header or fallback to server env
    const headerKey = req.headers.get('x-mouser-search-key') || undefined;

    const result = await mouserClient.searchByPartNumber(
      partNumber,
      headerKey,
      description || notes,
      designator
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in /api/mouser/search/partnumber:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to search part number' },
      { status: 500 }
    );
  }
}
