/**
 * A part number without a distributor's manufacturer prefix
 * (Mouser "80-C4AF3BW4470A3FK" -> "C4AF3BW4470A3FK"), or null when there is
 * none to drop. DigiKey product numbers ("296-1395-1-ND") are left alone:
 * their digits are not a prefix in front of the manufacturer part number.
 */
export function withoutDistributorPrefix(partNumber: string): string | null {
  const clean = (partNumber || '').trim();
  if (/-ND$/i.test(clean)) return null;
  const stripped = clean.replace(/^[0-9]{2,4}-/, '');
  return stripped !== clean && stripped.length >= 3 ? stripped : null;
}
