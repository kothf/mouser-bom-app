import type { MouserPart } from '../mouser/types';
import { calculateTierPrice } from '../mouser/client';

// Manufacturer reputation as discussed on DIY/engineering forums (EEVblog,
// diyAudio, Music Electronics Forum, AmpGarage, badcaps) and the common
// Japanese / Taiwanese / Chinese capacitor tier lists.
//   1 = trusted first choice, 2 = good / good value,
//   3 = budget, mixed reports, 4 = known for failures.
// Makers not listed are scored in the middle (unknown, not bad).

export type ManufacturerTier = 1 | 2 | 3 | 4;

interface ManufacturerRule {
  tier: ManufacturerTier;
  /** Lower-case name fragments, matched against the supplier's manufacturer name. */
  names: string[];
  note: string;
}

export const MANUFACTURER_RULES: ManufacturerRule[] = [
  // Capacitors
  { tier: 1, names: ['nichicon'], note: 'Japanese electrolytics, forum favourite for radial filter caps' },
  { tier: 1, names: ['chemi-con', 'chemicon', 'chemi con'], note: 'Nippon / United Chemi-Con, Japanese electrolytics' },
  { tier: 1, names: ['rubycon'], note: 'Japanese electrolytics' },
  { tier: 1, names: ['panasonic'], note: 'Japanese electrolytics and film' },
  { tier: 1, names: ['elna'], note: 'Japanese electrolytics' },
  { tier: 1, names: ['suncon', 'sanyo'], note: 'Japanese electrolytics' },
  { tier: 1, names: ['f&t', 'f & t', 'fischer'], note: 'F&T, German high-voltage electrolytics for tube amps' },
  { tier: 1, names: ['wima'], note: 'German film capacitors' },
  { tier: 1, names: ['kemet', 'arcotronics', 'evox', 'rifa'], note: 'Film, ceramic and tantalum' },
  { tier: 1, names: ['cornell', 'cde', 'mallory'], note: 'Cornell Dubilier / Mallory, large electrolytics and film' },
  { tier: 1, names: ['tdk', 'epcos'], note: 'TDK / EPCOS' },
  { tier: 1, names: ['murata'], note: 'Ceramics' },
  { tier: 1, names: ['avx'], note: 'Kyocera AVX, tantalum and ceramics' },
  { tier: 1, names: ['taiyo yuden'], note: 'Ceramics' },
  { tier: 1, names: ['wurth', 'würth'], note: 'Würth Elektronik' },
  // Resistors, pots and general
  { tier: 1, names: ['vishay', 'dale', 'sprague', 'bc components', 'roederstein', 'draloric', 'beyschlag'], note: 'Vishay family' },
  { tier: 1, names: ['koa'], note: 'KOA Speer resistors' },
  { tier: 1, names: ['bourns'], note: 'Pots and resistors' },
  { tier: 1, names: ['ohmite'], note: 'Power resistors' },
  { tier: 1, names: ['susumu'], note: 'Precision resistors' },
  { tier: 1, names: ['te connectivity', 'neohm'], note: 'TE / Neohm resistors' },
  { tier: 1, names: ['alps'], note: 'Alps Alpine pots' },
  { tier: 1, names: ['littelfuse', 'schurter'], note: 'Fuses' },
  { tier: 1, names: ['hammond'], note: 'Transformers and enclosures' },
  { tier: 2, names: ['yageo'], note: 'Resistors, fine on forums' },
  { tier: 2, names: ['royal ohm', 'royalohm', 'uniohm'], note: 'Resistors, fine on forums' },
  { tier: 2, names: ['stackpole'], note: 'Resistors' },
  { tier: 2, names: ['cts'], note: 'Pots; some recent reports of a dead zone' },
  { tier: 2, names: ['alpha'], note: 'Pots; Taiwan-made rated well' },
  { tier: 2, names: ['illinois'], note: 'Illinois Capacitor; had a bad run, newer parts OK' },
  { tier: 2, names: ['taicon', 'teapo', 'samxon', 'ost', 'toshin', 'elite'], note: 'Taiwanese tier 2 electrolytics' },
  { tier: 2, names: ['samsung'], note: 'Samsung Electro-Mechanics ceramics' },
  { tier: 2, names: ['jj electronic'], note: 'Tubes and tube-amp electrolytics' },
  { tier: 2, names: ['electro-harmonix', 'tung-sol', 'sovtek', 'genalex', 'mullard', 'svetlana', 'new sensor'], note: 'Current-production tubes' },
  { tier: 3, names: ['lelon', 'xicon'], note: 'Budget electrolytics; good forum reports but low on tier lists' },
  { tier: 3, names: ['jamicon', 'capxon', 'hitano', 'multicomp'], note: 'Budget brands, mixed reports' },
  { tier: 4, names: ["su'scon", 'suscon', 'fuhjyyu', 'g-luxon', 'gluxon', 'ltec', 'jun fu', 'evercon'], note: 'Known for failing capacitors' },
];

const TIER_SCORE: Record<ManufacturerTier, number> = { 1: 100, 2: 75, 3: 35, 4: 0 };
/** Score for a maker not on the list. */
export const UNKNOWN_MANUFACTURER_SCORE = 50;

function wordMatch(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}($|[^a-z])`, 'i').test(haystack);
}

/** The rule for a manufacturer name, if it is on the list. */
export function manufacturerRule(manufacturer: string | undefined): ManufacturerRule | undefined {
  const name = (manufacturer || '').toLowerCase();
  if (!name) return undefined;
  return MANUFACTURER_RULES.find((r) => r.names.some((n) => wordMatch(name, n)));
}

/** 0-100: how forums rate the part's manufacturer (50 when unknown). */
export function manufacturerScore(part: MouserPart): number {
  const rule = manufacturerRule(part.Manufacturer);
  return rule ? TIER_SCORE[rule.tier] : UNKNOWN_MANUFACTURER_SCORE;
}

/** Unit price at the requested quantity, 0 when the part has no prices. */
export function unitPriceAt(part: MouserPart, qty: number): number {
  return calculateTierPrice(part.PriceBreaks, qty).unitPrice;
}

/**
 * What the line really costs with this part: the quantity that must be
 * bought (at least the minimum order, in whole order multiples) at the price
 * for that quantity. A reel-only part at $0.01 x 1000 costs $10, not $0.10.
 * 0 when the part has no prices.
 */
export function orderCost(part: MouserPart, qty: number): number {
  const moq = parseInt(part.Min || '1', 10) || 1;
  const mult = parseInt(part.Mult || '1', 10) || 1;
  const buy = Math.ceil(Math.max(qty, moq, 1) / mult) * mult;
  return unitPriceAt(part, buy) * buy;
}

/**
 * 0-100 price score against the other candidates, by the cost of the order
 * (see orderCost): the cheapest part scores 100, one twice as expensive 50,
 * and a part with no price 0.
 */
export function priceScores(parts: MouserPart[], qty: number): Map<MouserPart, number> {
  const costs = parts.map((p) => orderCost(p, qty));
  const cheapest = Math.min(...costs.filter((c) => c > 0));
  return new Map(parts.map((p, i) => [p, costs[i] > 0 && Number.isFinite(cheapest) ? Math.round((100 * cheapest) / costs[i]) : 0]));
}

/** Manufacturer and price scores combined, 0-100, equal weight. */
export function valueScore(manufacturer: number, price: number): number {
  return Math.round((manufacturer + price) / 2);
}
