import { afterEach, describe, expect, it, vi } from 'vitest';
import { keywordSearch } from './keyword';

afterEach(() => vi.unstubAllGlobals());

function mockFetch(byStockFilter: { inStock: unknown[]; any: unknown[] }) {
  const calls: { url: string; inStockOnly: boolean }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { body: string }) => {
      const { inStockOnly } = JSON.parse(init.body);
      calls.push({ url, inStockOnly });
      return { ok: true, json: async () => ({ parts: inStockOnly ? byStockFilter.inStock : byStockFilter.any }) };
    })
  );
  return calls;
}

describe('keywordSearch', () => {
  it('asks for in-stock parts first and stops when it finds some', async () => {
    const calls = mockFetch({ inStock: [{ MouserPartNumber: 'A' }], any: [] });
    const res = await keywordSearch('digikey', {}, '22uF 450V Capacitor');
    expect(res.parts).toHaveLength(1);
    expect(calls).toEqual([{ url: '/api/digikey/search/keyword', inStockOnly: true }]);
  });

  it('searches without the filter when nothing is in stock', async () => {
    const calls = mockFetch({ inStock: [], any: [{ MouserPartNumber: 'B' }] });
    const res = await keywordSearch('mouser', {}, '22uF 450V Capacitor');
    expect(res.parts).toHaveLength(1);
    expect(calls.map((c) => c.inStockOnly)).toEqual([true, false]);
  });
});
