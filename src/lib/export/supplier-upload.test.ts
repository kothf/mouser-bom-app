import { describe, expect, it } from 'vitest';
import type { BOMItem, MouserPart } from '../mouser/types';
import { buildSupplierUploadRows } from './excel-export';

function item(fields: Partial<BOMItem>): BOMItem {
  return {
    id: 'i',
    lineNumber: 1,
    designator: 'R1, R2',
    rawPartNumber: 'MFR-25FBF52-100K',
    requestedQty: 2,
    status: 'matched',
    unitPrice: 0.1,
    extendedPrice: 0.2,
    currency: 'USD',
    availableStock: 100,
    moq: 1,
    orderMultiple: 1,
    meetsMoq: true,
    meetsMultiple: true,
    ...fields,
  };
}

const part = {
  MouserPartNumber: '603-MFR-25FBF52-100K',
  ManufacturerPartNumber: 'MFR-25FBF52-100K',
  Manufacturer: 'YAGEO',
  Description: 'Metal Film Resistors - Through Hole\n100K ohm',
} as MouserPart;

describe('buildSupplierUploadRows', () => {
  it('uses the Mouser BOM Tool columns', () => {
    expect(buildSupplierUploadRows([item({ matchedPart: part })], 'mouser')).toEqual([
      {
        'Mouser Part Number': '603-MFR-25FBF52-100K',
        'Manufacturer Part Number': 'MFR-25FBF52-100K',
        'Manufacturer': 'YAGEO',
        'Description': 'Metal Film Resistors - Through Hole 100K ohm',
        'Customer Part Number': 'R1, R2',
        'Quantity': 2,
      },
    ]);
  });

  it('uses the DigiKey BOM Manager columns', () => {
    const [row] = buildSupplierUploadRows([item({ matchedPart: { ...part, MouserPartNumber: '13-MFR-25FBF52-100KCT-ND' } })], 'digikey');
    expect(Object.keys(row)).toEqual([
      'Quantity',
      'Digi-Key Part Number',
      'Manufacturer Part Number',
      'Manufacturer',
      'Description',
      'Customer Reference',
      'Reference Designator',
    ]);
    expect(row['Digi-Key Part Number']).toBe('13-MFR-25FBF52-100KCT-ND');
  });

  it('keeps unresolved part numbers but drops unresolved keyword queries', () => {
    const rows = buildSupplierUploadRows(
      [
        item({ status: 'unresolved', rawPartNumber: 'LM358N' }),
        item({ status: 'unresolved', searchMode: 'keyword', rawPartNumber: '22uF 450V Capacitor' }),
      ],
      'mouser'
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]['Manufacturer Part Number']).toBe('LM358N');
    expect(rows[0]['Mouser Part Number']).toBe('');
  });
});
