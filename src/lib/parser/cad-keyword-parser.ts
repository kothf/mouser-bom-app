import type { BOMItem } from '../mouser/types';

/**
 * Keyword-based BOM parser for CAD exports that list components by type and
 * value instead of manufacturer part numbers (e.g. tube amp schematic tools):
 *
 *   C1, Cap, 22uF, 450V, electrolytic
 *   R1-R4  Res 100k 1W
 *   Ref;Type;Value;Voltage
 *   V1  Tube  12AX7
 *
 * Every line is matched against configurable category keywords ("Cap",
 * "Res", "Tube"...) and designator prefixes ("C", "R", "V"...). Values,
 * voltage and power ratings are extracted and turned into a distributor
 * keyword search query. Identical components are merged and their
 * quantities summed.
 */

export interface CadCategoryRule {
  /** Category name; also used as the search term appended to the query. */
  name: string;
  /** Words that identify this category anywhere in a line (case-insensitive). */
  keywords: string[];
  /** Designator prefixes (R for R1, VR for VR2...). */
  prefixes: string[];
}

export type CadColumn =
  | 'reference'
  | 'type'
  | 'value'
  | 'rating'
  | 'voltage'
  | 'power'
  | 'quantity'
  | 'description';

export interface CadKeywordConfig {
  categories: CadCategoryRule[];
  columns: Record<CadColumn, string[]>;
}

export interface CadBomLine {
  category: string;
  value: string;
  voltage?: string;
  power?: string;
  tolerance?: string;
  modifiers: string[];
  query: string;
  quantity: number;
  designators: string[];
  sourceLines: number[];
}

export interface CadUnmatchedLine {
  lineNumber: number;
  text: string;
  reason: string;
}

export interface CadParseResult {
  lines: CadBomLine[];
  unmatched: CadUnmatchedLine[];
  headerDetected: boolean;
}

// 'rating' comes before 'voltage' so a "Rating" header maps to it even with older saved rules.
export const CAD_COLUMNS: CadColumn[] = [
  'reference',
  'type',
  'value',
  'rating',
  'voltage',
  'power',
  'quantity',
  'description',
];

export const DEFAULT_CAD_CATEGORIES: CadCategoryRule[] = [
  { name: 'Capacitor', keywords: ['cap', 'caps', 'capacitor', 'condenser', 'elko', 'elco'], prefixes: ['C'] },
  { name: 'Resistor', keywords: ['res', 'resistor', 'resistance'], prefixes: ['R'] },
  { name: 'Potentiometer', keywords: ['pot', 'potentiometer', 'trimmer', 'trimpot'], prefixes: ['VR', 'RV', 'P'] },
  { name: 'Vacuum Tube', keywords: ['tube', 'valve', 'triode', 'pentode', 'rectifier tube'], prefixes: ['V'] },
  { name: 'Tube Socket', keywords: ['socket'], prefixes: ['XV'] },
  { name: 'Diode', keywords: ['diode', 'rectifier', 'zener'], prefixes: ['D'] },
  { name: 'Transformer', keywords: ['transformer', 'xfmr', 'trafo', 'ot', 'pt'], prefixes: ['T', 'TR'] },
  { name: 'Inductor', keywords: ['choke', 'inductor', 'coil'], prefixes: ['L'] },
  { name: 'Fuse', keywords: ['fuse'], prefixes: ['F'] },
  { name: 'Switch', keywords: ['switch', 'toggle'], prefixes: ['S', 'SW'] },
  { name: 'Jack', keywords: ['jack', 'connector', 'socket jack'], prefixes: ['J'] },
  { name: 'LED', keywords: ['led', 'lamp', 'pilot'], prefixes: ['LED', 'LP'] },
];

