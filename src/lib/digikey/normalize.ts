import type { MouserPart } from '../mouser/types';
import type { DigiKeyProduct, DigiKeyProductVariation } from './types';

/**
 * Pick the most useful orderable package variation of a DigiKey product:
 * skip marketplace listings, prefer the lowest minimum order quantity
 * (usually Cut Tape / Bulk), then the highest stock.
 */
export function pickDigiKeyVariation(product: DigiKeyProduct): DigiKeyProductVariation | undefined {
  const variations = (product.ProductVariations || []).filter((v) => v && v.DigiKeyProductNumber);
  if (variations.length === 0) return undefined;

  const direct = variations.filter((v) => !v.MarketPlace);
  const pool = direct.length > 0 ? direct : variations;

  return [...pool].sort((a, b) => {
    const moqA = a.MinimumOrderQuantity || 1;
    const moqB = b.MinimumOrderQuantity || 1;
    if (moqA !== moqB) return moqA - moqB;
    return (b.QuantityAvailableforPackageType || 0) - (a.QuantityAvailableforPackageType || 0);
  })[0];
}

function formatPrice(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 5,
    }).format(value);
  } catch {
    return value.toFixed(value < 1 ? 5 : 2);
  }
}

/**
 * Convert a DigiKey v4 product into the app's supplier-neutral part shape.
 * The `MouserPartNumber` field carries the distributor's own part number
 * (here the DigiKey Product Number) so the BOM grid and exports work unchanged.
 */
export function normalizeDigiKeyProduct(product: DigiKeyProduct, currency: string = 'USD'): MouserPart {
  const variation = pickDigiKeyVariation(product);
  const variationStock = variation?.QuantityAvailableforPackageType;
  const stock = variationStock && variationStock > 0 ? variationStock : product.QuantityAvailable || 0;
  const pricing = (variation?.MyPricing?.length ? variation.MyPricing : variation?.StandardPricing) || [];

  const priceBreaks =
    pricing.length > 0
      ? pricing.map((p) => ({
          Quantity: p.BreakQuantity,
          Price: formatPrice(p.UnitPrice, currency),
          Currency: currency,
        }))
      : product.UnitPrice
      ? [{ Quantity: 1, Price: formatPrice(product.UnitPrice, currency), Currency: currency }]
      : [];

  const description =
    product.Description?.ProductDescription || product.Description?.DetailedDescription || '';

  const mountingType = product.Parameters?.find((p) => /mounting type/i.test(p.ParameterText || ''))?.ValueText;
  const voltageRating = product.Parameters?.find((p) => /^voltage - rated/i.test(p.ParameterText || ''))?.ValueText;

  return {
    MouserPartNumber: variation?.DigiKeyProductNumber || '',
    ManufacturerPartNumber: product.ManufacturerProductNumber || '',
    Manufacturer: product.Manufacturer?.Name || '',
    Description: variation?.PackageType?.Name ? `${description} (${variation.PackageType.Name})` : description,
    Availability: `${stock} In Stock`,
    AvailabilityInStock: String(stock),
    FactoryStock: '0',
    DataSheetUrl: product.DatasheetUrl || undefined,
    ProductDetailUrl: product.ProductUrl || '',
    ImagePath: product.PhotoUrl || undefined,
    Category: product.Category?.Name || undefined,
    MountingType: mountingType || undefined,
    VoltageRating: voltageRating || undefined,
    LeadTime: product.ManufacturerLeadWeeks ? `${product.ManufacturerLeadWeeks} weeks` : undefined,
    LifecycleStatus: product.ProductStatus?.Status || undefined,
    ROHSStatus: product.Classifications?.RohsStatus || undefined,
    Min: String(variation?.MinimumOrderQuantity || 1),
    Mult: '1',
    PriceBreaks: priceBreaks,
  };
}
