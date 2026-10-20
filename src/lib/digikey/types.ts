/**
 * DigiKey Product Information API v4 types (subset used by this app)
 * https://developer.digikey.com/products/product-information-v4
 */

export interface DigiKeyPriceBreak {
  BreakQuantity: number;
  UnitPrice: number;
  TotalPrice?: number;
}

export interface DigiKeyProductVariation {
  DigiKeyProductNumber: string;
  PackageType?: { Id?: number; Name?: string };
  StandardPricing?: DigiKeyPriceBreak[];
  MyPricing?: DigiKeyPriceBreak[];
  MarketPlace?: boolean;
  QuantityAvailableforPackageType?: number;
  MinimumOrderQuantity?: number;
  StandardPackage?: number;
}

export interface DigiKeyProduct {
  Description?: { ProductDescription?: string; DetailedDescription?: string };
  Manufacturer?: { Id?: number; Name?: string };
  ManufacturerProductNumber: string;
  UnitPrice?: number;
  ProductUrl?: string;
  DatasheetUrl?: string;
  PhotoUrl?: string;
  ProductVariations?: DigiKeyProductVariation[];
  QuantityAvailable?: number;
  ProductStatus?: { Id?: number; Status?: string };
  Category?: { CategoryId?: number; Name?: string };
  ManufacturerLeadWeeks?: string;
  Classifications?: { RohsStatus?: string };
  Parameters?: Array<{ ParameterId?: number; ParameterText?: string; ValueText?: string }>;
}

export interface DigiKeyKeywordResponse {
  Products?: DigiKeyProduct[];
  ProductsCount?: number;
  ExactMatches?: DigiKeyProduct[];
}

export interface DigiKeyProductDetailsResponse {
  Product?: DigiKeyProduct;
}

export interface DigiKeyCredentials {
  clientId: string;
  clientSecret: string;
  localeSite?: string;
  localeCurrency?: string;
  localeLanguage?: string;
}
