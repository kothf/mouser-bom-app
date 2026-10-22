import { MouserPart } from '../mouser/types';
import { MouserRateLimiter } from '../mouser/rate-limiter';
import {
  DigiKeyCredentials,
  DigiKeyKeywordResponse,
  DigiKeyProduct,
  DigiKeyProductDetailsResponse,
} from './types';
import { isMarketPlaceOnly, normalizeDigiKeyProduct } from './normalize';
import { withoutDistributorPrefix } from '../part-number';

/**
 * DigiKey Product Information API v4 client (server-side only).
 *
 * Credentials come only from the request headers (the user's own Client
 * ID/Secret saved in their browser); the server holds none. They are never
 * written to disk or returned to clients.
 */

const DEFAULT_API_BASE = 'https://api.digikey.com';

// DigiKey allows 120 requests/minute per app; stay well under it.
export const globalDigiKeyRateLimiter = new MouserRateLimiter({
  maxConcurrency: 2,
  delayMs: 550,
  maxRetries: 3,
  initialRetryDelayMs: 1500,
});

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, CachedToken>();

function apiBase(): string {
  return (process.env.DIGIKEY_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, '');
}

function cleanCredential(raw: string | null | undefined): string {
  if (!raw) return '';
  const clean = String(raw).trim().replace(/^['"`]+|['"`]+$/g, '').trim();
  if (/^undefined$|^null$/i.test(clean)) return '';
  return clean;
}

/**
 * Resolve credentials from the request headers.
 */
export function resolveDigiKeyCredentials(headers: Headers): DigiKeyCredentials {
  return {
    clientId: cleanCredential(headers.get('x-digikey-client-id')),
    clientSecret: cleanCredential(headers.get('x-digikey-client-secret')),
    localeSite:
      cleanCredential(headers.get('x-digikey-locale-site')) || process.env.DIGIKEY_LOCALE_SITE || 'US',
    // Prices are always shown in USD.
    localeCurrency: 'USD',
    localeLanguage: process.env.DIGIKEY_LOCALE_LANGUAGE || 'en',
  };
}

function missingCredentialsError(): string {
  return 'DigiKey Client ID and Client Secret are not configured. Please add them in Settings.';
}

function extractErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    const msg = d.ErrorMessage || d.detail || d.title || d.message || d.error_description || d.error;
    const details = typeof d.ErrorDetails === 'string' ? d.ErrorDetails : '';
    if (msg) return details ? `${msg} (${details})` : String(msg);
  }
  return `DigiKey API responded with HTTP ${status}`;
}

