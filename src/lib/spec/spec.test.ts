import { describe, expect, it } from 'vitest';
import type { MouserPart } from '../mouser/types';
import { fitsSpec, querySpec, specFit } from './spec';

function part(description: string, extra: Partial<MouserPart> = {}): MouserPart {
  return {
    Availability: '100 In Stock',
    AvailabilityInStock: '100',
    Description: description,
    FactoryStock: '0',
    Manufacturer: 'M',
    ManufacturerPartNumber: 'X',
    Min: '1',
    Mult: '1',
    MouserPartNumber: 'X',
    ProductDetailUrl: '',
    PriceBreaks: [],
    ...extra,
  };
}

describe('querySpec', () => {
  it('reads capacitor values', () => {
    expect(querySpec('22uF 450V electrolytic Capacitor', 'Capacitor')).toEqual({ capacitance: 22e6, voltage: 450 });
    expect(querySpec('4n7 630V Capacitor', 'Capacitor').capacitance).toBeCloseTo(4700);
  });

  it('reads resistor values, wattage and tolerance', () => {
    expect(querySpec('100k Ohm 1W Resistor', 'Resistor')).toEqual({ resistance: 1e5, power: 1 });
    expect(querySpec('4K7 1/4W 1% Resistor', 'Resistor')).toEqual({ resistance: 4700, power: 0.25, tolerance: 1 });
    expect(querySpec('1M Ohm audio Potentiometer', 'Potentiometer')).toEqual({ resistance: 1e6 });
  });

  it('does not read a tube name as a value', () => {
    expect(querySpec('12AX7 Vacuum Tube', 'Vacuum Tube')).toEqual({});
  });
});

describe('specFit', () => {
  const cap = querySpec('22uF 50V Capacitor', 'Capacitor');

  it('no longer finds 50V inside 250V', () => {
    expect(specFit(part('CAP ALUM 22UF 20% 250V RADIAL'), cap).matched).toContain('voltage');
    expect(fitsSpec(part('CAP ALUM 22UF 20% 35V RADIAL'), cap)).toBe(false);
  });

  it('compares values in any notation', () => {
    const want = querySpec('100nF 100V Capacitor', 'Capacitor');
    expect(specFit(part('Film Capacitors 100V 0.1uF 5%'), want).matched).toEqual(['capacitance', 'voltage']);
    expect(fitsSpec(part('Film Capacitors 100V 0.22uF 5%'), want)).toBe(false);
  });

  it('reads 1/4W and needs equal or higher wattage', () => {
    const want = querySpec('100k Ohm 0.25W Resistor', 'Resistor');
    expect(specFit(part('Metal Film Resistors - Through Hole 100K OHM 1% 1/4W'), want).matched).toEqual([
      'resistance',
      'power',
    ]);
    expect(fitsSpec(part('RES 100K OHM 1% 1/2W AXIAL'), want)).toBe(true);
    // 0.1W is not taken as 1W.
    expect(fitsSpec(part('RES 100K OHM 1% 0.1W 0603'), querySpec('100k Ohm 1W Resistor', 'Resistor'))).toBe(false);
  });

  it('wants the same or a tighter tolerance', () => {
    const want = querySpec('10k 1% Resistor', 'Resistor');
    expect(fitsSpec(part('RES 10K OHM 0.1% 1/4W'), want)).toBe(true);
    expect(fitsSpec(part('RES 10K OHM 5% 1/4W'), want)).toBe(false);
  });

  it('uses DigiKey parameters and leaves unknown fields neutral', () => {
    const want = querySpec('47uF 450V Capacitor', 'Capacitor');
    expect(specFit(part('ALUMINUM ELECTROLYTIC', { SpecText: '47 µF', VoltageRating: '450V' }), want).matched).toEqual([
      'capacitance',
      'voltage',
    ]);
    expect(specFit(part('Electrolytic capacitor'), want)).toEqual({ matched: [], missed: [] });
  });
});
