import { describe, expect, it } from 'vitest';
import type { MouserPart } from '../mouser/types';
import {
  higherRatings,
  partsRatedBetween,
  partVoltage,
  requestedCapacitorVoltage,
  voltagesInText,
  withVoltage,
} from './voltage';

function part(fields: Partial<MouserPart>): MouserPart {
  return {
    Availability: '',
    Description: '',
    FactoryStock: '0',
    Manufacturer: '',
    ManufacturerPartNumber: 'X',
    Min: '1',
    Mult: '1',
    MouserPartNumber: 'X',
    ProductDetailUrl: '',
    PriceBreaks: [],
    ...fields,
  };
}

describe('voltagesInText', () => {
  it('reads plain, kilo and DC/AC voltages', () => {
    expect(voltagesInText('Aluminum Electrolytic Capacitors - Radial Leaded 450V 22uF 20%')).toEqual([450]);
    expect(voltagesInText('CAP FILM 0.1UF 10% 1KV AXIAL')).toEqual([1000]);
    expect(voltagesInText('630VDC 47nF')).toEqual([630]);
    expect(voltagesInText('6.3V 1000uF')).toEqual([6.3]);
  });

  it('ignores words that only contain a V', () => {
    expect(voltagesInText('VDC rated 22uF')).toEqual([]);
  });
});

describe('requestedCapacitorVoltage', () => {
  it('only applies to capacitors', () => {
    expect(requestedCapacitorVoltage('22uF 400V electrolytic Capacitor', 'Capacitor')).toBe(400);
    expect(requestedCapacitorVoltage('100k 1W Resistor', 'Resistor')).toBeNull();
    expect(requestedCapacitorVoltage('22uF electrolytic Capacitor', 'Capacitor')).toBeNull();
  });
});

describe('partVoltage', () => {
  it('prefers the DigiKey Voltage - Rated parameter', () => {
    expect(partVoltage(part({ VoltageRating: '500V', Description: 'CAP ALUM 22UF' }))).toBe(500);
  });

  it('falls back to the description', () => {
    expect(partVoltage(part({ Description: 'Film Capacitors 630V 0.022uF' }))).toBe(630);
    expect(partVoltage(part({ Description: 'Film Capacitors 0.022uF' }))).toBeNull();
  });
});

describe('higherRatings', () => {
  it('steps up through the standard ratings, never down', () => {
    expect(higherRatings(400)).toEqual([450, 500, 550]);
    expect(higherRatings(630, 2)).toEqual([700, 750]);
    expect(higherRatings(375)).toEqual([400, 450, 500]);
  });
});

describe('withVoltage', () => {
  it('swaps the voltage in a query', () => {
    expect(withVoltage('22uF 400V electrolytic Capacitor', 450)).toBe('22uF 450V electrolytic Capacitor');
    expect(withVoltage('47nF 630VDC film Capacitor', 1000)).toBe('47nF 1kVDC film Capacitor');
  });
});

describe('partsRatedBetween', () => {
  it('keeps parts rated in range and drops lower or unknown ratings', () => {
    const p250 = part({ Description: '22uF 250V' });
    const p400 = part({ Description: '22uF 400V' });
    const p450 = part({ Description: '22uF 450V' });
    const pNone = part({ Description: '22uF' });
    const all = [p250, p400, p450, pNone];
    expect(partsRatedBetween(all, 400, 400)).toEqual([p400]);
    expect(partsRatedBetween(all, 400, 450)).toEqual([p400, p450]);
    expect(partsRatedBetween([p250, pNone], 400)).toEqual([]);
  });
});
