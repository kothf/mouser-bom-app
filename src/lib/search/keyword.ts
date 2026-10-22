import type { MouserPart } from '../mouser/types';
import { Supplier, supplierApiPath } from '../supplier';

export interface KeywordResult {
  parts?: MouserPart[];
  totalResults?: number;
  error?: string;
}

export function isAuthError(message?: string): boolean {
  return Boolean(message) && /api key|unauthorized|forbidden|quota|rate limit|identifier|rejected|authoriz|client id|secret/i.test(message!);
}

/**
 * Keyword search through the app's API, in-stock parts first: the supplier
 * is asked for parts in stock, and only when it has none is the search run
 * again without the filter, so out-of-stock parts never crowd out stocked
 * ones in the 50 results. DigiKey marketplace listings are always left out.
 */
export async function keywordSearch(
  supplier: Supplier,
  headers: Record<string, string>,
  keyword: string,
  records: number = 50
): Promise<KeywordResult> {
  const call = async (inStockOnly: boolean): Promise<KeywordResult> => {
    const res = await fetch(supplierApiPath(supplier, 'search/keyword'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ keyword, records, inStockOnly }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const stocked = await call(true);
  if ((stocked.parts && stocked.parts.length > 0) || isAuthError(stocked.error)) return stocked;
  return call(false);
}