export const DEFAULT_CAD_COLUMNS: Record<CadColumn, string[]> = {
  reference: ['ref', 'refdes', 'reference', 'designator', 'designators', 'name', 'part ref', 'id'],
  type: ['type', 'kind', 'category', 'component', 'part', 'part type'],
  value: ['value', 'val'],
  rating: ['rating', 'ratings', 'data', 'rating/data', 'rating data', 'spec', 'specs'],
  voltage: ['voltage', 'volt', 'volts', 'v rating'],
  power: ['power', 'wattage', 'watts', 'watt'],
  quantity: ['qty', 'quantity', 'count', 'pcs', 'amount'],
  description: ['description', 'desc', 'notes', 'note', 'comment', 'comments'],
};

export const DEFAULT_CAD_CONFIG: CadKeywordConfig = {
  categories: DEFAULT_CAD_CATEGORIES,
  columns: DEFAULT_CAD_COLUMNS,
};

/** Words kept in the search query because they narrow the part type. */
const MODIFIER_WORDS = [
  'electrolytic',
  'film',
  'polypropylene',
  'polyester',
  'ceramic',
  'mica',
  'silver mica',
  'tantalum',
  'paper',
  'oil',
  'metal film',
  'carbon film',
  'carbon comp',
  'carbon',
  'metal oxide',
  'wirewound',
  'axial',
  'radial',
  'snap-in',
  'bipolar',
  'non-polarized',
  'audio',
  'linear',
  'log',
  'mkp',
  'mkt',
  'through hole',
];

// ---------------------------------------------------------------------------
// Rule text (de)serialisation, used by the settings editor
// ---------------------------------------------------------------------------

/** "Capacitor: cap, capacitor, elko | C" per line. */
export function categoriesToText(categories: CadCategoryRule[]): string {
  return categories
    .map((c) => `${c.name}: ${c.keywords.join(', ')}${c.prefixes.length ? ` | ${c.prefixes.join(', ')}` : ''}`)
    .join('\n');
}

export function textToCategories(text: string): CadCategoryRule[] {
  const rules: CadCategoryRule[] = [];
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim();
    const [kwPart, prefixPart = ''] = line.slice(colon + 1).split('|');
    const keywords = splitList(kwPart).map((k) => k.toLowerCase());
    const prefixes = splitList(prefixPart).map((p) => p.toUpperCase());
    if (name && (keywords.length > 0 || prefixes.length > 0)) {
      rules.push({ name, keywords, prefixes });
    }
  }
  return rules;
}

/** "value: value, val" per line. */
export function columnsToText(columns: Record<CadColumn, string[]>): string {
  return CAD_COLUMNS.map((col) => `${col}: ${(columns[col] || []).join(', ')}`).join('\n');
}

export function textToColumns(text: string): Record<CadColumn, string[]> {
  const result = { ...DEFAULT_CAD_COLUMNS };
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const col = line.slice(0, colon).trim().toLowerCase() as CadColumn;
    if (!CAD_COLUMNS.includes(col)) continue;
    result[col] = splitList(line.slice(colon + 1)).map((k) => k.toLowerCase());
  }
  return result;
}

export function buildCadConfig(categoriesText?: string, columnsText?: string): CadKeywordConfig {
  const categories = categoriesText?.trim() ? textToCategories(categoriesText) : DEFAULT_CAD_CATEGORIES;
  const columns = columnsText?.trim() ? textToColumns(columnsText) : DEFAULT_CAD_COLUMNS;
  return { categories: categories.length > 0 ? categories : DEFAULT_CAD_CATEGORIES, columns };
}

