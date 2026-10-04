/**
 * Mouser Electronics API & BOM Data Types
 */

export interface MouserPriceBreak {
  Quantity: number;
  Price: string;
  Currency: string;
}

export interface MouserPart {
  Availability: string;
  DataSheetUrl?: string;
  Description: string;
  FactoryStock: string;
  ImagePath?: string;
  Category?: string;
  LeadTime?: string;
  LifecycleStatus?: string;
  Manufacturer: string;
  ManufacturerPartNumber: string;
  Min: string; // Minimum Order Quantity (MOQ)
  Mult: string; // Order Multiple
  MouserPartNumber: string;
  ProductDetailUrl: string;
  Reeling?: boolean;
  ROHSStatus?: string;
  SuggestedReplacement?: string;
  PriceBreaks: MouserPriceBreak[];
  UnitWeightKg?: number;
}

export interface MouserSearchResponse {
  SearchResults?: {
    NumberOfResult: number;
    Parts: MouserPart[];
  };
  Errors?: Array<{
    Code?: string;
    Message?: string;
    ResourceKey?: string;
  }>;
}

export interface MouserCartItem {
  MouserPartNumber: string;
  Quantity: number;
  CustomerPartNumber?: string;
}

export interface MouserCartRequest {
  CartKey?: string;
  CartItems: MouserCartItem[];
}

export interface MouserCartResponseItem {
  MouserPartNumber: string;
  Quantity: number;
  CustomerPartNumber?: string;
  UnitPrice?: number;
  ExtendedPrice?: number;
  Errors?: Array<{ Code?: string; Message?: string }>;
}

export interface MouserCartResponse {
  CartKey: string;
  CurrencyCode?: string;
  CartItems?: MouserCartResponseItem[];
  Total?: number;
  CheckoutUrl?: string;
  Errors?: Array<{
    Code?: string;
    Message?: string;
  }>;
}

export type BOMItemStatus =
  | 'pending'
  | 'matched'
  | 'low_stock'
  | 'moq_warning'
  | 'unresolved'
  | 'error';

export interface BOMItem {
  id: string;
  lineNumber: number;
  designator: string;
  rawPartNumber: string;
  requestedQty: number;
  notes?: string;

  // Resolved Mouser fields
  status: BOMItemStatus;
  errorMessage?: string;
  matchedPart?: MouserPart;
  unitPrice: number;
  extendedPrice: number;
  currency: string;
  availableStock: number;
  moq: number;
  orderMultiple: number;
  meetsMoq: boolean;
  meetsMultiple: boolean;
  isCustomPart?: boolean;
}

export interface ColumnMapping {
  partNumberCol: string;
  quantityCol: string;
  designatorCol: string;
  descriptionCol?: string;
}

export interface ParsedRawFile {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  suggestedMapping: ColumnMapping;
}

export interface MouserApiConfig {
  searchApiKey?: string;
  cartApiKey?: string;
  useDemoMode: boolean;
  rateLimitDelayMs: number;
  maxConcurrency: number;
}

export interface BOMSummary {
  totalLineItems: number;
  totalQuantity: number;
  totalCost: number;
  currency: string;
  matchedCount: number;
  lowStockCount: number;
  unresolvedCount: number;
  fulfillmentRate: number; // Percentage of items that can be fulfilled immediately from stock
}
