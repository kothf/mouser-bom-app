import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildCadConfig,
  cadLinesToBomItems,
  categoriesToText,
  columnsToText,
  DEFAULT_CAD_CATEGORIES,
  DEFAULT_CAD_COLUMNS,
  expandDesignatorToken,
  normalizeCapacitance,
  normalizePower,
  normalizeResistance,
  normalizeVoltage,
  parseCadBom,
  textToCategories,
} from './cad-keyword-parser';

describe('value normalisation', () => {
  it('normalises capacitance including RKM notation', () => {
    expect(normalizeCapacitance('22uF')).toBe('22uF');
    expect(normalizeCapacitance('0,1µF')).toBe('0.1uF');
    expect(normalizeCapacitance('4n7')).toBe('4.7nF');
    expect(normalizeCapacitance('2u2')).toBe('2.2uF');
    expect(normalizeCapacitance('100p')).toBe('100pF');
    expect(normalizeCapacitance('1N4007')).toBeNull();
  });

  it('normalises resistance', () => {
    expect(normalizeResistance('100k')).toBe('100k Ohm');
    expect(normalizeResistance('4k7')).toBe('4.7k Ohm');
    expect(normalizeResistance('1M5')).toBe('1.5M Ohm');
    expect(normalizeResistance('470R')).toBe('470 Ohm');
    expect(normalizeResistance('220ohm')).toBe('220 Ohm');
    expect(normalizeResistance('100')).toBeNull();
    expect(normalizeResistance('100', true)).toBe('100 Ohm');
  });

  it('normalises voltage and power', () => {
    expect(normalizeVoltage('450v')).toBe('450V');
    expect(normalizeVoltage('630VDC')).toBe('630VDC');
    expect(normalizeVoltage('6V6')).toBeNull();
    expect(normalizePower('1/2W')).toBe('0.5W');
    expect(normalizePower('5w')).toBe('5W');
  });

  it('expands designator ranges only for known prefixes', () => {
    const prefixes = ['VR', 'R', 'C', 'V'];
    expect(expandDesignatorToken('R1-R4', prefixes)).toEqual(['R1', 'R2', 'R3', 'R4']);
    expect(expandDesignatorToken('c3-5', prefixes)).toEqual(['C3', 'C4', 'C5']);
    expect(expandDesignatorToken('VR2', prefixes)).toEqual(['VR2']);
    expect(expandDesignatorToken('EL34', prefixes)).toBeNull();
    expect(expandDesignatorToken('12AX7', prefixes)).toBeNull();
  });
});

