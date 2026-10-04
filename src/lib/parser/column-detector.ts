import { ColumnMapping } from '../mouser/types';

/**
 * Intelligent Column Detection for Electronics Bills of Materials (BOM)
 */

const PART_NUMBER_ALIASES = [
  'mouserpartnumber',
  'mouser_part_number',
  'mouser_pn',
  'mouserpart#',
  'mouser#',
  'mfrpartnumber',
  'mfr_part_number',
  'mfr_pn',
  'mpn',
  'partnumber',
  'part_number',
  'part_no',
  'part#',
  'pn',
  'component',
  'device',
  'order_code',
  'catalog_no',
];

const QUANTITY_ALIASES = [
  'qty',
  'quantity',
  'count',
  'amount',
  'req_qty',
  'requested_qty',
  'order_qty',
  'pieces',
  'pcs',
  'total_qty',
];

const DESIGNATOR_ALIASES = [
  'customerreference',
  'customer_reference',
  'customerref',
  'customer_ref',
  'custref',
  'cust_ref',
  'customerpartnumber',
  'customer_part_number',
  'customerpart#',
  'designator',
  'refdes',
  'reference_designator',
  'reference',
  'ref',
  'line',
  'location',
  'pos',
  'position',
  'schematic_ref',
];

const DESCRIPTION_ALIASES = [
  'description',
  'desc',
  'details',
  'specs',
  'specification',
  'title',
  'component_name',
  'value',
];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  let partNumberCol = '';
  let quantityCol = '';
  let designatorCol = '';
  let descriptionCol = '';

  for (const header of headers) {
    const norm = normalizeHeader(header);

    if (!partNumberCol) {
      if (PART_NUMBER_ALIASES.includes(norm)) {
        partNumberCol = header;
      }
    }

    if (!quantityCol) {
      if (QUANTITY_ALIASES.includes(norm)) {
        quantityCol = header;
      }
    }

    if (!designatorCol) {
      if (DESIGNATOR_ALIASES.includes(norm)) {
        designatorCol = header;
      }
    }

    if (!descriptionCol) {
      if (DESCRIPTION_ALIASES.includes(norm)) {
        descriptionCol = header;
      }
    }
  }

  // Fallback defaults if exact alias match was not found
  if (!partNumberCol && headers.length > 0) {
    partNumberCol = headers[0];
  }
  if (!quantityCol && headers.length > 1) {
    quantityCol = headers[1];
  }
  if (!designatorCol && headers.length > 2) {
    designatorCol = headers[2];
  }

  return {
    partNumberCol: partNumberCol || (headers[0] ?? ''),
    quantityCol: quantityCol || '',
    designatorCol: designatorCol || '',
    descriptionCol: descriptionCol || '',
  };
}
