import { describe, expect, it } from 'vitest';
import { normalizeDigiKeyProduct, pickDigiKeyVariation } from './normalize';
import { calculateTierPrice, parseStockQuantity } from '../mouser/client';
import type { DigiKeyProduct } from './types';

const product: DigiKeyProduct = {
  Description: { ProductDescription: 'CAP ALUM 22UF 20% 450V RADIAL' },
  Manufacturer: { Name: 'Nichicon' },
  ManufacturerProductNumber: 'UVY2W220MHD',
  ProductUrl: 'https://www.digikey.com/en/products/detail/nichicon/UVY2W220MHD/589520',
  DatasheetUrl: 'https://example.com/ds.pdf',
  QuantityAvailable: 5000,
  ProductStatus: { Status: 'Active' },
  Category: { Name: 'Aluminum Electrolytic Capacitors' },
  ProductVariations: [
    {
      DigiKeyProductNumber: 'UVY2W220MHD-ND-REEL',
      PackageType: { Name: 'Tape & Reel (TR)' },
      MinimumOrderQuantity: 500,
      QuantityAvailableforPackageType: 4000,
      StandardPricing: [{ BreakQuantity: 500, UnitPrice: 0.5 }],
    },
    {
      DigiKeyProductNumber: '493-1234-ND',
      PackageType: { Name: 'Bulk' },
      MinimumOrderQuantity: 1,
      QuantityAvailableforPackageType: 1200,
      StandardPricing: [
        { BreakQuantity: 1, UnitPrice: 1.23 },
        { BreakQuantity: 10, UnitPrice: 0.987 },
      ],
    },
    {
      DigiKeyProductNumber: 'MKT-1',
      MarketPlace: true,
      MinimumOrderQuantity: 1,
      QuantityAvailableforPackageType: 99999,
    },
  ],
};

describe('DigiKey normalisation', () => {
  it('prefers the non-marketplace variation with the lowest MOQ', () => {
    expect(pickDigiKeyVariation(product)?.DigiKeyProductNumber).toBe('493-1234-ND');
  });

  it('maps a product to the shared part shape', () => {
    const part = normalizeDigiKeyProduct(product, 'USD');
    expect(part).toMatchObject({
      MouserPartNumber: '493-1234-ND',
      ManufacturerPartNumber: 'UVY2W220MHD',
      Manufacturer: 'Nichicon',
      Min: '1',
      LifecycleStatus: 'Active',
    });
    expect(parseStockQuantity(part.Availability, part.AvailabilityInStock, part.FactoryStock)).toBe(1200);
    expect(calculateTierPrice(part.PriceBreaks, 25).unitPrice).toBeCloseTo(0.987);
    expect(calculateTierPrice(part.PriceBreaks, 2).unitPrice).toBeCloseTo(1.23);
  });

  it('handles products without variations', () => {
    const part = normalizeDigiKeyProduct({ ManufacturerProductNumber: 'X', UnitPrice: 2, QuantityAvailable: 3 });
    expect(part.MouserPartNumber).toBe('');
    expect(part.PriceBreaks).toHaveLength(1);
    expect(part.AvailabilityInStock).toBe('3');
  });
});
