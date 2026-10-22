import { NextRequest, NextResponse } from 'next/server';
import { digikeyClient, resolveDigiKeyCredentials } from '@/lib/digikey/client';

/** Verifies the DigiKey credentials sent in the headers. */

export async function POST(req: NextRequest) {
  try {
    const creds = resolveDigiKeyCredentials(req.headers);
    const result = await digikeyClient.verifyCredentials(creds);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { valid: false, message: (error as Error).message || 'Verification failed' },
      { status: 500 }
    );
  }
}
