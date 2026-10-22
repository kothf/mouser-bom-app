import { describe, expect, it } from 'vitest';
import { withoutDistributorPrefix } from './part-number';

describe('withoutDistributorPrefix', () => {
  it('drops a Mouser manufacturer prefix', () => {
    expect(withoutDistributorPrefix('80-C4AF3BW4470A3FK')).toBe('C4AF3BW4470A3FK');
    expect(withoutDistributorPrefix('603-MFR-25FBF52-100K')).toBe('MFR-25FBF52-100K');
  });

  it('leaves part numbers without a prefix alone', () => {
    expect(withoutDistributorPrefix('MFR-25FBF52-100K')).toBeNull();
    expect(withoutDistributorPrefix('12-AB')).toBeNull();
  });

  it('leaves DigiKey product numbers alone', () => {
    expect(withoutDistributorPrefix('296-1395-1-ND')).toBeNull();
  });
});
