import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { mouserClient } from '@/lib/mouser/client';

export async function GET() {
  try {
    const searchApiKey = process.env.MOUSER_SEARCH_API_KEY || '';
    const cartApiKey = process.env.MOUSER_CART_API_KEY || '';
    const useDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    return NextResponse.json({
      searchApiKey,
      cartApiKey,
      useDemoMode,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to read settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { searchApiKey, cartApiKey, useDemoMode } = body;

    const envPath = path.resolve(process.cwd(), '.env.local');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const updateEnvVar = (content: string, key: string, val: string) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        return content.replace(regex, `${key}=${val}`);
      } else {
        const cleanContent = content.trim();
        return cleanContent ? `${cleanContent}\n${key}=${val}\n` : `${key}=${val}\n`;
      }
    };

    let updated = envContent;
    if (typeof searchApiKey === 'string') {
      updated = updateEnvVar(updated, 'MOUSER_SEARCH_API_KEY', searchApiKey.trim());
      process.env.MOUSER_SEARCH_API_KEY = searchApiKey.trim();
    }
    if (typeof cartApiKey === 'string') {
      updated = updateEnvVar(updated, 'MOUSER_CART_API_KEY', cartApiKey.trim());
      process.env.MOUSER_CART_API_KEY = cartApiKey.trim();
    }
    if (typeof useDemoMode === 'boolean') {
      updated = updateEnvVar(updated, 'NEXT_PUBLIC_DEMO_MODE', String(useDemoMode));
      process.env.NEXT_PUBLIC_DEMO_MODE = String(useDemoMode);
    }

    fs.writeFileSync(envPath, updated, 'utf8');
    mouserClient.setKeys(
      typeof searchApiKey === 'string' ? searchApiKey.trim() : undefined,
      typeof cartApiKey === 'string' ? cartApiKey.trim() : undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Settings saved permanently to .env.local and server memory',
    });
  } catch (error: unknown) {
    console.error('Error in /api/mouser/settings:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to persist settings' },
      { status: 500 }
    );
  }
}
