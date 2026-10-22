import { describe, expect, it } from 'vitest';
import { detectColumnMapping } from './column-detector';

const MOUSER_UPLOAD = [
  'Mouser Part Number',
  'Manufacturer Part Number',
  'Manufacturer',
  'Description',
  'Customer Part Number',
  'Quantity',
];
const DIGIKEY_UPLOAD = [
  'Quantity',
  'Digi-Key Part Number',
  'Manufacturer Part Number',
  'Manufacturer',
  'Description',
  'Customer Reference',
  'Reference Designator',
];

describe('detectColumnMapping', () => {
  it("uses the active supplier's own part number column", () => {
    expect(detectColumnMapping(MOUSER_UPLOAD, 'mouser').partNumberCol).toBe('Mouser Part Number');
    expect(detectColumnMapping(DIGIKEY_UPLOAD, 'digikey')).toEqual({
      partNumberCol: 'Digi-Key Part Number',
      quantityCol: 'Quantity',
      designatorCol: 'Customer Reference',
      descriptionCol: 'Description',
    });
  });

  it("takes the manufacturer part number over the other supplier's", () => {
    expect(detectColumnMapping(MOUSER_UPLOAD, 'digikey').partNumberCol).toBe('Manufacturer Part Number');
    expect(detectColumnMapping(DIGIKEY_UPLOAD, 'mouser').partNumberCol).toBe('Manufacturer Part Number');
  });

  it("falls back to the other supplier's part number when nothing else fits", () => {
    expect(detectColumnMapping(['Qty', 'DigiKey PN'], 'mouser').partNumberCol).toBe('DigiKey PN');
  });

  it('keeps generic headers working', () => {
    expect(detectColumnMapping(['Part Number', 'Qty', 'RefDes', 'Desc'], 'digikey')).toEqual({
      partNumberCol: 'Part Number',
      quantityCol: 'Qty',
      designatorCol: 'RefDes',
      descriptionCol: 'Desc',
    });
  });
});
