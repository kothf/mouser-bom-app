import { NextRequest, NextResponse } from 'next/server';
import { digikeyClient, resolveDigiKeyCredentials } from '@/lib/digikey/client';

/**
 * GET reports whether the server has DigiKey credentials in its environment
 * (without revealing them). POST verifies the credentials sent in the headers.
 */
export async function GET() {
  return NextResponse.json({
    serverConfigured: Boolean(process.env.DIGIKEY_CLIENT_ID && process.env.DIGIKEY_CLIENT_SECRET),
  });
}

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
