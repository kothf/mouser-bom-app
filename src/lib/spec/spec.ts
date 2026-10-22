import type { MouserPart } from '../mouser/types';
import { voltagesInText } from '../voltage/voltage';

// Component values read as numbers, so "100nF" and "0.1uF", "4K7" and
// "4.7k Ohm", "0.25W" and "1/4W" compare equal, and "50V" no longer counts
// as found in "250V".

export interface Spec {
  /** Picofarads. */
  capacitance?: number;
  /** Ohms. */
  resistance?: number;
  /** Volts. */
  voltage?: number;
  /** Watts. */
  power?: number;
  /** Percent. */
  tolerance?: number;
}

export type SpecField = keyof Spec;

const CAP_PREFIX: Record<string, number> = { p: 1, n: 1e3, u: 1e6, m: 1e9 };
const RES_MULT: Record<string, number> = { r: 1, k: 1e3, m: 1e6 };

const CAP_UNIT = /(?<![\w.,])(\d+(?:[.,]\d+)?)\s?([pnuµμm])F(?![a-z])/gi;
const CAP_CODE = /(?<![\w.,])(\d+)([pnuµμ])(\d{1,2})F?(?![\w.])/gi;
const RES_UNIT = /(?<![\w.,])(\d+(?:[.,]\d+)?)\s?(k|m|meg)?\s?(?:ohms?|Ω)/gi;
const RES_CODE = /(?<![\w.,])(\d+)([RKM])(\d{1,3})?(?![\w.])/gi;
const RES_BARE = /(?<![\w.,])(\d+(?:[.,]\d+)?)([kKmM])(?![\w.])/g;
const POWER_FRACTION = /(?<![\w.,])(\d+)\/(\d+)\s?W(?![a-z])/gi;
const POWER_DECIMAL = /(?<![\w.,/])(\d+(?:[.,]\d+)?)\s?(m)?W(?![a-z])/gi;
const TOLERANCE = /±?\s?(\d+(?:[.,]\d+)?)\s?%/g;

function n(s: string): number {
  return Number(s.replace(',', '.'));
}

function micro(p: string): string {
  return p === 'µ' || p === 'μ' ? 'u' : p;
}

function capacitancesInText(text: string, codes: boolean): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(CAP_UNIT)) {
    // Lower-case "m" before F is milli; capital "MF" is old shorthand for micro.
    const p = m[2] === 'M' ? 'u' : micro(m[2].toLowerCase());
    out.push(n(m[1]) * CAP_PREFIX[p]);
  }
  if (codes) {
    for (const m of text.matchAll(CAP_CODE)) out.push(n(`${m[1]}.${m[3]}`) * CAP_PREFIX[micro(m[2].toLowerCase())]);
  }
  return out.filter((v) => v > 0);
}

function resistancesInText(text: string, codes: boolean): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(RES_UNIT)) {
    const mult = m[2] ? (m[2].toLowerCase() === 'k' ? 1e3 : 1e6) : 1;
    out.push(n(m[1]) * mult);
  }
  if (codes) {
    for (const m of text.matchAll(RES_CODE)) out.push(n(`${m[1]}.${m[3] || '0'}`) * RES_MULT[m[2].toLowerCase()]);
    for (const m of text.matchAll(RES_BARE)) out.push(n(m[1]) * RES_MULT[m[2].toLowerCase()]);
  }
  return out.filter((v) => v > 0);
}

function powersInText(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(POWER_FRACTION)) if (Number(m[2]) > 0) out.push(Number(m[1]) / Number(m[2]));
  for (const m of text.matchAll(POWER_DECIMAL)) out.push(n(m[1]) / (m[2] ? 1000 : 1));
  return out.filter((v) => v > 0);
}

function tolerancesInText(text: string): number[] {
  return [...text.matchAll(TOLERANCE)].map((m) => n(m[1])).filter((v) => v > 0);
}

function isCapacitor(text: string, category?: string): boolean {
  return category ? /cap/i.test(category) : /\bcap(acitor)?s?\b/i.test(text);
}

function isResistor(text: string, category?: string): boolean {
  if (category) return /res|pot/i.test(category);
  return /\b(res(istor)?s?|pot(entiometer)?s?|trimmer)\b|ohm|Ω/i.test(text);
}

/**
 * The values a search asks for ("22uF 450V electrolytic Capacitor").
 * Capacitance is read only on capacitor lines and resistance only on
 * resistor and pot lines, so "4K7" in a tube line is not taken as ohms.
 */
export function querySpec(query: string, category?: string): Spec {
  const spec: Spec = {};
  const cap = isCapacitor(query, category);
  const res = !cap && isResistor(query, category);
  if (cap || !category) {
    const c = capacitancesInText(query, cap);
    if (c.length > 0) spec.capacitance = c[0];
  }
  if (res || (!category && !spec.capacitance)) {
    const r = resistancesInText(query, res);
    if (r.length > 0) spec.resistance = r[0];
  }
  const v = voltagesInText(query);
  if (v.length > 0) spec.voltage = v[0];
  const p = powersInText(query);
  if (p.length > 0) spec.power = p[0];
  const t = tolerancesInText(query);
  if (t.length > 0) spec.tolerance = t[0];
  return spec;
}

/** Every value a part's description and parameters mention, per field. */
export function partSpecValues(part: MouserPart): Record<SpecField, number[]> {
  const text = [part.Description, part.SpecText].filter(Boolean).join(' ');
  return {
    capacitance: capacitancesInText(text, false),
    resistance: resistancesInText(text, true),
    voltage: voltagesInText(`${part.VoltageRating || ''} ${text}`),
    power: powersInText(text),
    tolerance: tolerancesInText(text),
  };
}

function same(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b)) * 0.005;
}

export interface SpecFit {
  /** Fields the part was seen to meet. */
  matched: SpecField[];
  /** Fields the part was seen to miss (wrong value, lower rating, looser tolerance). */
  missed: SpecField[];
}

/**
 * How a part meets the values a search asks for: the value must be equal,
 * voltage and wattage equal or higher, tolerance equal or tighter. A field
 * the part does not mention is neither matched nor missed.
 */
export function specFit(part: MouserPart, wanted: Spec): SpecFit {
  const values = partSpecValues(part);
  const matched: SpecField[] = [];
  const missed: SpecField[] = [];
  const judge = (field: SpecField, ok: (have: number[], want: number) => boolean) => {
    const want = wanted[field];
    const have = values[field];
    if (want === undefined || have.length === 0) return;
    (ok(have, want) ? matched : missed).push(field);
  };
  judge('capacitance', (have, want) => have.some((h) => same(h, want)));
  judge('resistance', (have, want) => have.some((h) => same(h, want)));
  // A rating is the highest one the part lists; a tolerance the loosest.
  judge('voltage', (have, want) => Math.max(...have) >= want - 1e-9);
  judge('power', (have, want) => Math.max(...have) >= want - 1e-9);
  judge('tolerance', (have, want) => Math.max(...have) <= want + 1e-9);
  return { matched, missed };
}

/** True when the part is not seen to miss any asked value. */
export function fitsSpec(part: MouserPart, wanted: Spec): boolean {
  return specFit(part, wanted).missed.length === 0;
}

/** Spec fields as words, for notes ("value", "voltage"...). */
export const SPEC_LABELS: Record<SpecField, string> = {
  capacitance: 'capacitance',
  resistance: 'resistance',
  voltage: 'voltage',
  power: 'wattage',
  tolerance: 'tolerance',
};
