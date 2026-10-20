import { describe, expect, it } from 'vitest';
import type { MouserPart } from '../mouser/types';
import { manufacturerRule, manufacturerScore, priceScores } from './manufacturers';
import { pickBestKeywordPart } from '@/store/bom-store';

function part(mpn: string, manufacturer: string, price: number, description = 'Aluminum Electrolytic Capacitors - Radial Leaded 22uF 450V'): MouserPart {
  return {
    Availability: '100 In Stock',
    AvailabilityInStock: '100',
    Description: description,
    FactoryStock: '0',
    Manufacturer: manufacturer,
    ManufacturerPartNumber: mpn,
    Min: '1',
    Mult: '1',
    MouserPartNumber: mpn,
    ProductDetailUrl: '',
    PriceBreaks: [{ Quantity: 1, Price: `$${price.toFixed(2)}`, Currency: 'USD' }],
  };
}

describe('manufacturer score', () => {
  it('rates makers by forum reputation', () => {
    expect(manufacturerRule('Nichicon')?.tier).toBe(1);
    expect(manufacturerRule('Vishay / Dale')?.tier).toBe(1);
    expect(manufacturerRule('F&T')?.tier).toBe(1);
    expect(manufacturerRule('YAGEO')?.tier).toBe(2);
    expect(manufacturerRule('Jamicon')?.tier).toBe(3);
    expect(manufacturerRule("Su'scon")?.tier).toBe(4);
    expect(manufacturerScore(part('X', 'Some Unknown Co', 1))).toBe(50);
  });

  it('does not match a name inside another word', () => {
    expect(manufacturerRule('Boston Electronics')).toBeUndefined();
  });

  it('scores price against the cheapest candidate', () => {
    const a = part('A', 'Nichicon', 1);
    const b = part('B', 'Nichicon', 2);
    const none = { ...part('C', 'Nichicon', 1), PriceBreaks: [] };
    const scores = priceScores([a, b, none], 1);
    expect([scores.get(a), scores.get(b), scores.get(none)]).toEqual([100, 50, 0]);
  });
});

describe('pickBestKeywordPart with manufacturer and price', () => {
  it('prefers a well-rated maker at a similar price', () => {
    const best = pickBestKeywordPart([part('J', 'Jamicon', 1), part('N', 'Nichicon', 1.1)], '22uF 450V Capacitor', 1);
    expect(best?.ManufacturerPartNumber).toBe('N');
  });

  it('prefers a much cheaper part from an equally rated maker', () => {
    const best = pickBestKeywordPart([part('N1', 'Nichicon', 3), part('N2', 'Rubycon', 1)], '22uF 450V Capacitor', 1);
    expect(best?.ManufacturerPartNumber).toBe('N2');
  });

  it('never trades a matching value for brand or price', () => {
    const wrongVoltage = part('W', 'Nichicon', 0.5, 'Aluminum Electrolytic Capacitors - Radial Leaded 22uF 400V');
    const right = part('R', "Su'scon", 3);
    expect(pickBestKeywordPart([wrongVoltage, right], '22uF 450V Capacitor', 1)?.ManufacturerPartNumber).toBe('R');
  });
});
