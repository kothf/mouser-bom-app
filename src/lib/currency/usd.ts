import { MouserCartResponse, MouserPart } from '@/lib/mouser/types';
import {
  FALLBACK_USD_RATES,
  UsdRates,
  convertCartWithRates,
  convertPartsWithRates,
  partNeedsUsd,
} from './convert';

/**
 * Prices are always shown in USD. DigiKey is asked for USD directly; Mouser
 * prices in the currency of the account behind the API key, so any price break
 * that is not in USD is converted here with a daily reference rate (or a
 * built-in approximate rate when no rate source answers).
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

/** Units of each currency per 1 USD: live rates when reachable, else the built-in fallback. */
export async function getUsdRates(): Promise<UsdRates> {
  return { ...FALLBACK_USD_RATES, ...((await getLiveUsdRates()) || {}) };
}

/** Live rates, cached; null when no source answered and nothing is cached. */
async function getLiveUsdRates(): Promise<Record<string, number> | null> {
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

/** Return the parts with every price break in USD. */
export async function convertPartsToUsd(parts: MouserPart[]): Promise<MouserPart[]> {
  if (!parts || parts.length === 0 || !parts.some(partNeedsUsd)) return parts;
  return convertPartsWithRates(parts, await getUsdRates());
}

/** Return the Mouser cart with its total and line prices in USD. */
export async function convertCartToUsd(cart: MouserCartResponse): Promise<MouserCartResponse> {
  if (!cart || !cart.CurrencyCode || cart.CurrencyCode.toUpperCase() === 'USD') return cart;
  return convertCartWithRates(cart, await getUsdRates());
}
