import {
  MouserPart,
  MouserSearchResponse,
  MouserCartItem,
  MouserCartResponse,
  MouserPriceBreak,
} from './types';
import { globalMouserRateLimiter } from './rate-limiter';

const MOUSER_API_BASE = 'https://api.mouser.com/api/v1';

export class MouserClient {
  private defaultSearchKey: string;
  private defaultCartKey: string;

  constructor() {
    this.defaultSearchKey = process.env.MOUSER_SEARCH_API_KEY || process.env.MOUSER_API_KEY || '';
    this.defaultCartKey = process.env.MOUSER_CART_API_KEY || process.env.MOUSER_API_KEY || '';
  }

  public setKeys(searchKey?: string, cartKey?: string) {
    if (searchKey !== undefined) this.defaultSearchKey = searchKey;
    if (cartKey !== undefined) this.defaultCartKey = cartKey;
  }

  /**
   * Search component by Part Number (MPN or Mouser Part #)
   */
  public async searchByPartNumber(
    partNumber: string,
    apiKeyOverride?: string,
    notes?: string,
    designator?: string
  ): Promise<{ parts: MouserPart[]; error?: string }> {
    const rawClean = (partNumber || '').trim();
    if (!rawClean) {
      return { parts: [], error: 'Empty part number provided' };
    }

    const key = sanitizeApiKey(apiKeyOverride || this.defaultSearchKey || process.env.MOUSER_SEARCH_API_KEY || '');

    if (!key) {
      return {
        parts: [],
        error: 'Mouser Search API Key is not configured. Please configure your key in Settings.',
      };
    }

    try {
      const queryMouser = async (pn: string): Promise<MouserPart[]> => {
        return await globalMouserRateLimiter.schedule(async () => {
          const url = `${MOUSER_API_BASE}/search/partnumber?apiKey=${encodeURIComponent(key)}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'x-mouser-api-key': key,
            },
            body: JSON.stringify({
              SearchByPartRequest: {
                mouserPartNumber: pn,
                partSearchOptions: 'None',
              },
            }),
          });

          if (res.status === 429) {
            const err = new Error('HTTP 429: Too Many Requests to Mouser API (Rate limited)');
            (err as { status?: number }).status = 429;
            throw err;
          }

          if (res.status === 401 || res.status === 403) {
            throw new Error(`Mouser API authorization failed (HTTP ${res.status}). Please check your API key in Settings.`);
          }

          const text = await res.text();
          let data: MouserSearchResponse;
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(`Invalid response from Mouser API (HTTP ${res.status})`);
          }

          if (data.Errors && data.Errors.length > 0) {
            const errMsg = data.Errors.map((e) => e.Message).filter(Boolean).join('; ');
            if (/invalid unique identifier/i.test(errMsg)) {
              throw new Error('Mouser API key rejected: "Invalid unique identifier". Please ensure your Mouser Search API Key (not Cart/Order key) is configured in Settings.');
            }
            throw new Error(errMsg || 'Mouser API returned an error');
          }

          return data.SearchResults?.Parts || [];
        });
      };

      // 1. First attempt: search with exact raw part number
      let parts = await queryMouser(rawClean);

      // 2. Second attempt: if 0 parts and partNumber has a manufacturer prefix (e.g. 80-C4AF3BW4470A3FK -> C4AF3BW4470A3FK), try stripped
      if (parts.length === 0 && rawClean.includes('-')) {
        const stripped = rawClean.replace(/^[0-9]{2,4}-/, '');
        if (stripped !== rawClean && stripped.length >= 3) {
          parts = await queryMouser(stripped);
        }
      }

      if (parts.length === 0) {
        return {
          parts: [],
          error: `Part "${rawClean}" not found in Mouser catalog.`,
        };
      }

      return { parts };
    } catch (err: unknown) {
      const errMsg = (err as Error).message || 'Mouser search request failed';
      console.warn(`[MouserClient] Search failed for "${rawClean}":`, errMsg);

      return {
        parts: [],
        error: errMsg,
      };
    }
  }

  /**
   * Search components by Keyword
   */
  public async searchByKeyword(
    keyword: string,
    apiKeyOverride?: string,
    records: number = 20,
    pageNumber: number = 1
  ): Promise<{ parts: MouserPart[]; totalResults: number; error?: string }> {
    const cleanKeyword = (keyword || '').trim();
    if (!cleanKeyword) {
      return { parts: [], totalResults: 0 };
    }

    const key = sanitizeApiKey(apiKeyOverride || this.defaultSearchKey || process.env.MOUSER_SEARCH_API_KEY || '');

    if (!key) {
      return {
        parts: [],
        totalResults: 0,
        error: 'Mouser Search API Key is not configured. Please configure your key in Settings.',
      };
    }

    try {
      const result = await globalMouserRateLimiter.schedule(async () => {
        const url = `${MOUSER_API_BASE}/search/keyword?apiKey=${encodeURIComponent(key)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'x-mouser-api-key': key,
          },
          body: JSON.stringify({
            SearchByKeywordRequest: {
              keyword: cleanKeyword,
              records,
              pageNumber,
              searchOptions: 'None',
              searchWithYourSignUpLanguage: 'None',
            },
          }),
        });

        if (res.status === 429) {
          const err = new Error('HTTP 429: Too Many Requests to Mouser API');
          (err as { status?: number }).status = 429;
          throw err;
        }

        if (res.status === 401 || res.status === 403) {
          throw new Error(`Mouser API authorization failed (HTTP ${res.status}). Check your Search API Key.`);
        }

        const text = await res.text();
        let data: MouserSearchResponse;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Invalid response from Mouser API (HTTP ${res.status})`);
        }

        if (data.Errors && data.Errors.length > 0) {
          const errMsg = data.Errors.map((e) => e.Message).filter(Boolean).join('; ');
          if (/invalid unique identifier/i.test(errMsg)) {
            throw new Error('Mouser API key rejected: "Invalid unique identifier". Please ensure your Mouser Search API Key (not Cart/Order key) is configured in Settings.');
          }
          throw new Error(errMsg || 'Mouser API returned an error');
        }

        return data;
      });

      const parts = result.SearchResults?.Parts || [];
      const total = result.SearchResults?.NumberOfResult || parts.length;
      return { parts, totalResults: total };
    } catch (err: unknown) {
      const errMsg = (err as Error).message || 'Keyword search failed';
      console.warn(`[MouserClient] Keyword search failed for "${cleanKeyword}":`, errMsg);
      return {
        parts: [],
        totalResults: 0,
        error: errMsg,
      };
    }
  }

  /**
   * Create or update a Mouser Shopping Cart
   */
  public async createCart(
    items: MouserCartItem[],
    apiKeyOverride?: string,
    existingCartKey?: string
  ): Promise<MouserCartResponse> {
    const key = sanitizeApiKey(apiKeyOverride || this.defaultCartKey || process.env.MOUSER_CART_API_KEY || '');

    if (!key) {
      throw new Error('Mouser Cart API Key is required to create a shopping cart. Please configure it in Settings.');
    }

    try {
      const response = await globalMouserRateLimiter.schedule(async () => {
        const url = `${MOUSER_API_BASE}/cart/items/insert?apiKey=${encodeURIComponent(key)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            CartKey: existingCartKey || undefined,
            CartItems: items.map((it) => ({
              MouserPartNumber: it.MouserPartNumber,
              Quantity: it.Quantity,
              CustomerPartNumber: it.CustomerPartNumber || '',
            })),
          }),
        });

