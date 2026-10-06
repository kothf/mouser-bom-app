import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  // Never expose sensitive server keys to public clients
  return NextResponse.json({
    searchApiKey: '',
    cartApiKey: '',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const key = body.searchApiKey || '';
    const masked = key ? `${key.slice(0, 4)}...${key.slice(-4)} (len=${key.length})` : 'EMPTY';
    console.log(`[API /settings POST] User saved search key: ${masked}`);

    // Client settings are stored in the user's own browser localStorage
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
