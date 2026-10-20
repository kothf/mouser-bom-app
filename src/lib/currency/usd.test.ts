import { afterEach, describe, expect, it, vi } from 'vitest';
import { convertPartsToUsd, resetUsdRatesCache } from './usd';
import { MouserPart } from '@/lib/mouser/types';

function part(breaks: { Quantity: number; Price: string; Currency: string }[]): MouserPart {
  return { Description: 'test', PriceBreaks: breaks } as unknown as MouserPart;
}

afterEach(() => {
  vi.unstubAllGlobals();
  resetUsdRatesCache();
});

describe('convertPartsToUsd', () => {
  it('leaves USD prices alone without fetching rates', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const parts = [part([{ Quantity: 1, Price: '$1.20', Currency: 'USD' }])];
    expect(await convertPartsToUsd(parts)).toEqual(parts);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('converts EUR and ILS price breaks to USD', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ rates: { EUR: 0.5, ILS: 4 } }), { status: 200 }))
    );
    const [p] = await convertPartsToUsd([
      part([
        { Quantity: 1, Price: '1,20 €', Currency: 'EUR' },
        { Quantity: 100, Price: '₪0.40', Currency: 'ILS' },
      ]),
    ]);
    expect(p.PriceBreaks).toEqual([
      { Quantity: 1, Price: '$2.40', Currency: 'USD' },
      { Quantity: 100, Price: '$0.10000', Currency: 'USD' },
    ]);
  });

  it('falls back to the second rate source', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('down', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ rates: { GBP: 0.8 } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const [p] = await convertPartsToUsd([part([{ Quantity: 1, Price: '£8.00', Currency: 'GBP' }])]);
    expect(p.PriceBreaks?.[0]).toEqual({ Quantity: 1, Price: '$10.00', Currency: 'USD' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the original price when no rates are reachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    const parts = [part([{ Quantity: 1, Price: '1,20 €', Currency: 'EUR' }])];
    expect(await convertPartsToUsd(parts)).toEqual(parts);
  });
});
