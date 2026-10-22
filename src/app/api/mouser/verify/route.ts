import { NextRequest, NextResponse } from 'next/server';
import { mouserClient } from '@/lib/mouser/client';

/**
 * GET reports whether the server has a Mouser Search API key in its
 * environment (without revealing it). POST verifies the key in the body.
 */
export async function GET() {
  return NextResponse.json({
    serverConfigured: Boolean(process.env.MOUSER_SEARCH_API_KEY || process.env.MOUSER_API_KEY),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey } = body;

    const result = await mouserClient.verifyApiKey(apiKey || '');
    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      { valid: false, message: (error as Error).message || 'Verification failed' },
      { status: 500 }
    );
  }
}
