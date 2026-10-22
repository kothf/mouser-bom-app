import { NextResponse } from 'next/server';
import { getUsdRates } from '@/lib/currency/usd';

// Rates change daily, so never serve a copy prerendered at build time.
export const dynamic = 'force-dynamic';

/** Units of each currency per 1 USD, for converting BOMs saved in the browser. */
export async function GET() {
  return NextResponse.json({ rates: await getUsdRates() });
}