        if (res.status === 429) {
          const err = new Error('HTTP 429: Rate limit hit on Mouser Cart API');
          (err as { status?: number }).status = 429;
          throw err;
        }

        if (!res.ok) {
          throw new Error(`Mouser Cart API error: HTTP ${res.status} ${res.statusText}`);
        }

        return (await res.json()) as MouserCartResponse;
      });

      if (!response.CheckoutUrl && response.CartKey) {
        response.CheckoutUrl = `https://www.mouser.com/Cart/?CartKey=${response.CartKey}`;
      }

      return response;
    } catch (err: unknown) {
      console.error('[MouserClient] Cart creation failed:', (err as Error).message);
      throw err;
    }
  }

  /**
   * Verify an API key with a test call
   */
  public async verifyApiKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
    const key = sanitizeApiKey(apiKey);
    if (!key || key.length < 8) {
      return { valid: false, message: 'API key is invalid, too short, or empty' };
    }

    try {
      const url = `${MOUSER_API_BASE}/search/partnumber?apiKey=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-mouser-api-key': key,
        },
        body: JSON.stringify({
          SearchByPartRequest: {
            mouserPartNumber: 'NE555P',
            partSearchOptions: 'None',
          },
        }),
      });

      if (res.status === 401 || res.status === 403) {
        return { valid: false, message: `Invalid API key or unauthorized (HTTP ${res.status})` };
      }

      if (res.status === 429) {
        return { valid: true, message: 'Key is valid, but currently rate-limited by Mouser (HTTP 429)' };
      }

      const text = await res.text();
      let data: MouserSearchResponse;
      try {
        data = JSON.parse(text);
      } catch {
        return { valid: false, message: `Mouser responded with HTTP ${res.status} (non-JSON)` };
      }

      if (data.Errors && data.Errors.length > 0) {
        const errMsg = data.Errors.map((e) => e.Message).filter(Boolean).join('; ');
        return { valid: false, message: errMsg || 'Mouser API rejected the key' };
      }

      if (res.ok && data.SearchResults) {
        return { valid: true, message: 'Mouser Search API Key verified successfully' };
      }

      return { valid: false, message: `Mouser responded with HTTP ${res.status}` };
    } catch (err: unknown) {
      return { valid: false, message: (err as Error).message || 'Connection failed' };
    }
  }
}

/**
 * Utility: Clean and sanitize Mouser API keys.
 * Removes wrapping quotes, whitespace, trailing/leading non-key labels,
 * and extracts valid UUID string to prevent "Invalid unique identifier" from Mouser API.
 */
export function sanitizeApiKey(raw: string | undefined | null): string {
  if (!raw) return '';
  const str = String(raw).trim();
  const clean = str.replace(/^['"`]+|['"`]+$/g, '').trim();

  // Guard against literal string values like "undefined", "null", "[object Object]"
  if (/^undefined$|^null$|^none$|^\[object/i.test(clean)) {
    return '';
  }

  // If a full UUID pattern is contained (e.g. "Key: a8e09a38-838d-4423-b03f-c45fc2f29373")
  const uuidMatch = clean.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
  if (uuidMatch) {
    return uuidMatch[0].toLowerCase();
  }

  // Fallback: remove spaces, control characters and non-alphanumeric except hyphen
  return clean.replace(/[^a-zA-Z0-9-]/g, '').trim();
}

/**
 * Utility: Robustly parse component price strings across different international
 * currency formats, accounting for decimal commas, thousand separators, and currency symbols.
 * Examples: "$7.85", "7,85 €", "$1,250.00", "1.250,50 €", "$0.007", "Quote"
 */
export function parsePriceStringToNumber(priceStr: string | number | undefined | null): number {
  if (typeof priceStr === 'number') {
    return isFinite(priceStr) ? priceStr : 0;
  }
  if (!priceStr || typeof priceStr !== 'string') {
    return 0;
  }

  const trimmed = priceStr.trim();
  if (/quote|call|contact|inquire/i.test(trimmed)) {
    return 0;
  }

  // Remove non-digit, non-period, non-comma characters
  let clean = trimmed.replace(/[^\d.,]/g, '');
  if (!clean) return 0;

  if (clean.includes('.') && clean.includes(',')) {
    const lastDot = clean.lastIndexOf('.');
    const lastComma = clean.lastIndexOf(',');
    if (lastDot > lastComma) {
      // US/UK format: 1,250.50 -> comma is thousands
      clean = clean.replace(/,/g, '');
    } else {
      // European format: 1.250,50 -> dot is thousands, comma is decimal
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
  } else if (clean.includes(',')) {
    // Only comma present: European decimal separator e.g. "7,85"
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  return isNaN(num) || !isFinite(num) ? 0 : num;
}

/**
 * Utility: Calculate matching unit price for a given requested quantity
 * based on Mouser's tiered PriceBreaks.
 */
export function calculateTierPrice(
  priceBreaks: MouserPriceBreak[] | undefined,
  requestedQty: number
): { unitPrice: number; currency: string; matchedTierQty: number } {
  if (!priceBreaks || priceBreaks.length === 0) {
    return { unitPrice: 0, currency: 'USD', matchedTierQty: 1 };
  }

  // Parse price breaks and sort ascending by Quantity
  const parsedTiers = priceBreaks
    .map((tier) => {
      const num = parsePriceStringToNumber(tier.Price);
      const qty = parseInt(String(tier.Quantity).replace(/[^0-9]/g, ''), 10) || 1;
      return {
        qty,
        price: num,
        currency: tier.Currency || 'USD',
      };
    })
    .filter((t) => t.price > 0)
    .sort((a, b) => a.qty - b.qty);

  if (parsedTiers.length === 0) {
    return { unitPrice: 0, currency: 'USD', matchedTierQty: 1 };
  }

  // Find highest tier where tier.qty <= requestedQty
  let matchedTier = parsedTiers[0];
  for (const tier of parsedTiers) {
    if (requestedQty >= tier.qty) {
      matchedTier = tier;
    } else {
      break;
    }
  }

  return {
    unitPrice: matchedTier.price,
    currency: matchedTier.currency,
    matchedTierQty: matchedTier.qty,
  };
}

/**
 * Utility: Robustly parse stock quantity across all Mouser inventory fields:
 * - Availability text (e.g. "4,120 In Stock", "Factory Stock: 500")
 * - AvailabilityInStock numeric string (e.g. "4120")
 * - FactoryStock numeric string (e.g. "500")
 */
export function parseStockQuantity(
  availStr?: string | null,
  availInStock?: string | number | null,
  factoryStock?: string | number | null
): number {
  let warehouseStock = 0;

  // 1. Direct AvailabilityInStock field (preferred)
  if (availInStock !== undefined && availInStock !== null && availInStock !== '') {
    const clean = String(availInStock).replace(/,/g, '').trim();
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num > 0) {
      warehouseStock = num;
    }
  }

  // 2. Fallback to parsing text Availability (e.g. "4,120 In Stock")
  if (warehouseStock === 0 && availStr) {
    const clean = String(availStr).replace(/,/g, '').trim();
    if (!/^none$|^0(\s+in\s+stock)?$/i.test(clean)) {
      const match = clean.match(/\d+/);
      if (match) {
        warehouseStock = parseInt(match[0], 10);
      }
    }
  }

  // 3. Factory Stock
  let factory = 0;
  if (factoryStock !== undefined && factoryStock !== null && factoryStock !== '') {
    const clean = String(factoryStock).replace(/,/g, '').trim();
    const num = parseInt(clean, 10);
    if (!isNaN(num) && num > 0) {
      factory = num;
    }
  }

  return warehouseStock + factory;
}

/**
 * Utility: Intelligent selector to pick the best matching part from Mouser search results.
 * Avoids picking placeholder / non-orderable rows (e.g. MouserPartNumber "N/A" or 0-stock parent items)
 * when valid in-stock, orderable variants exist in the search results.
 */
export function pickBestMatchedPart(parts: MouserPart[], queryPartNumber?: string): MouserPart | null {
  if (!parts || parts.length === 0) return null;
  if (parts.length === 1) return parts[0];

  const target = (queryPartNumber || '').trim().toLowerCase();

  const scorePart = (p: MouserPart): number => {
    let score = 0;
    const mpn = (p.ManufacturerPartNumber || '').trim().toLowerCase();
    const mouserPn = (p.MouserPartNumber || '').trim().toLowerCase();
    const isNA = mouserPn === 'n/a' || !mouserPn;

    if (isNA) score -= 1000;

    if (target && (mpn === target || mouserPn === target)) {
      score += 500;
    } else if (target && (mpn.startsWith(target) || target.startsWith(mpn))) {
      score += 200;
    }

    const stock = parseStockQuantity(p.Availability, p.AvailabilityInStock, p.FactoryStock);
    if (stock > 0) {
      score += 300;
      score += Math.min(stock, 1000) / 10;
    }

    if (p.PriceBreaks && p.PriceBreaks.length > 0) {
      score += 100;
    }

    if (p.DataSheetUrl) {
      score += 10;
    }

    return score;
  };

  const sorted = [...parts].sort((a, b) => scorePart(b) - scorePart(a));
  return sorted[0] || parts[0];
}

// Global client singleton
export const mouserClient = new MouserClient();