describe('parseCadBom', () => {
  it('parses free-form lines with type keywords and merges duplicates', () => {
    const text = [
      'C1 Cap 22uF 450V electrolytic',
      'C2 Cap 22uF 450V electrolytic',
      'R1-R4 Res 100k 1W',
      'V1 Tube 12AX7',
      'V2 Valve EL34',
      'D1 Diode 1N4007',
    ].join('\n');

    const { lines, unmatched, headerDetected } = parseCadBom(text);
    expect(headerDetected).toBe(false);
    expect(unmatched).toEqual([]);

    const cap = lines.find((l) => l.category === 'Capacitor');
    expect(cap).toMatchObject({ value: '22uF', voltage: '450V', quantity: 2, designators: ['C1', 'C2'] });
    expect(cap?.query).toBe('22uF 450V electrolytic Capacitor');

    const res = lines.find((l) => l.category === 'Resistor');
    expect(res).toMatchObject({ value: '100k Ohm', power: '1W', quantity: 4 });
    expect(res?.query).toBe('100k Ohm 1W Resistor');

    const tubes = lines.filter((l) => l.category === 'Vacuum Tube').map((l) => l.query);
    expect(tubes).toEqual(['12AX7 Vacuum Tube', 'EL34 Vacuum Tube']);

    expect(lines.find((l) => l.category === 'Diode')?.query).toBe('1N4007 Diode');
  });

  it('infers category from designator prefix when no keyword is present', () => {
    const { lines } = parseCadBom('R7 4k7\nC9 4n7 630V film');
    expect(lines.map((l) => l.query)).toEqual(['4.7k Ohm Resistor', '4.7nF 630V film Capacitor']);
  });

  it('parses delimited exports with a header row', () => {
    const text = [
      'Ref;Type;Value;Voltage;Qty',
      'C1;Cap;47uF;500;1',
      'R1, R2;Res;220;;2',
      'VR1;Pot;1M audio;;1',
    ].join('\n');

    const { lines, headerDetected, unmatched } = parseCadBom(text);
    expect(headerDetected).toBe(true);
    expect(unmatched).toEqual([]);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ category: 'Capacitor', value: '47uF', voltage: '500V', quantity: 1 });
    expect(lines[1]).toMatchObject({ category: 'Resistor', value: '220 Ohm', quantity: 2, designators: ['R1', 'R2'] });
    expect(lines[2].query).toBe('1M Ohm audio Potentiometer');
  });

  it('handles quoted CSV cells and quantity markers', () => {
    const text = ['Cap,"0.022uF",630V,x3', 'Resistor,1k5,"1/2W",qty 2'].join('\n');
    const { lines } = parseCadBom(text);
    expect(lines[0]).toMatchObject({ value: '0.022uF', voltage: '630V', quantity: 3 });
    expect(lines[1]).toMatchObject({ value: '1.5k Ohm', power: '0.5W', quantity: 2 });
  });

  it('reports lines it cannot classify', () => {
    const { lines, unmatched } = parseCadBom('Chassis aluminium\nC1 Cap');
    expect(lines).toHaveLength(0);
    expect(unmatched.map((u) => u.lineNumber)).toEqual([1, 2]);
  });

  it('respects custom keyword rules', () => {
    const config = buildCadConfig('Capacitor: kondensator | K\nResistor: widerstand | W');
    const { lines } = parseCadBom('K1 kondensator 100nF\nW1 widerstand 10k', config);
    expect(lines.map((l) => l.query)).toEqual(['100nF Capacitor', '10k Ohm Resistor']);
  });

  it('converts lines into keyword-search BOM items', () => {
    const { lines } = parseCadBom('C1 Cap 22uF 450V');
    const items = cadLinesToBomItems(lines);
    expect(items[0]).toMatchObject({
      rawPartNumber: '22uF 450V Capacitor',
      requestedQty: 1,
      designator: 'C1',
      searchMode: 'keyword',
      status: 'pending',
    });
  });
});

describe('rule text round-trip', () => {
  it('serialises and parses category rules', () => {
    expect(textToCategories(categoriesToText(DEFAULT_CAD_CATEGORIES))).toEqual(DEFAULT_CAD_CATEGORIES);
  });

  it('serialises column rules', () => {
    expect(buildCadConfig(undefined, columnsToText(DEFAULT_CAD_COLUMNS)).columns).toEqual(DEFAULT_CAD_COLUMNS);
  });
});

describe('Rating/Data column', () => {
  it('takes capacitor and resistor ratings from the Rating/Data column', () => {
    const text = [
      'Ref,Type,Value,Rating/Data',
      'C1,Cap,22uF,450V electrolytic',
      'C2,Cap,0.022uF,630',
      'R1,Res,100k,1W 5% metal film',
      'R2,Res,1k5,2',
      'V1,Tube,12AX7,6.3V heater',
    ].join('\n');

    const { lines, headerDetected, unmatched } = parseCadBom(text);
    expect(headerDetected).toBe(true);
    expect(unmatched).toEqual([]);
    expect(lines.map((l) => l.query)).toEqual([
      '22uF 450V electrolytic Capacitor',
      '0.022uF 630V Capacitor',
      '100k Ohm 1W 5% metal film Resistor',
      '1.5k Ohm 2W Resistor',
      '12AX7 Vacuum Tube',
    ]);
  });

  it('maps a plain Rating header to the rating column', () => {
    const { lines } = parseCadBom('Ref;Type;Value;Rating\nR1;Res;220k;0.5W');
    expect(lines[0]).toMatchObject({ value: '220k Ohm', power: '0.5W' });
  });
});

