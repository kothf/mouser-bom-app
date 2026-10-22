import { afterEach, describe, expect, it, vi } from 'vitest';
import { convertCartToUsd, convertPartsToUsd, resetUsdRatesCache } from './usd';
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

  it('uses the built-in rate when no rate source is reachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    const [p] = await convertPartsToUsd([part([{ Quantity: 1, Price: '₪3.30', Currency: 'ILS' }])]);
    expect(p.PriceBreaks?.[0]).toEqual({ Quantity: 1, Price: '$1.00', Currency: 'USD' });
  });

  it('keeps a price in a currency with no known rate', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })));
    const parts = [part([{ Quantity: 1, Price: '5.00', Currency: 'XYZ' }])];
    expect(await convertPartsToUsd(parts)).toEqual(parts);
  });
});

describe('convertCartToUsd', () => {
  it('converts the cart total and line prices', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ rates: { EUR: 0.5 } }), { status: 200 }))
    );
    const cart = await convertCartToUsd({
      CartKey: 'k',
      CurrencyCode: 'EUR',
      Total: 5,
      CartItems: [{ MouserPartNumber: 'A', Quantity: 2, UnitPrice: 2.5, ExtendedPrice: 5 }],
    });
    expect(cart.CurrencyCode).toBe('USD');
    expect(cart.Total).toBe(10);
    expect(cart.CartItems?.[0]).toMatchObject({ UnitPrice: 5, ExtendedPrice: 10 });
  });
});
