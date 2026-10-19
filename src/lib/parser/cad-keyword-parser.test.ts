import { describe, expect, it } from 'vitest';
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
