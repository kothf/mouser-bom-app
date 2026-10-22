import { ColumnMapping } from '../mouser/types';
import { SUPPLIERS, Supplier } from '../supplier';

/**
 * Intelligent Column Detection for Electronics Bills of Materials (BOM)
 */

// Part number columns, in the order they are preferred. The active
// supplier's own part number wins, then the manufacturer part number;
// the other supplier's part number is only used when nothing else fits.
const SUPPLIER_PN_ALIASES: Record<Supplier, string[]> = {
  mouser: ['mouserpartnumber', 'mouserpartno', 'mouserpart', 'mouserpn', 'mouser', 'mouserno'],
  digikey: [
    'digikeypartnumber',
    'digikeypartno',
    'digikeypart',
    'digikeypn',
    'digikey',
    'digikeyproductnumber',
    'dkpartnumber',
    'dkpn',
  ],
};

const MPN_ALIASES = [
  'manufacturerpartnumber',
  'manufacturerpartno',
  'manufacturerpn',
  'mfrpartnumber',
  'mfrpartno',
  'mfrpart',
  'mfrpn',
  'mpn',
];

const PART_NUMBER_ALIASES = [
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

function findColumn(headers: string[], aliases: string[]): string {
  const wanted = new Set(aliases.map(normalizeHeader));
  return headers.find((h) => wanted.has(normalizeHeader(h))) || '';
}

/** The part number column for a supplier's BOM (see the alias order above). */
function detectPartNumberColumn(headers: string[], supplier: Supplier): string {
  const others = SUPPLIERS.filter((s) => s !== supplier).flatMap((s) => SUPPLIER_PN_ALIASES[s]);
  for (const aliases of [SUPPLIER_PN_ALIASES[supplier], MPN_ALIASES, PART_NUMBER_ALIASES, others]) {
    const col = findColumn(headers, aliases);
    if (col) return col;
  }
  return '';
}

export function detectColumnMapping(headers: string[], supplier: Supplier = 'mouser'): ColumnMapping {
  let partNumberCol = detectPartNumberColumn(headers, supplier);
  let quantityCol = findColumn(headers, QUANTITY_ALIASES);
  let designatorCol = findColumn(headers, DESIGNATOR_ALIASES);
  const descriptionCol = findColumn(headers, DESCRIPTION_ALIASES);

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
