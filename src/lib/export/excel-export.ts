import * as XLSX from 'xlsx';
import { BOMItem } from '../mouser/types';
import { Supplier, SUPPLIER_LABELS } from '../supplier';

/**
 * Enriched BOM Exporter
 * Exports calculated BOM data back into formatted XLSX or CSV.
 */

export function exportBomToExcel(items: BOMItem[], supplier: Supplier = 'mouser', fileName?: string) {
  const label = SUPPLIER_LABELS[supplier];
  const exportRows = items.map((item, index) => {
    const part = item.matchedPart;

    return {
      'Line #': item.lineNumber || index + 1,
      'Designator / Ref': item.designator || '',
      'Input Part Number': item.rawPartNumber,
      [`${label} Part Number`]: part?.MouserPartNumber || (item.status === 'matched' ? item.rawPartNumber : 'N/A'),
      'Manufacturer Part Number': part?.ManufacturerPartNumber || item.rawPartNumber,
      'Manufacturer': part?.Manufacturer || 'N/A',
      'Description': part?.Description || item.notes || 'N/A',
      'Status': item.status.toUpperCase(),
      'Lifecycle': part?.LifecycleStatus || 'N/A',
      [`${label} Available Stock`]: item.availableStock,
      'MOQ': item.moq,
      'Order Multiple': item.orderMultiple,
      'Requested Qty': item.requestedQty,
      'Unit Price ($)': Number(item.unitPrice.toFixed(4)),
      'Extended Total ($)': Number(item.extendedPrice.toFixed(2)),
      'Currency': item.currency || 'USD',
      'Meets MOQ': item.meetsMoq ? 'Yes' : 'NO (Below MOQ)',
      'Meets Multiple': item.meetsMultiple ? 'Yes' : 'NO (Order Multiple Mismatch)',
      [`${label} URL`]: part?.ProductDetailUrl || '',
      'Datasheet URL': part?.DataSheetUrl || '',
    };
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 8 },  // Line #
    { wch: 18 }, // Designator
    { wch: 22 }, // Input PN
    { wch: 24 }, // Supplier PN
    { wch: 24 }, // Mfr PN
    { wch: 22 }, // Manufacturer
    { wch: 45 }, // Description
    { wch: 12 }, // Status
    { wch: 12 }, // Lifecycle
    { wch: 16 }, // Available Stock
    { wch: 8 },  // MOQ
    { wch: 12 }, // Multiple
    { wch: 14 }, // Requested Qty
    { wch: 14 }, // Unit Price
    { wch: 16 }, // Extended Total
    { wch: 10 }, // Currency
    { wch: 14 }, // Meets MOQ
    { wch: 14 }, // Meets Mult
    { wch: 45 }, // Supplier URL
    { wch: 45 }, // Datasheet URL
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Enriched BOM');

  XLSX.writeFile(workbook, fileName || `Enriched_${label}_BOM.xlsx`);
}

export function exportBomToCsv(items: BOMItem[], supplier: Supplier = 'mouser', fileName?: string) {
  const label = SUPPLIER_LABELS[supplier];
  const exportRows = items.map((item, index) => {
    const part = item.matchedPart;

    return {
      'Line #': item.lineNumber || index + 1,
      'Designator': item.designator || '',
      'Input Part Number': item.rawPartNumber,
      [`${label} Part Number`]: part?.MouserPartNumber || '',
      'Manufacturer Part Number': part?.ManufacturerPartNumber || '',
      'Manufacturer': part?.Manufacturer || '',
      'Description': (part?.Description || item.notes || '').replace(/[\r\n,]/g, ' '),
      'Status': item.status,
      'Available Stock': item.availableStock,
      'MOQ': item.moq,
      'Requested Qty': item.requestedQty,
      'Unit Price': item.unitPrice.toFixed(4),
      'Extended Total': item.extendedPrice.toFixed(2),
      'Currency': item.currency || 'USD',
      [`${label} URL`]: part?.ProductDetailUrl || '',
    };
  });

  downloadCsv(XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(exportRows)), fileName || `Enriched_${label}_BOM.csv`);
}

function downloadCsv(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// DigiKey's BOM Manager limits the Customer Reference to 48 characters.
const DIGIKEY_CUSTOMER_REF_MAX = 48;

/**
 * Rows in the column layout of the supplier's own BOM upload tool
 * (Mouser BOM Tool, DigiKey BOM Manager), so the headers map without
 * manual column matching. Lines with no real part number yet (an
 * unresolved CAD keyword query) are left out: the tool cannot use them.
 */
export function buildSupplierUploadRows(items: BOMItem[], supplier: Supplier): Record<string, string | number>[] {
  return items
    .filter((item) => item.matchedPart || (item.searchMode !== 'keyword' && item.rawPartNumber.trim()))
    .map((item): Record<string, string | number> => {
      const part = item.matchedPart;
      const supplierPn = part?.MouserPartNumber && part.MouserPartNumber.toLowerCase() !== 'n/a' ? part.MouserPartNumber : '';
      const mpn = part?.ManufacturerPartNumber || item.rawPartNumber;
      const description = (part?.Description || item.notes || '').replace(/[\r\n]+/g, ' ').trim();
      const designator = (item.designator || '').trim();

      if (supplier === 'digikey') {
        return {
          'Quantity': item.requestedQty,
          'Digi-Key Part Number': supplierPn,
          'Manufacturer Part Number': mpn,
          'Manufacturer': part?.Manufacturer || '',
          'Description': description,
          'Customer Reference': designator.slice(0, DIGIKEY_CUSTOMER_REF_MAX),
          'Reference Designator': designator,
        };
      }
      return {
        'Mouser Part Number': supplierPn,
        'Manufacturer Part Number': mpn,
        'Manufacturer': part?.Manufacturer || '',
        'Description': description,
        'Customer Part Number': designator,
        'Quantity': item.requestedQty,
      };
    });
}

/** CSV ready to upload to the Mouser BOM Tool or the DigiKey BOM Manager. */
export function exportBomForSupplierUpload(items: BOMItem[], supplier: Supplier, fileName?: string): number {
  const rows = buildSupplierUploadRows(items, supplier);
  if (rows.length === 0) return 0;
  downloadCsv(XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows)), fileName || `${SUPPLIER_LABELS[supplier]}_BOM_upload.csv`);
  return rows.length;
}
