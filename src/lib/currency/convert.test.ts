import { describe, expect, it } from 'vitest';
import { convertBomItemWithRates } from './convert';
import { BOMItem, MouserPart } from '@/lib/mouser/types';

const rates = { USD: 1, ILS: 4 };

function item(over: Partial<BOMItem>): BOMItem {
  return {
    id: '1',
    lineNumber: 1,
    designator: 'R1',
    rawPartNumber: 'X',
    requestedQty: 10,
    status: 'matched',
    unitPrice: 0,
    extendedPrice: 0,
    currency: 'USD',
    availableStock: 100,
    moq: 1,
    orderMultiple: 1,
    meetsMoq: true,
    meetsMultiple: true,
    isCustomPart: false,
    ...over,
  } as BOMItem;
}

describe('convertBomItemWithRates', () => {
  it('re-prices a saved line from its converted price breaks', () => {
    const matchedPart = {
      PriceBreaks: [
        { Quantity: 1, Price: '₪2.00', Currency: 'ILS' },
        { Quantity: 10, Price: '₪1.00', Currency: 'ILS' },
      ],
    } as unknown as MouserPart;
    const out = convertBomItemWithRates(item({ matchedPart, unitPrice: 1, extendedPrice: 10, currency: 'ILS' }), rates);
    expect(out.currency).toBe('USD');
    expect(out.unitPrice).toBeCloseTo(0.25);
    expect(out.extendedPrice).toBeCloseTo(2.5);
  });

  it('converts a line that only has a unit price', () => {
    const out = convertBomItemWithRates(item({ unitPrice: 8, extendedPrice: 80, currency: '₪' }), rates);
    expect(out).toMatchObject({ unitPrice: 2, extendedPrice: 20, currency: 'USD' });
  });

  it('shows no price for a line whose currency has no live rate', () => {
    const out = convertBomItemWithRates(item({ unitPrice: 8, extendedPrice: 80, currency: 'EUR' }), { USD: 1 });
    expect(out).toMatchObject({ unitPrice: 0, extendedPrice: 0, currency: 'USD' });
  });

  it('leaves a USD line alone', () => {
    const line = item({ unitPrice: 1, extendedPrice: 10 });
    expect(convertBomItemWithRates(line, rates)).toBe(line);
  });
});
