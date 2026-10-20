import { NextRequest, NextResponse } from 'next/server';
import { convertPartsToUsd } from '@/lib/currency/usd';
import { digikeyClient, resolveDigiKeyCredentials } from '@/lib/digikey/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, records, pageNumber } = body;

    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "keyword" in request body' },
        { status: 400 }
      );
    }

    const creds = resolveDigiKeyCredentials(req.headers);
    const { parts, totalResults, error } = await digikeyClient.searchByKeyword(
      keyword,
      creds,
      Number(records) || 20,
      Number(pageNumber) || 1
    );

    return NextResponse.json({ parts: await convertPartsToUsd(parts), totalResults, error });
  } catch (error: unknown) {
    console.error('Error in /api/digikey/search/keyword:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to search keyword' },
      { status: 500 }
    );
  }
}
