// Other ways of writing the same capacitor or resistor value, so a search
// that finds nothing in stock as "470nF" can try "0.47uF" and "470000pF",
// or "4.7k Ohm" as "4K7" and "4700 Ohm".

export interface ValueNotation {
  /** The query with the value rewritten. */
  query: string;
  /** The value as written in the original query. */
  from: string;
  /** The value as written in `query`. */
  to: string;
}

const CAP_PREFIX: Record<string, number> = { p: 1, n: 1e3, u: 1e6 };
const CAP_PATTERN = /(?<![\w.,])(?:(\d+)([pnuµμ])(\d{1,2})F?|(\d+(?:[.,]\d+)?)\s?([pnuµμ])F)(?![a-z])/i;

const RES_MULT: Record<string, number> = { r: 1, k: 1e3, m: 1e6 };
const RES_PATTERN =
  /(?<![\w.,])(?:(\d+)([RKM])(\d{1,3})|(\d+(?:[.,]\d+)?)\s?([kKmM])?\s?(?:ohms?|Ω)|(\d+(?:[.,]\d+)?)([kKmMR]))(?![\w.])/i;

function num(n: number): string {
  return String(Number(n.toPrecision(6)));
}

function microPrefix(p: string): string {
  const lower = p.toLowerCase();
  return lower === 'µ' || lower === 'μ' ? 'u' : lower;
}

function isCapacitorQuery(query: string, category?: string): boolean {
  return category ? /cap/i.test(category) : /\bcap(acitor)?s?\b/i.test(query);
}

function isResistorQuery(query: string, category?: string): boolean {
  if (category) return /res|pot/i.test(category);
  return /\b(res(istor)?s?|pot(entiometer)?s?|trimmer)\b|ohm|Ω/i.test(query);
}

/** 470nF -> 0.47uF, 470000pF; 0.1uF -> 100nF, 100000pF; 4n7 -> 4.7nF, 0.0047uF, 4700pF */
function capacitorForms(match: RegExpMatchArray): string[] {
  const picofarads = match[1]
    ? Number(`${match[1]}.${match[3]}`) * CAP_PREFIX[microPrefix(match[2])]
    : Number(match[4].replace(',', '.')) * CAP_PREFIX[microPrefix(match[5])];
  if (!picofarads) return [];
  return (['u', 'n', 'p'] as const)
    .map((p) => picofarads / CAP_PREFIX[p])
    .map((v, i) => ({ v, unit: ['uF', 'nF', 'pF'][i] }))
    // Skip silly forms such as 0.00001uF or 1000000000pF.
    .filter(({ v }) => v >= 0.001 && v < 1e6)
    .map(({ v, unit }) => `${num(v)}${unit}`);
}

/** 4.7k Ohm -> 4K7, 4.7k Ohm, 4700 Ohm; 470R -> 470 Ohm, 470R; 1M5 -> 1.5M Ohm, 1M5, 1500k Ohm */
function resistorForms(match: RegExpMatchArray): string[] {
  let ohms: number;
  if (match[1]) ohms = Number(`${match[1]}.${match[3]}`) * RES_MULT[match[2].toLowerCase()];
  else if (match[4]) ohms = Number(match[4].replace(',', '.')) * (match[5] ? RES_MULT[match[5].toLowerCase()] : 1);
  else ohms = Number(match[6].replace(',', '.')) * RES_MULT[match[7].toLowerCase()];
  if (!ohms) return [];

  const [scaled, letter] = ohms >= 1e6 ? [ohms / 1e6, 'M'] : ohms >= 1e3 ? [ohms / 1e3, 'k'] : [ohms, ''];
  const forms = [`${num(scaled)}${letter} Ohm`];
  // Letter-as-decimal-point (4K7, 470R, 1M5) only reads well for 1-3 digit values.
  const [whole, frac] = num(scaled).split('.');
  forms.push(frac ? `${whole}${letter.toUpperCase() || 'R'}${frac}` : `${whole}${letter.toUpperCase() || 'R'}`);
  if (letter) forms.push(`${num(ohms / (letter === 'M' ? 1e3 : 1))}${letter === 'M' ? 'k' : ''} Ohm`);
  return forms;
}

function sameForm(a: string, b: string): boolean {
  const key = (s: string) => s.replace(/\s+/g, '').replace(/ohms?|Ω/gi, '').replace(/µ|μ/g, 'u').toLowerCase();
  return key(a) === key(b);
}

/**
 * The query rewritten with every other common notation of its capacitor or
 * resistor value. Empty when the query holds no such value.
 */
export function alternateValueQueries(query: string, category?: string): ValueNotation[] {
  let match: RegExpMatchArray | null = null;
  let forms: string[] = [];
  if (isCapacitorQuery(query, category)) {
    match = query.match(CAP_PATTERN);
    if (match) forms = capacitorForms(match);
  } else if (isResistorQuery(query, category)) {
    match = query.match(RES_PATTERN);
    if (match) forms = resistorForms(match);
  }
  if (!match || match.index === undefined) return [];

  const from = match[0];
  const start = match.index;
  const seen = new Set<string>();
  return forms
    .filter((to) => !sameForm(to, from))
    .filter((to) => !seen.has(to) && Boolean(seen.add(to)))
    .map((to) => ({ query: `${query.slice(0, start)}${to}${query.slice(start + from.length)}`, from, to }));
}
