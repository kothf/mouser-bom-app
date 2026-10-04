import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ParsedRawFile, ColumnMapping, BOMItem } from '../mouser/types';
import { detectColumnMapping } from './column-detector';

/**
 * Universal BOM File Parser
 * Supports: .xlsx, .xls, .csv, .tsv, .txt
 */

export async function parseBomFile(file: File): Promise<ParsedRawFile> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'xlsx' || extension === 'xls') {
    return parseSpreadsheet(file);
  } else if (extension === 'csv' || extension === 'tsv') {
    return parseCsv(file);
  } else if (extension === 'txt') {
    return parseTextFile(file);
  } else {
    // Attempt spreadsheet first, then csv fallback
    try {
      return await parseSpreadsheet(file);
    } catch {
      return await parseCsv(file);
    }
  }
}

/**
 * Parse Excel Spreadsheets (.xlsx, .xls)
 */
async function parseSpreadsheet(file: File): Promise<ParsedRawFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error('Spreadsheet has no sheets');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Parse as raw 2D array to find header row reliably
  const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });

  if (!rawData || rawData.length === 0) {
    throw new Error('Spreadsheet appears to be empty');
  }

  // Find the header row (first row with at least 2 non-empty values)
  let headerIndex = 0;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.filter((c) => String(c).trim().length > 0).length >= 2) {
      headerIndex = i;
      break;
    }
  }

  const headerRowCandidate = (rawData[headerIndex] || []).map((c) => String(c).trim()).join(' ');
  const hasRecognizedHeader = isHeaderRowText(headerRowCandidate);

  let rawHeaders: string[];
  let startRowIndex: number;

  if (hasRecognizedHeader) {
    rawHeaders = (rawData[headerIndex] || []).map((h, idx) =>
      String(h).trim() || `Column_${idx + 1}`
    );
    startRowIndex = headerIndex + 1;
  } else {
    // If spreadsheet has no recognized header row, synthesize standard headers starting from row 0
    const standardHeaders = ['Part Number', 'Quantity', 'Designator', 'Description'];
    const maxCols = Math.max(...rawData.map((r) => (r ? r.length : 0)), 4);
    rawHeaders = Array.from({ length: maxCols }, (_, idx) => standardHeaders[idx] || `Column_${idx + 1}`);
    startRowIndex = headerIndex;
  }

  const rows: Record<string, string>[] = [];
  for (let i = startRowIndex; i < rawData.length; i++) {
    const rowArr = rawData[i];
    if (!rowArr || rowArr.every((c) => String(c).trim().length === 0)) continue;

    const rowObj: Record<string, string> = {};
    rawHeaders.forEach((header, colIdx) => {
      rowObj[header] = String(rowArr[colIdx] ?? '').trim();
    });
    rows.push(rowObj);
  }

  const suggestedMapping = detectColumnMapping(rawHeaders);

  return {
    fileName: file.name,
    headers: rawHeaders,
    rows,
    suggestedMapping,
  };
}

/**
 * Parse CSV or TSV files using PapaParse
 */
async function parseCsv(file: File): Promise<ParsedRawFile> {
  const text = await file.text();
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0 && !l.startsWith('#') && !l.startsWith('//')) || '';
  if (!isHeaderRowText(firstLine)) {
    // If CSV doesn't have a recognizable header row, fall back to line parser
    return parseTextContent(text, file.name);
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          // If no headers detected, fallback to text parser
          try {
            const parsed = parseTextContent(text, file.name);
            resolve(parsed);
          } catch (e: unknown) {
            reject(e);
          }
          return;
        }

        const headers = results.meta.fields.filter((h) => h.length > 0);
        const rows = results.data.map((r) => {
          const clean: Record<string, string> = {};
          headers.forEach((h) => {
            clean[h] = String(r[h] ?? '').trim();
          });
          return clean;
        });

        const suggestedMapping = detectColumnMapping(headers);

        resolve({
          fileName: file.name,
          headers,
          rows,
          suggestedMapping,
        });
      },
      error: (err: unknown) => reject(new Error(`CSV parse error: ${(err as Error)?.message || String(err)}`)),
    });
  });
}

/**
 * Parse plain text files (.txt) with flexible delimiters
 * Handles:
 * "STM32F401RET6 10 C1"
 * "STM32F401RET6, 10, C1"
 * "STM32F401RET6\t10"
 */
async function parseTextFile(file: File): Promise<ParsedRawFile> {
  const text = await file.text();
  return parseTextContent(text, file.name);
}

function splitTextLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((s) => s.trim());
  if (line.includes(',')) return line.split(',').map((s) => s.trim());
  if (line.includes(';')) return line.split(';').map((s) => s.trim());
  return line.split(/\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

function isHeaderRowText(line: string): boolean {
  const norm = line.toLowerCase();
  const headerKeywords = [
    'part number',
    'part #',
    'part no',
    'mouser part',
    'mouser #',
    'mouser pn',
    'mfr part',
    'manufacturer part',
    'mpn',
    'quantity',
    'qty',
    'customer reference',
    'customer part',
    'customer ref',
    'customerpart#',
    'designator',
    'refdes',
    'description',
  ];
  let matches = 0;
  for (const kw of headerKeywords) {
    if (norm.includes(kw)) matches++;
  }
  return matches >= 2 || (matches >= 1 && /^(mouser\s*part|part\s*(number|#|no)?|mpn)/i.test(line.trim()));
}

export function parseTextContent(text: string, fileName: string = 'pasted_bom.txt'): ParsedRawFile {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

  if (lines.length === 0) {
    throw new Error('Text file is empty or contains only comments');
  }

  const firstLine = lines[0];
  const hasHeader = isHeaderRowText(firstLine);

  let headers: string[];
  let dataLines: string[];

  if (hasHeader) {
    headers = splitTextLine(firstLine);
    dataLines = lines.slice(1);
  } else {
    headers = ['Part Number', 'Quantity', 'Designator', 'Description'];
    dataLines = lines;
  }

  const rows: Record<string, string>[] = [];

  for (const line of dataLines) {
    const parts = splitTextLine(line);
    if (parts.length === 0) continue;

    if (hasHeader) {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = parts[idx] || '';
      });
      rows.push(rowObj);
    } else {
      const partNumber = parts[0] || '';
      let quantity = '1';
      let designator = '';
      let description = '';

      if (parts.length >= 4) {
        quantity = parts[1];
        designator = parts[2];
        description = parts.slice(3).join(', ');
      } else if (parts.length === 3) {
        if (/^\d+$/.test(parts[1])) {
          quantity = parts[1];
          designator = parts[2];
        } else {
          // e.g. U1 STM32F401RET6 10
          designator = parts[0];
          const pnCandidate = parts[1];
          const qtyCandidate = parts[2];
          if (/^\d+$/.test(qtyCandidate)) {
            rows.push({
              'Part Number': pnCandidate,
              Quantity: qtyCandidate,
              Designator: designator,
              Description: '',
            });
            continue;
          } else {
            designator = parts.slice(1).join(' ');
          }
        }
      } else if (parts.length === 2) {
        if (/^\d+$/.test(parts[1])) {
          quantity = parts[1];
        } else {
          designator = parts[1];
        }
      }

      rows.push({
        'Part Number': partNumber,
        Quantity: quantity,
        Designator: designator,
        Description: description,
      });
    }
  }

  const suggestedMapping = detectColumnMapping(headers);

  return {
    fileName,
    headers,
    rows,
    suggestedMapping,
  };
}

/**
 * Converts parsed raw rows into initialized BOMItem records
 * using the confirmed ColumnMapping
 */
export function buildBomItemsFromRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): BOMItem[] {
  return rows
    .map((row, index) => {
      const rawPn = (row[mapping.partNumberCol] || '').trim();
      if (!rawPn) return null;

      // Ensure header rows are never accidentally imported as parts
      const isHeaderName = /^(mouser\s*part(\s*number|\s*#|\s*no)?|manufacturer\s*part(\s*number|\s*#|\s*no)?|part(\s*number|\s*#|\s*no)?|mpn|mfr\s*part|component|item\s*#|customer\s*part(\s*number|\s*#|\s*no)?)$/i.test(
        rawPn.trim()
      );
      if (isHeaderName) return null;

      const rawQty = row[mapping.quantityCol] || '1';
      const cleanQty = parseInt(rawQty.replace(/[^0-9]/g, ''), 10);
      const quantity = isNaN(cleanQty) || cleanQty <= 0 ? 1 : cleanQty;

      const designator = mapping.designatorCol ? (row[mapping.designatorCol] || '').trim() : '';
      const notes = mapping.descriptionCol ? (row[mapping.descriptionCol] || '').trim() : '';

      const item: BOMItem = {
        id: `bom-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`,
        lineNumber: index + 1,
        rawPartNumber: rawPn,
        requestedQty: quantity,
        designator: designator || `Line ${index + 1}`,
        notes,
        status: 'pending',
        unitPrice: 0,
        extendedPrice: 0,
        currency: 'USD',
        availableStock: 0,
        moq: 1,
        orderMultiple: 1,
        meetsMoq: true,
        meetsMultiple: true,
      };

      return item;
    })
    .filter((item): item is BOMItem => item !== null)
    .map((item, idx) => ({
      ...item,
      lineNumber: idx + 1,
      designator: item.designator && !/^Line \d+$/i.test(item.designator) ? item.designator : `Line ${idx + 1}`,
    }));
}
