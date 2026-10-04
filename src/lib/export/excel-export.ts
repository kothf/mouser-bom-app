import * as XLSX from 'xlsx';
import { BOMItem } from '../mouser/types';

/**
 * Enriched BOM Exporter
 * Exports calculated BOM data back into formatted XLSX or CSV.
 */

export function exportBomToExcel(items: BOMItem[], fileName: string = 'Enriched_Mouser_BOM.xlsx') {
  const exportRows = items.map((item, index) => {
    const part = item.matchedPart;

    return {
      'Line #': item.lineNumber || index + 1,
      'Designator / Ref': item.designator || '',
      'Input Part Number': item.rawPartNumber,
      'Mouser Part Number': part?.MouserPartNumber || (item.status === 'matched' ? item.rawPartNumber : 'N/A'),
      'Manufacturer Part Number': part?.ManufacturerPartNumber || item.rawPartNumber,
      'Manufacturer': part?.Manufacturer || 'N/A',
      'Description': part?.Description || item.notes || 'N/A',
      'Status': item.status.toUpperCase(),
      'Lifecycle': part?.LifecycleStatus || 'N/A',
      'Mouser Available Stock': item.availableStock,
      'MOQ': item.moq,
      'Order Multiple': item.orderMultiple,
      'Requested Qty': item.requestedQty,
      'Unit Price ($)': Number(item.unitPrice.toFixed(4)),
      'Extended Total ($)': Number(item.extendedPrice.toFixed(2)),
      'Currency': item.currency || 'USD',
      'Meets MOQ': item.meetsMoq ? 'Yes' : 'NO (Below MOQ)',
      'Meets Multiple': item.meetsMultiple ? 'Yes' : 'NO (Order Multiple Mismatch)',
      'Mouser URL': part?.ProductDetailUrl || '',
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
    { wch: 24 }, // Mouser PN
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
    { wch: 45 }, // Mouser URL
    { wch: 45 }, // Datasheet URL
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Enriched BOM');

  XLSX.writeFile(workbook, fileName);
}

export function exportBomToCsv(items: BOMItem[], fileName: string = 'Enriched_Mouser_BOM.csv') {
  const exportRows = items.map((item, index) => {
    const part = item.matchedPart;

    return {
      'Line #': item.lineNumber || index + 1,
      'Designator': item.designator || '',
      'Input Part Number': item.rawPartNumber,
      'Mouser Part Number': part?.MouserPartNumber || '',
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
      'Mouser URL': part?.ProductDetailUrl || '',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

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
