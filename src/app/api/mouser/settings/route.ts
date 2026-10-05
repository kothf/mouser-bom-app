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