function splitList(text: string): string[] {
  return (text || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ---------------------------------------------------------------------------
// Value recognition & normalisation
// ---------------------------------------------------------------------------

const MICRO = '[uUµμ]';

/** 22uF, 0.1µF, 4n7, 2u2, 100pF, 47nf, 1000uF */
export function normalizeCapacitance(token: string): string | null {
  const t = token.trim().replace(/,/g, '.');
  let m = t.match(new RegExp(`^(\\d+)(p|n|${MICRO})(\\d{1,2})F?$`, 'i'));
  if (m) return `${m[1]}.${m[3]}${unitPrefix(m[2])}F`;
  m = t.match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s?(p|n|${MICRO})F?$`, 'i'));
  if (m) return `${m[1]}${unitPrefix(m[2])}F`;
  m = t.match(/^(\d+(?:\.\d+)?)\s?(mF|F)$/);
  if (m) return `${m[1]}${m[2]}`;
  return null;
}

function unitPrefix(p: string): string {
  const lower = p.toLowerCase();
  if (lower === 'µ' || lower === 'μ') return 'u';
  return lower;
}

/** 100k, 4k7, 1M5, 470R, 2K2, 47Ω, 220ohm, 1.5M, 100 (bare number when allowBare) */
export function normalizeResistance(token: string, allowBare = false): string | null {
  const t = token.trim().replace(/,/g, '.');
  let m = t.match(/^(\d+)([RrKkMm])(\d{1,3})$/);
  if (m) {
    const unit = resistanceUnit(m[2]);
    return `${m[1]}.${m[3]}${unit ? unit : ''} Ohm`;
  }
  m = t.match(/^(\d+(?:\.\d+)?)\s?([RrKkMmΩ]|ohms?|Ohms?|OHMS?)(?:ohms?|Ω)?$/);
  if (m) {
    const unit = resistanceUnit(m[2]);
    return `${m[1]}${unit} Ohm`;
  }
  m = t.match(/^(\d+(?:\.\d+)?)\s?([kKmM])(?:ohms?|Ω)$/i);
  if (m) return `${m[1]}${resistanceUnit(m[2])} Ohm`;
  if (allowBare && /^\d+(?:\.\d+)?$/.test(t)) return `${t} Ohm`;
  return null;
}

function resistanceUnit(u: string): string {
  if (/^[kK]$/.test(u)) return 'k';
  if (/^[mM]$/.test(u)) return 'M';
  return '';
}

/** 10H, 5H, 100mH, 47uH */
export function normalizeInductance(token: string): string | null {
  const m = token.trim().replace(/,/g, '.').match(new RegExp(`^(\\d+(?:\\.\\d+)?)\\s?(m|${MICRO})?H$`, 'i'));
  if (!m) return null;
  return `${m[1]}${m[2] ? unitPrefix(m[2]) : ''}H`;
}

/** 450V, 6.3V, 1kV, 630VDC, 250Vac */
export function normalizeVoltage(token: string): string | null {
  const m = token.trim().replace(/,/g, '.').match(/^(\d+(?:\.\d+)?)\s?(k)?V(AC|DC)?$/i);
  if (!m) return null;
  return `${m[1]}${m[2] ? 'k' : ''}V${m[3] ? m[3].toUpperCase() : ''}`;
}

/** 1W, 0.5W, 1/2W, 5w */
export function normalizePower(token: string): string | null {
  const t = token.trim().replace(/,/g, '.');
  let m = t.match(/^(\d+)\/(\d+)\s?W$/i);
  if (m) {
    const val = Number(m[1]) / Number(m[2]);
    return `${Number(val.toFixed(3))}W`;
  }
  m = t.match(/^(\d+(?:\.\d+)?)\s?W$/i);
  if (m) return `${m[1]}W`;
  return null;
}

function normalizeTolerance(token: string): string | null {
  const m = token.trim().replace(/,/g, '.').match(/^±?(\d+(?:\.\d+)?)%$/);
  return m ? `${m[1]}%` : null;
}

function parseQuantityToken(token: string): number | null {
  const m = token.trim().match(/^(?:x\s?(\d+)|(\d+)\s?(?:x|pcs?|pieces?|st|stk))$/i);
  if (!m) return null;
  const n = parseInt(m[1] || m[2], 10);
  return n > 0 ? n : null;
}

// ---------------------------------------------------------------------------
// Designators
// ---------------------------------------------------------------------------

function buildPrefixMatcher(categories: CadCategoryRule[]): string[] {
  const all = new Set<string>();
  categories.forEach((c) => c.prefixes.forEach((p) => all.add(p.toUpperCase())));
  // Longest first so "VR" wins over "V".
  return [...all].sort((a, b) => b.length - a.length);
}

/**
 * Expand a designator token: "R1" -> [R1], "R1-R4" / "R1-4" -> [R1..R4].
 * Returns null when the token is not a designator with a known prefix.
 */
export function expandDesignatorToken(token: string, prefixes: string[]): string[] | null {
  const t = token.trim().toUpperCase();
  for (const prefix of prefixes) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const range = t.match(new RegExp(`^${escaped}(\\d+)[-–](?:${escaped})?(\\d+)$`));
    if (range) {
      const start = parseInt(range[1], 10);
      const end = parseInt(range[2], 10);
      if (end >= start && end - start < 500) {
        return Array.from({ length: end - start + 1 }, (_, i) => `${prefix}${start + i}`);
      }
    }
    if (new RegExp(`^${escaped}\\d+[A-Z]?$`).test(t)) {
      return [t];
    }
  }
  return null;
}

function categoryForDesignator(designator: string, categories: CadCategoryRule[]): CadCategoryRule | undefined {
  const d = designator.toUpperCase();
  let best: CadCategoryRule | undefined;
  let bestLen = 0;
  for (const c of categories) {
    for (const p of c.prefixes) {
      if (p.length > bestLen && new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\d`).test(d)) {
        best = c;
        bestLen = p.length;
      }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Line splitting
// ---------------------------------------------------------------------------

function detectDelimiter(lines: string[]): string | null {
  const sample = lines.slice(0, 20);
  const count = (ch: string) => sample.filter((l) => l.includes(ch)).length;
  const threshold = Math.max(1, Math.ceil(sample.length / 2));
  if (count('\t') >= threshold) return '\t';
  if (count(';') >= threshold) return ';';
  if (count(',') >= threshold) return ',';
  if (count('|') >= threshold) return '|';
  return null;
}

/** Quote-aware split of a delimited line. */
export function splitDelimited(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeaderCell(cell: string): string {
  return cell.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectHeader(cells: string[], columns: Record<CadColumn, string[]>): Partial<Record<CadColumn, number>> | null {
  const mapping: Partial<Record<CadColumn, number>> = {};
  cells.forEach((cell, idx) => {
    const norm = normalizeHeaderCell(cell);
    if (!norm) return;
    for (const col of CAD_COLUMNS) {
      if (mapping[col] !== undefined) continue;
      if ((columns[col] || []).some((kw) => normalizeHeaderCell(kw) === norm)) {
        mapping[col] = idx;
        break;
      }
    }
  });
  return Object.keys(mapping).length >= 2 ? mapping : null;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

interface Extracted {
  category?: CadCategoryRule;
  designators: string[];
  quantity?: number;
  capacitance?: string;
  resistance?: string;
  inductance?: string;
  voltage?: string;
  power?: string;
  tolerance?: string;
  modifiers: string[];
  freeWords: string[];
}

function tokenize(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function findCategoryByKeyword(text: string, categories: CadCategoryRule[]): CadCategoryRule | undefined {
  const lower = ` ${text.toLowerCase().replace(/[^a-z0-9µμ.\-/ ]/g, ' ')} `;
  let best: CadCategoryRule | undefined;
  let bestLen = 0;
  for (const c of categories) {
    for (const kw of c.keywords) {
      if (kw.length > bestLen && lower.includes(` ${kw} `)) {
        best = c;
        bestLen = kw.length;
      }
    }
  }
  return best;
}

function extractModifiers(text: string): string[] {
  const lower = ` ${text.toLowerCase().replace(/[^a-z0-9\- ]/g, ' ').replace(/\s+/g, ' ')} `;
  const found: string[] = [];
  // Longest first, so "metal film" is kept and the bare "film" is skipped.
  for (const word of [...MODIFIER_WORDS].sort((a, b) => b.length - a.length)) {
    if (lower.includes(` ${word} `) && !found.some((f) => f.includes(word))) {
      found.push(word);
    }
  }
  return found;
}

function extractFromText(text: string, config: CadKeywordConfig, prefixes: string[], into: Extracted): void {
  if (!into.category) into.category = findCategoryByKeyword(text, config.categories);
  for (const m of extractModifiers(text)) {
    if (!into.modifiers.includes(m)) into.modifiers.push(m);
  }

  const categoryWords = new Set(config.categories.flatMap((c) => c.keywords));
  const modifierWords = new Set(MODIFIER_WORDS.flatMap((w) => w.split(' ')));
  const tokens = tokenize(text);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const lower = token.toLowerCase();

    if (/^(qty|quantity|pcs)[:=]?$/i.test(token) && tokens[i + 1] && /^\d+$/.test(tokens[i + 1])) {
      into.quantity = parseInt(tokens[i + 1], 10);
      i++;
      continue;
    }
    if (/^\d+$/.test(token) && tokens[i + 1] && /^[x×]$/i.test(tokens[i + 1])) {
      into.quantity = parseInt(token, 10);
      i++;
      continue;
    }
    const qtyInline = token.match(/^(?:qty|quantity)[:=](\d+)$/i);
    if (qtyInline) {
      into.quantity = parseInt(qtyInline[1], 10);
      continue;
    }

    const designators = expandDesignatorToken(token, prefixes);
    if (designators) {
      designators.forEach((d) => {
        if (!into.designators.includes(d)) into.designators.push(d);
      });
      continue;
    }

    const qty = parseQuantityToken(token);
    if (qty) {
      into.quantity = qty;
      continue;
    }

    const voltage = normalizeVoltage(token);
    if (voltage) {
      into.voltage = into.voltage || voltage;
      continue;
    }
    const power = normalizePower(token);
    if (power) {
      into.power = into.power || power;
      continue;
    }
    const tolerance = normalizeTolerance(token);
    if (tolerance) {
      into.tolerance = into.tolerance || tolerance;
      continue;
    }
    const cap = normalizeCapacitance(token);
    if (cap) {
      into.capacitance = into.capacitance || cap;
      continue;
    }
    const ind = normalizeInductance(token);
    if (ind) {
      into.inductance = into.inductance || ind;
      continue;
    }
    const res = normalizeResistance(token);
    if (res) {
      into.resistance = into.resistance || res;
      continue;
    }

    if (categoryWords.has(lower) || modifierWords.has(lower) || /^(qty|quantity|pcs|x)$/i.test(token)) continue;
    into.freeWords.push(token);
  }
}

function applyRatingCell(
  ratingCell: string,
  category: CadCategoryRule,
  config: CadKeywordConfig,
  prefixes: string[],
  into: Extracted
): void {
  const rating: Extracted = { category, designators: [], modifiers: [], freeWords: [] };
  extractFromText(ratingCell, config, prefixes, rating);
  // A bare number is volts for a capacitor and watts for a resistor.
  if (/^\d+(?:[.,]\d+)?$/.test(ratingCell)) {
    if (/capac/i.test(category.name)) rating.voltage = normalizeVoltage(`${ratingCell}V`) || undefined;
    else rating.power = normalizePower(`${ratingCell}W`) || undefined;
  }
  into.voltage = into.voltage || rating.voltage;
  into.power = into.power || rating.power;
  into.tolerance = into.tolerance || rating.tolerance;
  for (const m of rating.modifiers) {
    if (!into.modifiers.includes(m)) into.modifiers.push(m);
  }
}

function buildQuery(category: string, valueParts: string[], modifiers: string[]): string {
  return [...valueParts, ...modifiers, category].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

export function parseCadBom(text: string, config: CadKeywordConfig = DEFAULT_CAD_CONFIG): CadParseResult {
  const prefixes = buildPrefixMatcher(config.categories);
  const rawLines = (text || '').split(/\r?\n/);
  const content: { lineNumber: number; text: string }[] = [];
  rawLines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || /^(#|\/\/|;|\*)/.test(trimmed)) return;
    content.push({ lineNumber: idx + 1, text: trimmed });
  });

  const delimiter = detectDelimiter(content.map((c) => c.text));
  let headerMap: Partial<Record<CadColumn, number>> | null = null;
  let startIndex = 0;
  if (delimiter && content.length > 0) {
    headerMap = detectHeader(splitDelimited(content[0].text, delimiter), config.columns);
    if (headerMap) startIndex = 1;
  } else if (content.length > 0) {
    const headerCells = content[0].text.split(/\s{2,}|\s+/);
    headerMap = detectHeader(headerCells, config.columns);
    if (headerMap) startIndex = 1;
  }

  const merged = new Map<string, CadBomLine>();
  const unmatched: CadUnmatchedLine[] = [];

  for (let i = startIndex; i < content.length; i++) {
    const { lineNumber, text: lineText } = content[i];
    const extracted: Extracted = { designators: [], modifiers: [], freeWords: [] };
    let ratingCell = '';

    if (headerMap) {
      const cells = delimiter ? splitDelimited(lineText, delimiter) : lineText.split(/\s+/);
      const cell = (col: CadColumn) => (headerMap![col] !== undefined ? cells[headerMap![col]!] || '' : '');

      const refCell = cell('reference');
      if (refCell) {
        for (const tok of tokenize(refCell)) {
          const expanded = expandDesignatorToken(tok, prefixes);
          (expanded || [tok.toUpperCase()]).forEach((d) => {
            if (!extracted.designators.includes(d)) extracted.designators.push(d);
          });
        }
      }

      const qtyCell = cell('quantity').replace(/[^0-9]/g, '');
      if (qtyCell) extracted.quantity = parseInt(qtyCell, 10) || undefined;

      const typeCell = cell('type');
      if (typeCell) extracted.category = findCategoryByKeyword(typeCell, config.categories);

      const voltageCell = cell('voltage').trim();
      if (voltageCell) {
        extracted.voltage = normalizeVoltage(voltageCell.replace(/\s+/g, '')) || normalizeVoltage(`${voltageCell}V`) || undefined;
      }
      const powerCell = cell('power').trim();
      if (powerCell) {
        extracted.power = normalizePower(powerCell.replace(/\s+/g, '')) || normalizePower(`${powerCell}W`) || undefined;
      }

      // Applied once the category is known; only capacitors and resistors use it.
      ratingCell = cell('rating').trim();

      // Value, type and description cells go through free-text extraction.
      const valueCell = cell('value');
      extractFromText([typeCell, valueCell, cell('description')].join(' '), config, prefixes, extracted);

      // A bare number in the value column of a resistor means ohms.
      if (!extracted.resistance && !extracted.capacitance && valueCell.trim()) {
        const cat = extracted.category || categoryForDesignator(extracted.designators[0] || '', config.categories);
        if (cat && /resist|pot/i.test(cat.name)) {
          const bare = normalizeResistance(valueCell.trim(), true);
          if (bare) {
            extracted.resistance = bare;
            extracted.freeWords = extracted.freeWords.filter((w) => w !== valueCell.trim());
          }
        }
      }
    } else {
      extractFromText(delimiter ? splitDelimited(lineText, delimiter).join(' ') : lineText, config, prefixes, extracted);
    }

    // Category fallback: designator prefix, then value unit.
    let category = extracted.category;
    if (!category && extracted.designators.length > 0) {
      category = categoryForDesignator(extracted.designators[0], config.categories);
    }
    if (!category) {
      const byName = (re: RegExp) => config.categories.find((c) => re.test(c.name));
      if (extracted.capacitance) category = byName(/capac/i);
      else if (extracted.inductance) category = byName(/induct|choke/i);
      else if (extracted.resistance) category = byName(/resist/i);
    }

    if (!category) {
      unmatched.push({ lineNumber, text: lineText, reason: 'No category keyword or designator prefix found' });
      continue;
    }

    // Capacitor and resistor ratings (450V, 1W, 5%, film...) come from the Rating/Data column.
    if (ratingCell && /capac|resist|pot/i.test(category.name)) {
      applyRatingCell(ratingCell, category, config, prefixes, extracted);
    }

    // Bare numbers in a resistor line are ohms (e.g. "R5 Res 470").
    if (!extracted.resistance && /resist|pot/i.test(category.name)) {
      const bareIdx = extracted.freeWords.findIndex((w) => /^\d+(?:[.,]\d+)?$/.test(w));
      if (bareIdx >= 0) {
        extracted.resistance = normalizeResistance(extracted.freeWords[bareIdx], true) || undefined;
        extracted.freeWords.splice(bareIdx, 1);
      }
    }

    // Pick the value that fits the category; other categories use leftover words (12AX7, 1N4007...).
    const isPassive = /capac|resist|pot|induct|choke/i.test(category.name);
    const leftoverWords = extracted.freeWords.filter((w) => !/^\d+$/.test(w)).join(' ');
    let value = '';
    if (/capac/i.test(category.name)) value = extracted.capacitance || '';
    else if (/resist|pot/i.test(category.name)) value = extracted.resistance || '';
    else if (/induct|choke/i.test(category.name)) value = extracted.inductance || '';
    else value = leftoverWords;
    if (!value && isPassive) {
      value = extracted.capacitance || extracted.resistance || extracted.inductance || '';
    }

    if (!value && (isPassive || (!extracted.voltage && !extracted.power))) {
      unmatched.push({ lineNumber, text: lineText, reason: `No value found for ${category.name}` });
      continue;
    }

    const quantity = extracted.quantity || Math.max(1, extracted.designators.length);
    const valueParts = [value, extracted.voltage, extracted.power, extracted.tolerance].filter(
      (v): v is string => Boolean(v)
    );
    const query = buildQuery(category.name, valueParts, extracted.modifiers);
    const key = `${category.name.toLowerCase()}|${query.toLowerCase()}`;

    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
      extracted.designators.forEach((d) => {
        if (!existing.designators.includes(d)) existing.designators.push(d);
      });
      existing.sourceLines.push(lineNumber);
    } else {
      merged.set(key, {
        category: category.name,
        value,
        voltage: extracted.voltage,
        power: extracted.power,
        tolerance: extracted.tolerance,
        modifiers: extracted.modifiers,
        query,
        quantity,
        designators: [...extracted.designators],
        sourceLines: [lineNumber],
      });
    }
  }

  return { lines: [...merged.values()], unmatched, headerDetected: Boolean(headerMap) };
}

/**
 * Turn parsed CAD lines into BOM items that are resolved with a keyword search.
 */
export function cadLinesToBomItems(lines: CadBomLine[]): BOMItem[] {
  const now = Date.now();
  return lines.map((line, idx) => ({
    id: `bom-cad-${now}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    lineNumber: idx + 1,
    designator: line.designators.length > 0 ? line.designators.join(', ') : `Line ${idx + 1}`,
    rawPartNumber: line.query,
    requestedQty: line.quantity,
    notes: `${line.category}: ${[line.value, line.voltage, line.power, line.tolerance, ...line.modifiers]
      .filter(Boolean)
      .join(' ')}`,
    status: 'pending',
    unitPrice: 0,
    extendedPrice: 0,
    currency: 'USD',
    availableStock: 0,
    moq: 1,
    orderMultiple: 1,
    meetsMoq: true,
    meetsMultiple: true,
    searchMode: 'keyword',
    category: line.category,
  }));
}
