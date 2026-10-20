import { describe, expect, it } from 'vitest';
import type { MouserPart } from '../mouser/types';
import { mountingKeyword, mountingScore, partMounting } from './mounting';

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

describe('partMounting', () => {
  it('reads Mouser categories', () => {
    expect(partMounting(part({ Category: 'Metal Film Resistors - Through Hole' }))).toBe('tht');
    expect(partMounting(part({ Category: 'Thick Film Resistors - SMD' }))).toBe('smd');
    expect(partMounting(part({ Category: 'Aluminum Electrolytic Capacitors - Radial Leaded' }))).toBe('tht');
    expect(partMounting(part({ Category: 'Multilayer Ceramic Capacitors MLCC - SMD/SMT' }))).toBe('smd');
  });

  it('prefers the DigiKey Mounting Type parameter', () => {
    expect(
      partMounting(part({ Category: 'Aluminum Electrolytic Capacitors', MountingType: 'Surface Mount' }))
    ).toBe('smd');
    expect(partMounting(part({ Category: 'Through Hole Resistors' }))).toBe('tht');
  });

  it('falls back to the description and stays unknown when nothing says', () => {
    expect(partMounting(part({ Description: 'RES 100K OHM 1% 1/4W AXIAL' }))).toBe('tht');
    expect(partMounting(part({ Category: 'Vacuum Tubes', Description: '12AX7 dual triode' }))).toBe('unknown');
  });
});

describe('mountingScore', () => {
  it('rewards the wanted mounting and penalises the other', () => {
    const smd = part({ Category: 'Thick Film Resistors - SMD' });
    const tht = part({ Category: 'Metal Film Resistors - Through Hole' });
    expect(mountingScore(tht, false)).toBe(1);
    expect(mountingScore(smd, false)).toBe(-1);
    expect(mountingScore(smd, true)).toBe(1);
    expect(mountingScore(part({}), true)).toBe(0);
  });
});

describe('mountingKeyword', () => {
  it('adds a mounting word per supplier', () => {
    expect(mountingKeyword('digikey', false)).toBe('through hole');
    expect(mountingKeyword('digikey', true)).toBe('surface mount');
    expect(mountingKeyword('mouser', true)).toBe('SMD');
    expect(mountingKeyword('mouser', false)).toBe('');
  });
});
