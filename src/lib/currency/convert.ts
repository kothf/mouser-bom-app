import { BOMItem, MouserCartResponse, MouserPart } from '@/lib/mouser/types';
import { calculateTierPrice, parsePriceStringToNumber } from '@/lib/mouser/client';
import { normalizeCurrencyCode } from '@/lib/utils';

/** Units of each currency per 1 USD. */
export type UsdRates = Record<string, number>;

function toUsd(amount: number, currency: string | undefined | null, rates: UsdRates): number | null {
  const code = normalizeCurrencyCode(currency);
  if (code === 'USD') return amount;
  const rate = rates[code];
  return rate ? amount / rate : null;
}

export function isUsd(currency: string | undefined | null): boolean {
  return normalizeCurrencyCode(currency) === 'USD';
}

export function partNeedsUsd(part: MouserPart | undefined | null): boolean {
  return Boolean(part?.PriceBreaks?.some((b) => !isUsd(b.Currency)));
}

/**
 * Every price break in USD. Breaks already in USD are left as they are; a break
 * that cannot be converted (no live rate) is dropped, so it is never shown in
 * another currency.
 */
export function convertPartsWithRates(parts: MouserPart[], rates: UsdRates): MouserPart[] {
  return parts.map((part) => {
    if (!part.PriceBreaks || part.PriceBreaks.length === 0) return part;
    return {
      ...part,
      PriceBreaks: part.PriceBreaks.flatMap((b) => {
        if (isUsd(b.Currency)) return [{ ...b, Currency: 'USD' }];
        const usd = toUsd(parsePriceStringToNumber(b.Price), b.Currency, rates);
        if (usd === null) return [];
        if (!(usd > 0)) return [{ ...b, Currency: 'USD' }];
        return [{ ...b, Price: `$${usd.toFixed(usd < 1 ? 5 : 2)}`, Currency: 'USD' }];
      }),
    };
  });
}

/** A Mouser cart with its total and line prices in USD (left out when there is no live rate). */
export function convertCartWithRates(cart: MouserCartResponse, rates: UsdRates): MouserCartResponse {
  if (isUsd(cart.CurrencyCode)) return cart;
  const convert = (n: number | undefined) => (n === undefined ? n : toUsd(n, cart.CurrencyCode, rates));
  return {
    ...cart,
    CurrencyCode: 'USD',
    Total: convert(cart.Total) ?? undefined,
    CartItems: cart.CartItems?.map((i) => ({
      ...i,
      UnitPrice: convert(i.UnitPrice) ?? undefined,
      ExtendedPrice: convert(i.ExtendedPrice) ?? undefined,
    })),
  };
}

/** A BOM line (e.g. one saved before prices were USD-only) with its prices in USD. */
export function convertBomItemWithRates(item: BOMItem, rates: UsdRates): BOMItem {
  if (item.matchedPart && partNeedsUsd(item.matchedPart)) {
    const [matchedPart] = convertPartsWithRates([item.matchedPart], rates);
    const tier = calculateTierPrice(matchedPart.PriceBreaks, item.requestedQty);
    return {
      ...item,
      matchedPart,
      unitPrice: tier.unitPrice,
      extendedPrice: tier.unitPrice * item.requestedQty,
      currency: tier.currency,
    };
  }
  if (isUsd(item.currency)) return item;
  // No live rate: show no price rather than one in another currency.
  const unitPrice = toUsd(item.unitPrice, item.currency, rates) ?? 0;
  return { ...item, unitPrice, extendedPrice: unitPrice * item.requestedQty, currency: 'USD' };
}