describe('fixed-width text tables', () => {
  const table = [
    'Item  Qty  Designators  Description                Value   Rating / data            Part number',
    '----  ---  -----------  -------------------------  ------  -----------------------  -----------',
    '   1    2  BA1, BA2     Loudspeaker                4Ω',
    '   2    1  C1           Capacitor                  6.8µF   630 V (433 V working)',
    '   3    1  C2           Capacitor, electrolytic    220µF   500 V',
    '   8    2  C7, C8       Capacitor, electrolytic    220µF   100 V',
    '   9    1  R1           Resistor, metal film       100kΩ   1 W',
    '  11    1  V1           Tube                       ECC83',
  ];
  const expected = [
    '4 Ohm Loudspeaker',
    '6.8uF 630V Capacitor',
    '220uF 500V electrolytic Capacitor',
    '220uF 100V electrolytic Capacitor',
    '100k Ohm 1W metal film Resistor',
    'ECC83 Vacuum Tube',
  ];

  it('splits columns by the ruler line and takes voltage and wattage from Rating / data', () => {
    const { lines, headerDetected, unmatched } = parseCadBom(table.join('\n'));
    expect(headerDetected).toBe(true);
    expect(unmatched).toEqual([]);
    expect(lines.map((l) => l.query)).toEqual(expected);
    expect(lines[0]).toMatchObject({ designators: ['BA1', 'BA2'], quantity: 2 });
    expect(lines[3]).toMatchObject({ designators: ['C7', 'C8'], quantity: 2 });
  });

  it('splits columns by header positions when there is no ruler line', () => {
    const { lines, unmatched } = parseCadBom(table.filter((_, i) => i !== 1).join('\n'));
    expect(unmatched).toEqual([]);
    expect(lines.map((l) => l.query)).toEqual(expected);
  });
});

describe('real exports with title lines above the table', () => {
  it('parses the GUB-245-01 fixed-width BOM with ratings from Rating / data, not Sim. max', () => {
    const text = readFileSync(join(__dirname, '__fixtures__', 'GUB-245-01-BOM.txt'), 'utf8');
    const { lines, headerDetected, unmatched } = parseCadBom(text);
    expect(headerDetected).toBe(true);
    const byRef = (ref: string) => lines.find((l) => l.designators.includes(ref))?.query;
    expect(byRef('BA1')).toBe('4 Ohm Loudspeaker');
    expect(byRef('C1')).toBe('6.8uF 400V Capacitor');
    expect(byRef('C3')).toBe('470uF 100V electrolytic Capacitor');
    expect(byRef('C7')).toBe('220uF 6.3V electrolytic Capacitor');
    expect(byRef('R1')).toBe('180 Ohm 5W Resistor');
    expect(byRef('R5')).toBe('470k Ohm 0.25W Resistor');
    expect(byRef('T1')).toBe('Hammond 373BX Transformer');
    expect(byRef('VL1')).toBe('5Ts4S Vacuum Tube');
    expect(byRef('VL3')).toBe('6P14P Vacuum Tube');
    expect(lines.filter((l) => l.category === 'Tube Socket').map((l) => l.quantity)).toEqual([1, 3]);
    // Only the "26 lines, 41 parts" footer is left over.
    expect(unmatched.map((u) => u.text)).toEqual(['26 lines, 41 parts']);
  });

  const rows = [
    ['Item', 'Qty', 'Designators', 'Description', 'Value', 'Rating / data', 'Sim. max'],
    ['1', '1', 'C1', 'Capacitor', '6.8µF', '400 V', '320V'],
    ['2', '2', 'R1, R2', 'Resistor', '180Ω', '5 W', '21.1W'],
  ];
  const expected = ['6.8uF 400V Capacitor', '180 Ohm 5W Resistor'];

  it('handles CSV with title lines', () => {
    const csv = ['BILL OF MATERIALS', 'Amp, rev. A', '', ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const { lines, headerDetected } = parseCadBom(csv);
    expect(headerDetected).toBe(true);
    expect(lines.map((l) => l.query)).toEqual(expected);
  });

  it('handles spreadsheet rows converted with ; and empty title cells', () => {
    const sheet = ['BILL OF MATERIALS;;;;;;', ';;;;;;', ...rows.map((r) => r.join(';'))].join('\n');
    expect(parseCadBom(sheet).lines.map((l) => l.query)).toEqual(expected);
  });

  it('handles tab-separated exports', () => {
    const tsv = ['BILL OF MATERIALS', ...rows.map((r) => r.join('\t'))].join('\n');
    expect(parseCadBom(tsv).lines.map((l) => l.query)).toEqual(expected);
  });
});
