import type { MouserPart } from '../mouser/types';
import type { Supplier } from '../supplier';

export type Mounting = 'smd' | 'tht' | 'unknown';

const SMD_PATTERN = /\b(smd|smt|surface[\s-]*mount(ed)?|chip resistors?)\b/i;
const THT_PATTERN =
  /\b(through[\s-]*hole|thru[\s-]*hole|radial|axial|leaded|dip|pcb pin|snap[\s-]*in|screw terminal|chassis mount|panel mount|solder lug|wire leads?)\b/i;

function classify(text: string): Mounting {
  const smd = SMD_PATTERN.test(text);
  const tht = THT_PATTERN.test(text);
  if (smd && !tht) return 'smd';
  if (tht && !smd) return 'tht';
  return 'unknown';
}

/**
 * How a part is mounted. DigiKey reports it as a "Mounting Type" parameter;
 * Mouser puts it in the category ("Metal Film Resistors - Through Hole",
 * "Thick Film Resistors - SMD"), so the category and description are read too.
 */
export function partMounting(part: MouserPart): Mounting {
  if (part.MountingType) {
    const fromParam = classify(part.MountingType);
    if (fromParam !== 'unknown') return fromParam;
  }
  const fromCategory = classify(part.Category || '');
  if (fromCategory !== 'unknown') return fromCategory;
  return classify(part.Description || '');
}

/**
 * Score bonus for a part whose mounting fits the line: SMD lines want
 * surface-mount parts, every other line wants regular (through-hole) parts.
 * Parts with no known mounting (tubes, transformers...) are left neutral.
 */
export function mountingScore(part: MouserPart, wantSmd: boolean): number {
  const m = partMounting(part);
  if (m === 'unknown') return 0;
  return (m === 'smd') === wantSmd ? 1 : -1;
}

/**
 * Word added to a keyword search so the supplier returns the wanted mounting.
 * Mouser only matches "SMD" reliably (its leaded categories say "Radial",
 * "Axial", "Through Hole"...), so regular Mouser searches rely on scoring.
 */
export function mountingKeyword(supplier: Supplier, wantSmd: boolean): string {
  if (supplier === 'digikey') return wantSmd ? 'surface mount' : 'through hole';
  return wantSmd ? 'SMD' : '';
}