async function fetchAccessToken(creds: DigiKeyCredentials, forceRefresh = false): Promise<string> {
  const cacheKey = `${apiBase()}|${creds.clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (!forceRefresh && cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token;
  }

  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: 'client_credentials',
    }).toString(),
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text);
  } catch {}

  if (!res.ok || typeof data.access_token !== 'string') {
    tokenCache.delete(cacheKey);
    throw new Error(
      `DigiKey authorization failed: ${extractErrorMessage(data, res.status)}. Check your DigiKey Client ID and Secret in Settings.`
    );
  }

  const expiresIn = Number(data.expires_in) || 600;
  tokenCache.set(cacheKey, { token: data.access_token, expiresAt: Date.now() + expiresIn * 1000 });
  return data.access_token;
}

async function digikeyRequest<T>(
  creds: DigiKeyCredentials,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown }
): Promise<{ status: number; data: T | null }> {
  return globalDigiKeyRateLimiter.schedule(async () => {
    const send = async (token: string) =>
      fetch(`${apiBase()}${path}`, {
        method: init.method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-DIGIKEY-Client-Id': creds.clientId,
          'X-DIGIKEY-Locale-Site': creds.localeSite || 'US',
          'X-DIGIKEY-Locale-Language': creds.localeLanguage || 'en',
          'X-DIGIKEY-Locale-Currency': creds.localeCurrency || 'USD',
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });

    let res = await send(await fetchAccessToken(creds));
    if (res.status === 401) {
      // Token may have been revoked or expired early; retry once with a fresh one.
      res = await send(await fetchAccessToken(creds, true));
    }

    if (res.status === 429) {
      const err = new Error('HTTP 429: Too Many Requests to DigiKey API (rate limited)');
      (err as { status?: number }).status = 429;
      throw err;
    }

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new Error(`Invalid response from DigiKey API (HTTP ${res.status})`);
    }

    if (res.status === 404) {
      return { status: 404, data: null };
    }

    if (!res.ok) {
      throw new Error(extractErrorMessage(data, res.status));
    }

    return { status: res.status, data: data as T };
  });
}

export class DigiKeyClient {
  public async searchByKeyword(
    keyword: string,
    creds: DigiKeyCredentials,
    records: number = 20,
    pageNumber: number = 1,
    inStockOnly: boolean = false
  ): Promise<{ parts: MouserPart[]; totalResults: number; exactMatches: MouserPart[]; error?: string }> {
    const clean = (keyword || '').trim();
    if (!clean) return { parts: [], totalResults: 0, exactMatches: [] };
    if (!creds.clientId || !creds.clientSecret) {
      return { parts: [], totalResults: 0, exactMatches: [], error: missingCredentialsError() };
    }

    const limit = Math.min(50, Math.max(1, records));
    try {
      const base = { Keywords: clean, Limit: limit, Offset: Math.max(0, (pageNumber - 1) * limit) };
      // Marketplace listings are sold and shipped by third parties, never wanted here.
      const filters = {
        MarketPlaceFilter: 'ExcludeMarketPlace',
        ...(inStockOnly ? { SearchOptions: ['InStock'] } : {}),
      };
      let data: DigiKeyKeywordResponse | null;
      try {
        ({ data } = await digikeyRequest<DigiKeyKeywordResponse>(creds, '/products/v4/search/keyword', {
          method: 'POST',
          body: { ...base, FilterOptionsRequest: filters },
        }));
      } catch (err: unknown) {
        // If DigiKey ever rejects the filters, search without them; marketplace
        // parts are still dropped below and stock is still ranked by the app.
        if (/authoriz|client id|secret|429/i.test((err as Error).message || '')) throw err;
        ({ data } = await digikeyRequest<DigiKeyKeywordResponse>(creds, '/products/v4/search/keyword', {
          method: 'POST',
          body: base,
        }));
      }

      const currency = creds.localeCurrency || 'USD';
      // Also drop any marketplace-only product the filter lets through.
      const toParts = (list?: DigiKeyProduct[]) =>
        (list || []).filter((p) => !isMarketPlaceOnly(p)).map((p) => normalizeDigiKeyProduct(p, currency));

      const exactMatches = toParts(data?.ExactMatches);
      const products = toParts(data?.Products);

      // Put exact matches first and drop duplicates from the general list.
      const seen = new Set(exactMatches.map((p) => p.MouserPartNumber || p.ManufacturerPartNumber));
      const parts = [
        ...exactMatches,
        ...products.filter((p) => !seen.has(p.MouserPartNumber || p.ManufacturerPartNumber)),
      ];

      return { parts, totalResults: data?.ProductsCount || parts.length, exactMatches };
    } catch (err: unknown) {
      const errMsg = (err as Error).message || 'DigiKey keyword search failed';
      console.warn(`[DigiKeyClient] Keyword search failed for "${clean}":`, errMsg);
      return { parts: [], totalResults: 0, exactMatches: [], error: errMsg };
    }
  }

  /**
   * Look up a manufacturer or DigiKey part number. Uses the product details
   * endpoint first, then falls back to keyword exact matches.
   */
  public async searchByPartNumber(
    partNumber: string,
    creds: DigiKeyCredentials
  ): Promise<{ parts: MouserPart[]; error?: string }> {
    const clean = (partNumber || '').trim();
    if (!clean) return { parts: [], error: 'Empty part number provided' };
    if (!creds.clientId || !creds.clientSecret) {
      return { parts: [], error: missingCredentialsError() };
    }

    // Like Mouser: when the part number as written finds nothing exact, try it
    // without a distributor prefix (Mouser "80-C4AF3BW4470A3FK" -> "C4AF3BW4470A3FK").
    const stripped = withoutDistributorPrefix(clean);
    let firstKeywordParts: MouserPart[] = [];
    for (const candidate of stripped ? [clean, stripped] : [clean]) {
      try {
        const { data } = await digikeyRequest<DigiKeyProductDetailsResponse>(
          creds,
          `/products/v4/search/${encodeURIComponent(candidate)}/productdetails`,
          { method: 'GET' }
        );

        if (data?.Product) {
          return { parts: [normalizeDigiKeyProduct(data.Product, creds.localeCurrency || 'USD')] };
        }
      } catch (err: unknown) {
        const errMsg = (err as Error).message || 'DigiKey part search failed';
        if (/authoriz|client id|secret|429/i.test(errMsg)) {
          console.warn(`[DigiKeyClient] Part search failed for "${candidate}":`, errMsg);
          return { parts: [], error: errMsg };
        }
        // Other errors (e.g. ambiguous part number) fall through to keyword search.
      }

      const keywordResult = await this.searchByKeyword(candidate, creds, 10, 1);
      if (keywordResult.error) return { parts: [], error: keywordResult.error };
      if (keywordResult.exactMatches.length > 0) return { parts: keywordResult.exactMatches };
      if (candidate === clean) firstKeywordParts = keywordResult.parts;
    }

    if (firstKeywordParts.length === 0) {
      return { parts: [], error: `Part "${clean}" not found in DigiKey catalog.` };
    }
    return { parts: firstKeywordParts };
  }

  public async verifyCredentials(creds: DigiKeyCredentials): Promise<{ valid: boolean; message: string }> {
    if (!creds.clientId || !creds.clientSecret) {
      return { valid: false, message: missingCredentialsError() };
    }
    try {
      await fetchAccessToken(creds, true);
      return { valid: true, message: 'DigiKey credentials verified successfully' };
    } catch (err: unknown) {
      return { valid: false, message: (err as Error).message || 'DigiKey authorization failed' };
    }
  }
}

export const digikeyClient = new DigiKeyClient();
