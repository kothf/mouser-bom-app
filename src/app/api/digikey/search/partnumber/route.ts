import { NextRequest, NextResponse } from 'next/server';
import { digikeyClient, resolveDigiKeyCredentials } from '@/lib/digikey/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { partNumber } = body;

    if (!partNumber || typeof partNumber !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "partNumber" in request body' },
        { status: 400 }
      );
    }

    const creds = resolveDigiKeyCredentials(req.headers);
    const result = await digikeyClient.searchByPartNumber(partNumber, creds);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in /api/digikey/search/partnumber:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to search part number' },
      { status: 500 }
    );
  }
}
