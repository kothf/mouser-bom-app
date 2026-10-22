import { BOMItem, MouserCartResponse, MouserPart } from '@/lib/mouser/types';
import { calculateTierPrice, parsePriceStringToNumber } from '@/lib/mouser/client';
import { normalizeCurrencyCode } from '@/lib/utils';

/** Units of each currency per 1 USD. */
export type UsdRates = Record<string, number>;

/**
 * Approximate rates used only when no live rate source answers, so prices
 * still come out in USD instead of the Mouser account's currency.
 */
export const FALLBACK_USD_RATES: UsdRates = {
  USD: 1,
  EUR: 0.86,
  GBP: 0.75,
  ILS: 3.3,
  JPY: 150,
  CAD: 1.39,
  AUD: 1.53,
  NZD: 1.72,
  CHF: 0.8,
  CNY: 7.1,
  HKD: 7.8,
  TWD: 30,
  SGD: 1.29,
  KRW: 1400,
  INR: 88,
  THB: 32.5,
  MYR: 4.2,
  SEK: 9.4,
  NOK: 10,
  DKK: 6.4,
  PLN: 3.65,
  CZK: 20.8,
  HUF: 335,
  RON: 4.35,
  TRY: 42,
  ZAR: 17.4,
  MXN: 18.4,
  BRL: 5.4,
};

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
 * in a currency with no known rate is kept unchanged.
 */
export function convertPartsWithRates(parts: MouserPart[], rates: UsdRates): MouserPart[] {
  return parts.map((part) => {
    if (!part.PriceBreaks || part.PriceBreaks.length === 0) return part;
    return {
      ...part,
      PriceBreaks: part.PriceBreaks.map((b) => {
        if (isUsd(b.Currency)) return { ...b, Currency: 'USD' };
        const usd = toUsd(parsePriceStringToNumber(b.Price), b.Currency, rates);
        if (usd === null || !(usd > 0)) return b;
        return { ...b, Price: `$${usd.toFixed(usd < 1 ? 5 : 2)}`, Currency: 'USD' };
      }),
    };
  });
}

/** A Mouser cart with its total and line prices in USD. */
export function convertCartWithRates(cart: MouserCartResponse, rates: UsdRates): MouserCartResponse {
  if (isUsd(cart.CurrencyCode)) return cart;
  const convert = (n: number | undefined) => (n === undefined ? n : toUsd(n, cart.CurrencyCode, rates));
  if (convert(1) === null) return cart;
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
  const unitPrice = toUsd(item.unitPrice, item.currency, rates);
  if (unitPrice === null) return item;
  return { ...item, unitPrice, extendedPrice: unitPrice * item.requestedQty, currency: 'USD' };
}
