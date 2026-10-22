import { MouserCartResponse, MouserPart } from '@/lib/mouser/types';
import { UsdRates, convertCartWithRates, convertPartsWithRates, partNeedsUsd } from './convert';

/**
 * Prices are always shown in USD. DigiKey is asked for USD directly; Mouser
 * prices in the currency of the account behind the API key, so any price break
 * that is not in USD is converted here with a live daily reference rate. A
 * price that cannot be converted is left out rather than shown in another currency.
 */

// Keyless daily-rate sources, tried in order. All answer "units per 1 USD".
const RATE_SOURCES: { url: string; read: (data: unknown) => Record<string, number> | undefined }[] = [
  { url: 'https://api.frankfurter.dev/v1/latest?base=USD', read: (d) => (d as { rates?: Record<string, number> }).rates },
  { url: 'https://open.er-api.com/v6/latest/USD', read: (d) => (d as { rates?: Record<string, number> }).rates },
  {
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    read: (d) => upperCaseKeys((d as { usd?: Record<string, number> }).usd),
  },
  {
    url: 'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
    read: (d) => upperCaseKeys((d as { usd?: Record<string, number> }).usd),
  },
];

function upperCaseKeys(rates: Record<string, number> | undefined): Record<string, number> | undefined {
  if (!rates) return undefined;
  return Object.fromEntries(Object.entries(rates).map(([k, v]) => [k.toUpperCase(), v]));
}

const RATES_TTL_MS = 6 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

let cachedRates: UsdRates | null = null;
let cachedAt = 0;
let lastFailureAt = 0;
let inflight: Promise<UsdRates | null> | null = null;

async function fetchRates(): Promise<UsdRates | null> {
  for (const { url, read } of RATE_SOURCES) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const rates = read(await res.json());
      if (rates && Object.keys(rates).length > 0) {
        return { ...rates, USD: 1 };
      }
    } catch (err) {
      console.warn(`[currency] Rate source ${url} failed:`, (err as Error).message);
    }
  }
  return null;
}

/**
 * Units of each currency per 1 USD from a live source, cached. When no source
 * answers, the last live rates are kept; with none at all only USD is known.
 */
export async function getUsdRates(): Promise<UsdRates> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < RATES_TTL_MS) return cachedRates;
  if (now - lastFailureAt < RETRY_AFTER_FAILURE_MS) return cachedRates || { USD: 1 };

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
    console.warn('[currency] No live exchange rates available; prices in other currencies are hidden.');
  }
  return cachedRates || { USD: 1 };
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
