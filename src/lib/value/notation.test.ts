import { describe, expect, it } from 'vitest';
import { alternateValueQueries } from './notation';

const forms = (query: string, category?: string) => alternateValueQueries(query, category).map((a) => a.to);

describe('alternateValueQueries', () => {
  it('rewrites capacitances in uF, nF and pF', () => {
    expect(forms('470nF 100V film Capacitor', 'Capacitor')).toEqual(['0.47uF', '470000pF']);
    expect(forms('0.47uF 100V film Capacitor', 'Capacitor')).toEqual(['470nF', '470000pF']);
    expect(forms('0.47µF Capacitor')).toEqual(['470nF', '470000pF']);
    expect(forms('4n7 Capacitor')).toEqual(['0.0047uF', '4.7nF', '4700pF']);
    expect(forms('100pF Capacitor')).toEqual(['0.1nF']);
    expect(forms('22uF 450V Capacitor')).toEqual(['22000nF']);
  });

  it('keeps the rest of the query', () => {
    expect(alternateValueQueries('470nF 100V film Capacitor', 'Capacitor')[0].query).toBe('0.47uF 100V film Capacitor');
  });

  it('rewrites resistances', () => {
    expect(forms('4.7k Ohm 0.5W Resistor', 'Resistor')).toEqual(['4K7', '4700 Ohm']);
    expect(forms('4K7 Resistor')).toEqual(['4.7k Ohm', '4700 Ohm']);
    expect(forms('470 Ohm Resistor', 'Resistor')).toEqual(['470R']);
    expect(forms('1M5 Resistor')).toEqual(['1.5M Ohm', '1500k Ohm']);
    expect(forms('100k Ohm Pot', 'Pot')).toEqual(['100000 Ohm']);
  });

  it('leaves other lines alone', () => {
    expect(forms('12AX7 Tube', 'Tube')).toEqual([]);
    expect(forms('22uF 450V electrolytic', 'Resistor')).toEqual([]);
  });
});
