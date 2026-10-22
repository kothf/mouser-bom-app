import { NextRequest, NextResponse } from 'next/server';
import { mouserClient } from '@/lib/mouser/client';

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
