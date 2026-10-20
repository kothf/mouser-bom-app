import type { MouserPart } from '../mouser/types';

// Standard capacitor voltage ratings, in volts.
const STANDARD_RATINGS = [
  2.5, 4, 6.3, 10, 16, 20, 25, 35, 50, 63, 80, 100, 160, 200, 250, 315, 350, 400, 450, 500, 550, 600, 630,
  700, 750, 800, 900, 1000, 1200, 1250, 1500, 1600, 2000, 2500, 3000, 4000, 5000, 6000,
];

// How many higher ratings to try when the requested one finds nothing.
export const MAX_HIGHER_STEPS = 3;

const VOLTAGE_PATTERN = /(?<![\w.])(\d+(?:[.,]\d+)?)\s?(k)?V(?:DC|AC)?(?![a-z])/gi;

function toVolts(num: string, kilo: string | undefined): number {
  const v = Number(num.replace(',', '.'));
  return kilo ? v * 1000 : v;
}

/** Every voltage written in a piece of text ("450V", "1kV", "630 VDC"). */
export function voltagesInText(text: string): number[] {
  const out: number[] = [];
  for (const m of (text || '').matchAll(VOLTAGE_PATTERN)) out.push(toVolts(m[1], m[2]));
  return out;
}

/**
 * The voltage a capacitor search asks for, read from its query
 * ("22uF 400V electrolytic Capacitor" -> 400). Only capacitor lines.
 */
export function requestedCapacitorVoltage(query: string, category?: string): number | null {
  const isCap = category ? /cap/i.test(category) : /\bcap(acitor)?s?\b/i.test(query);
  if (!isCap) return null;
  const v = voltagesInText(query);
  return v.length > 0 ? v[0] : null;
}

/** A part's rated voltage: DigiKey's parameter, else the highest voltage in the description. */
export function partVoltage(part: MouserPart): number | null {
  const fromParam = voltagesInText(part.VoltageRating || '');
  if (fromParam.length > 0) return Math.max(...fromParam);
  const fromDesc = voltagesInText(part.Description || '');
  return fromDesc.length > 0 ? Math.max(...fromDesc) : null;
}

/** The next standard ratings above `volts`, closest first. */
export function higherRatings(volts: number, steps: number = MAX_HIGHER_STEPS): number[] {
  return STANDARD_RATINGS.filter((r) => r > volts).slice(0, steps);
}

function formatVolts(volts: number): string {
  return volts >= 1000 ? `${Number((volts / 1000).toFixed(2))}kV` : `${volts}V`;
}

/** Swap the voltage in a query for another one, keeping any DC/AC suffix. */
export function withVoltage(query: string, volts: number): string {
  let done = false;
  return query.replace(VOLTAGE_PATTERN, (match) => {
    if (done) return match;
    done = true;
    const suffix = match.match(/(DC|AC)$/i)?.[1]?.toUpperCase() || '';
    return `${formatVolts(volts)}${suffix}`;
  });
}

/** Parts rated between `minVolts` and `maxVolts` (Infinity for no upper limit). */
export function partsRatedBetween(parts: MouserPart[], minVolts: number, maxVolts: number = Infinity): MouserPart[] {
  return parts.filter((p) => {
    const v = partVoltage(p);
    return v !== null && v >= minVolts && v <= maxVolts;
  });
}
