import {
  MouserPart,
  MouserSearchResponse,
  MouserCartItem,
  MouserCartResponse,
  MouserPriceBreak,
} from './types';
import { searchMockCatalog, generateSyntheticPart } from './mock-data';
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
    useDemoMode: boolean = false,
    notes?: string,
    designator?: string
  ): Promise<{ parts: MouserPart[]; isDemo: boolean; error?: string }> {
    const key = apiKeyOverride?.trim() || this.defaultSearchKey || process.env.MOUSER_SEARCH_API_KEY || '';

    if (useDemoMode || !key) {
      const mockResults = searchMockCatalog(partNumber, notes, designator);
      return { parts: mockResults, isDemo: true };
    }

    try {
      const result = await globalMouserRateLimiter.schedule(async () => {
        const url = `${MOUSER_API_BASE}/search/partnumber?apiKey=${encodeURIComponent(key)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            SearchByPartRequest: {
              mouserPartNumber: partNumber.trim(),
              partSearchOptions: 'string',
            },
          }),
        });

        if (res.status === 429) {
          const err = new Error('HTTP 429: Too Many Requests to Mouser API');
          (err as { status?: number }).status = 429;
          throw err;
        }

        if (!res.ok) {
          throw new Error(`Mouser API error: HTTP ${res.status} ${res.statusText}`);
        }

        const data: MouserSearchResponse = await res.json();
        return data;
      });

      const parts = result.SearchResults?.Parts || [];

      if (parts.length === 0) {
        // Fallback to synthetic if not found in Mouser
        return { parts: [generateSyntheticPart(partNumber, notes, designator)], isDemo: true, error: 'Exact part not found on Mouser. Generated standard component fallback.' };
      }

      return { parts, isDemo: false };
    } catch (err: unknown) {
      console.warn(`[MouserClient] Search failed for "${partNumber}", falling back to mock catalog:`, (err as Error).message);
      // Fallback gracefully so the UI continues functioning
      const mockResults = searchMockCatalog(partNumber, notes, designator);
      return {
        parts: mockResults,
        isDemo: true,
        error: `Mouser API error: ${(err as Error).message}. (Showing simulated catalog fallback)`,
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
    pageNumber: number = 1,
    useDemoMode: boolean = false
  ): Promise<{ parts: MouserPart[]; totalResults: number; isDemo: boolean; error?: string }> {
    const key = apiKeyOverride?.trim() || this.defaultSearchKey || process.env.MOUSER_SEARCH_API_KEY || '';

    if (useDemoMode || !key) {
      const mockResults = searchMockCatalog(keyword);
      return { parts: mockResults, totalResults: mockResults.length, isDemo: true };
    }

    try {
      const result = await globalMouserRateLimiter.schedule(async () => {
        const url = `${MOUSER_API_BASE}/search/keyword?apiKey=${encodeURIComponent(key)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            SearchByKeywordRequest: {
              keyword: keyword.trim(),
              records,
              pageNumber,
              searchOptions: 'string',
              searchWithYourSignUpLanguage: 'string',
            },
          }),
        });

        if (res.status === 429) {
          const err = new Error('HTTP 429: Too Many Requests to Mouser API');
          (err as { status?: number }).status = 429;
          throw err;
        }

        if (!res.ok) {
          throw new Error(`Mouser API error: HTTP ${res.status} ${res.statusText}`);
        }

        const data: MouserSearchResponse = await res.json();
        return data;
      });

      const parts = result.SearchResults?.Parts || [];
      const total = result.SearchResults?.NumberOfResult || parts.length;
      return { parts, totalResults: total, isDemo: false };
    } catch (err: unknown) {
      console.warn(`[MouserClient] Keyword search failed for "${keyword}":`, (err as Error).message);
      const mockResults = searchMockCatalog(keyword);
      return {
        parts: mockResults,
        totalResults: mockResults.length,
        isDemo: true,
        error: `Mouser API error: ${(err as Error).message}. (Showing simulated catalog fallback)`,
      };
    }
  }

  /**
   * Create or update a Mouser Shopping Cart
   */
  public async createCart(
    items: MouserCartItem[],
    apiKeyOverride?: string,
    existingCartKey?: string,
    useDemoMode: boolean = false
  ): Promise<MouserCartResponse> {
    const key = apiKeyOverride?.trim() || this.defaultCartKey || process.env.MOUSER_CART_API_KEY || '';

    // In demo mode or if no key is configured, create a realistic mock cart session
    if (useDemoMode || !key) {
      const fakeCartKey =
        existingCartKey ||
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

      let grandTotal = 0;
      const cartItems = items.map((item) => {
        const unitPrice = 2.5; // mock baseline
        const extendedPrice = unitPrice * item.Quantity;
        grandTotal += extendedPrice;

        return {
          MouserPartNumber: item.MouserPartNumber,
          Quantity: item.Quantity,
          CustomerPartNumber: item.CustomerPartNumber,
          UnitPrice: unitPrice,
          ExtendedPrice: extendedPrice,
        };
      });

      return {
        CartKey: fakeCartKey,
        CurrencyCode: 'USD',
        Total: grandTotal,
        CartItems: cartItems,
        CheckoutUrl: `https://www.mouser.com/Cart/?CartKey=${fakeCartKey}`,
      };
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
    if (!apiKey || apiKey.trim().length < 8) {
      return { valid: false, message: 'API key is too short or empty' };
    }

    try {
      const url = `${MOUSER_API_BASE}/search/partnumber?apiKey=${encodeURIComponent(apiKey.trim())}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          SearchByPartRequest: {
            mouserPartNumber: 'STM32F401RET6',
            partSearchOptions: 'string',
          },
        }),
      });

      if (res.status === 401 || res.status === 403) {
        return { valid: false, message: 'Invalid API key or unauthorized' };
      }

      if (res.status === 429) {
        return { valid: true, message: 'Key is valid, but currently rate-limited (HTTP 429)' };
      }

      if (res.ok) {
        return { valid: true, message: 'API Key verified successfully with Mouser' };
      }

      return { valid: false, message: `Mouser responded with HTTP ${res.status}` };
    } catch (err: unknown) {
      return { valid: false, message: (err as Error).message || 'Connection failed' };
    }
  }
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
 * Utility: Parse stock quantity string (e.g. "4,120 In Stock" -> 4120)
 */
export function parseStockQuantity(stockStr: string | undefined): number {
  if (!stockStr) return 0;
  const match = stockStr.replace(/,/g, '').match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// Global client singleton
export const mouserClient = new MouserClient();
