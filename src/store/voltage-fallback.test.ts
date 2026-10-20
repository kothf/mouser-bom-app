import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BOMItem, MouserPart } from '@/lib/mouser/types';
import { queryAndMatchSingleItem } from './bom-store';

function part(description: string, mpn: string): MouserPart {
  return {
    Availability: '100 In Stock',
    AvailabilityInStock: '100',
    Description: `Aluminum Electrolytic Capacitors - Radial Leaded ${description}`,
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
  rawPartNumber: '22uF 400V electrolytic Capacitor',
  requestedQty: 1,
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

function mockSearch(byVoltage: Record<string, MouserPart[]>) {
  const keywords: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const { keyword } = JSON.parse(init.body);
      keywords.push(keyword);
      const v = Object.keys(byVoltage).find((k) => keyword.includes(` ${k} `));
      return { ok: true, json: async () => ({ parts: v ? byVoltage[v] : [] }) };
    })
  );
  return keywords;
}

afterEach(() => vi.unstubAllGlobals());

describe('capacitor voltage fallback', () => {
  it('keeps the asked voltage when it is found', async () => {
    const keywords = mockSearch({ '400V': [part('400V 22uF', 'A400'), part('250V 22uF', 'A250')] });
    const res = await queryAndMatchSingleItem(item, 'mouser', {});
    expect(res.matchedPart?.ManufacturerPartNumber).toBe('A400');
    expect(res.searchNote).toBeUndefined();
    expect(keywords).toEqual(['22uF 400V electrolytic Capacitor']);
  });

  it('steps up to the next voltage, never down', async () => {
    const keywords = mockSearch({
      '400V': [part('250V 22uF', 'A250')],
      '450V': [],
      '500V': [part('500V 22uF', 'A500')],
    });
    const res = await queryAndMatchSingleItem(item, 'mouser', {});
    expect(res.matchedPart?.ManufacturerPartNumber).toBe('A500');
    expect(res.searchNote).toBe('No 400V part found, picked a 500V one');
    expect(keywords).toEqual([
      '22uF 400V electrolytic Capacitor',
      '22uF 450V electrolytic Capacitor',
      '22uF 500V electrolytic Capacitor',
    ]);
  });

  it('works for DigiKey too', async () => {
    mockSearch({ '400V': [], '450V': [part('450V 22uF', 'D450')] });
    const res = await queryAndMatchSingleItem({ ...item, smd: false }, 'digikey', {});
    expect(res.matchedPart?.ManufacturerPartNumber).toBe('D450');
  });
});
