import { MouserPart } from '@/lib/mouser/types';
import { parsePriceStringToNumber } from '@/lib/mouser/client';
import { normalizeCurrencyCode } from '@/lib/utils';

/**
 * Prices are always shown in USD. DigiKey is asked for USD directly; Mouser
 * prices in the currency of the account behind the API key, so any price break
 * that is not in USD is converted here with a daily reference rate.
 */

// Keyless daily-rate sources, tried in order. Both answer "units per 1 USD".
const RATE_SOURCES = [
  'https://api.frankfurter.dev/v1/latest?base=USD',
  'https://open.er-api.com/v6/latest/USD',
];

const RATES_TTL_MS = 6 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

let cachedRates: Record<string, number> | null = null;
let cachedAt = 0;
let lastFailureAt = 0;
let inflight: Promise<Record<string, number> | null> | null = null;

async function fetchRates(): Promise<Record<string, number> | null> {
  for (const url of RATE_SOURCES) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = (await res.json()) as { rates?: Record<string, number> };
      if (data.rates && Object.keys(data.rates).length > 0) {
        return { ...data.rates, USD: 1 };
      }
    } catch (err) {
      console.warn(`[currency] Rate source ${url} failed:`, (err as Error).message);
    }
  }
  return null;
}

/** Units of each currency per 1 USD, cached; null when no source answered and nothing is cached. */
export async function getUsdRates(): Promise<Record<string, number> | null> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < RATES_TTL_MS) return cachedRates;
  if (now - lastFailureAt < RETRY_AFTER_FAILURE_MS) return cachedRates;

  if (!inflight) {
    inflight = fetchRates().finally(() => {
      inflight = null;
    });
  }
  const rates = await inflight;
  if (rates) {
    cachedRates = rates;
    cachedAt = Date.now();
  } else {
    lastFailureAt = Date.now();
  }
  return cachedRates;
}

/** Test hook: forget cached rates. */
export function resetUsdRatesCache() {
  cachedRates = null;
  cachedAt = 0;
  lastFailureAt = 0;
  inflight = null;
}

/**
 * Return the parts with every price break in USD. Breaks already in USD are left
 * as they are; a break in a currency with no known rate is kept unchanged.
 */
export async function convertPartsToUsd(parts: MouserPart[]): Promise<MouserPart[]> {
  if (!parts || parts.length === 0) return parts;
  const needsConversion = parts.some((p) =>
    (p.PriceBreaks || []).some((b) => normalizeCurrencyCode(b.Currency) !== 'USD')
  );
  if (!needsConversion) return parts;

  const rates = await getUsdRates();
  if (!rates) {
    console.warn('[currency] No exchange rates available; prices left in their original currency.');
    return parts;
  }

  return parts.map((part) => {
    if (!part.PriceBreaks || part.PriceBreaks.length === 0) return part;
    return {
      ...part,
      PriceBreaks: part.PriceBreaks.map((b) => {
        const code = normalizeCurrencyCode(b.Currency);
        if (code === 'USD') return { ...b, Currency: 'USD' };
        const rate = rates[code];
        const amount = parsePriceStringToNumber(b.Price);
        if (!rate || !(amount > 0)) return b;
        const usd = amount / rate;
        return { ...b, Price: `$${usd.toFixed(usd < 1 ? 5 : 2)}`, Currency: 'USD' };
      }),
    };
  });
}
