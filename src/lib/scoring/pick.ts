import type { MouserPart } from '../mouser/types';
import { parseStockQuantity } from '../mouser/client';
import { mountingScore } from '../mounting/mounting';
import { fitsSpec, querySpec, specFit } from '../spec/spec';
import { manufacturerScore, priceScores, valueScore } from './manufacturers';

/**
 * Words of the query that name a part rather than a value ("12AX7",
 * "1N4007"): they still count when the description contains them. Values
 * ("22uF", "450V", "4K7") are compared as numbers instead (see spec.ts).
 */
function nameTokens(query: string, category?: string): string[] {
  const kind = category ?? (/\bcap/i.test(query) ? 'Capacitor' : /\b(res|pot|trimmer)|ohm|Ω/i.test(query) ? 'Resistor' : undefined);
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/ohms?$/, ''))
    .filter((t) => t.length > 1 && /\d/.test(t))
    .filter((t) => Object.keys(querySpec(t, kind)).length === 0);
}

/**
 * Score every part for a keyword query. Parts whose description shows a
 * wrong value, a lower voltage or wattage, or a looser tolerance than asked
 * are left out. The rest favour the line's mounting (SMD or regular
 * through-hole), stock for the requested quantity, and each asked value they
 * show; a well-rated manufacturer and a cheaper order break the ties.
 */
export function rankKeywordParts(
  parts: MouserPart[],
  query: string,
  requestedQty: number,
  wantSmd: boolean = false,
  category?: string
): { part: MouserPart; score: number }[] {
  const wanted = querySpec(query, category);
  const fitting = (parts || []).filter((p) => fitsSpec(p, wanted));
  const tokens = nameTokens(query, category);
  const prices = priceScores(fitting, requestedQty);

  const score = (p: MouserPart): number => {
    let s = 500 * mountingScore(p, wantSmd);
    s += valueScore(manufacturerScore(p), prices.get(p) ?? 0);
    if (!p.MouserPartNumber || p.MouserPartNumber.toLowerCase() === 'n/a') s -= 1000;
    const stock = parseStockQuantity(p.Availability, p.AvailabilityInStock, p.FactoryStock);
    if (stock >= requestedQty) s += 400;
    else if (stock > 0) s += 150;
    if (p.PriceBreaks && p.PriceBreaks.length > 0) s += 100;
    const moq = parseInt(p.Min || '1', 10) || 1;
    if (moq <= requestedQty) s += 100;
    s += 120 * specFit(p, wanted).matched.length;
    const haystack = `${p.Description} ${p.ManufacturerPartNumber}`.toLowerCase().replace(/\s+/g, '');
    tokens.forEach((t) => {
      if (haystack.includes(t)) s += 120;
    });
    return s;
  };

  return fitting.map((part) => ({ part, score: score(part) })).sort((a, b) => b.score - a.score);
}

/** The best part for a keyword query, or null when none fits its values. */
export function pickBestKeywordPart(
  parts: MouserPart[],
  query: string,
  requestedQty: number,
  wantSmd: boolean = false,
  category?: string
): MouserPart | null {
  return rankKeywordParts(parts, query, requestedQty, wantSmd, category)[0]?.part ?? null;
}
