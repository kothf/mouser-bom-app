import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BOMItem, MouserPart } from '@/lib/mouser/types';
import { queryAndMatchSingleItem } from './bom-store';

function part(mpn: string, stock: number, mounting = 'Film Capacitors - Radial Leaded'): MouserPart {
  return {
    Availability: `${stock} In Stock`,
    AvailabilityInStock: String(stock),
    Description: `${mounting} 100V`,
    FactoryStock: '0',
    Manufacturer: 'M',
    ManufacturerPartNumber: mpn,
    Min: '1',
    Mult: '1',
    MouserPartNumber: mpn,
    ProductDetailUrl: '',
    PriceBreaks: [{ Quantity: 1, Price: '$1.00', Currency: 'USD' }],
  };
}

const item: BOMItem = {
  id: 'c1',
  lineNumber: 1,
  designator: 'C1',
  rawPartNumber: '470nF 100V film Capacitor',
  requestedQty: 2,
  status: 'pending',
  unitPrice: 0,
  extendedPrice: 0,
  currency: 'USD',
  availableStock: 0,
  moq: 1,
  orderMultiple: 1,
  meetsMoq: true,
  meetsMultiple: true,
  searchMode: 'keyword',
  category: 'Capacitor',
};

function mockSearch(byValue: Record<string, MouserPart[]>) {
  const keywords: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const { keyword } = JSON.parse(init.body);
      // An empty in-stock search is repeated without the filter; list each query once.
      if (keywords[keywords.length - 1] !== keyword) keywords.push(keyword);
      const v = Object.keys(byValue).find((k) => keyword.startsWith(`${k} `));
      return { ok: true, json: async () => ({ parts: v ? byValue[v] : [] }) };
    })
  );
  return keywords;
}

afterEach(() => vi.unstubAllGlobals());

describe('zero-stock value notation fallback', () => {
  it('does not search other notations when the part is in stock', async () => {
    const keywords = mockSearch({ '470nF': [part('N470', 10)] });
    const res = await queryAndMatchSingleItem(item, 'mouser', {});
    expect(res.matchedPart?.ManufacturerPartNumber).toBe('N470');
    expect(keywords).toEqual(['470nF 100V film Capacitor']);
  });

  it('finds the part written as 0.47uF when 470nF has no stock', async () => {
    const keywords = mockSearch({ '470nF': [part('N470', 0)], '0.47uF': [part('U047', 50)] });
    const res = await queryAndMatchSingleItem(item, 'mouser', {});
    expect(res.matchedPart?.ManufacturerPartNumber).toBe('U047');
    expect(res.status).toBe('matched');
    expect(res.searchNote).toBe('None in stock as 470nF, found as 0.47uF');
    expect(keywords).toEqual(['470nF 100V film Capacitor', '0.47uF 100V film Capacitor']);
  });

  it('skips an SMD alternative when the SMD box is not ticked', async () => {
    mockSearch({
      '470nF': [part('N470', 0)],
      '0.47uF': [part('SMD047', 50, 'Multilayer Ceramic Capacitors MLCC - SMD/SMT')],
      '470000pF': [part('P470', 5)],
    });
    const res = await queryAndMatchSingleItem(item, 'mouser', {});
    expect(res.matchedPart?.ManufacturerPartNumber).toBe('P470');
  });

  it('keeps the original match when no notation has stock', async () => {
    mockSearch({ '470nF': [part('N470', 0)] });
    const res = await queryAndMatchSingleItem(item, 'mouser', {});
    expect(res.matchedPart?.ManufacturerPartNumber).toBe('N470');
    expect(res.status).toBe('low_stock');
    expect(res.searchNote).toBeUndefined();
  });

  it('tries 4K7 and 4700 Ohm for a resistor with no stock', async () => {
    const keywords = mockSearch({ '4K7': [part('R4K7', 100, 'Metal Film Resistors - Through Hole')] });
    const res = await queryAndMatchSingleItem(
      { ...item, rawPartNumber: '4.7k Ohm 0.5W Resistor', category: 'Resistor' },
      'mouser',
      {}
    );
    expect(res.matchedPart?.ManufacturerPartNumber).toBe('R4K7');
    // 4K7 covers the quantity, so 4700 Ohm is never searched.
    expect(keywords).toEqual(['4.7k Ohm 0.5W Resistor', '4K7 0.5W Resistor']);
  });
});
