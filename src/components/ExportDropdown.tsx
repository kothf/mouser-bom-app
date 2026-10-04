'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Copy, Check, ChevronDown } from 'lucide-react';
import { useBomStore } from '@/store/bom-store';
import { exportBomToExcel, exportBomToCsv } from '@/lib/export/excel-export';

export function ExportDropdown() {
  const { items } = useBomStore();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (items.length === 0) return null;

  const handleCopyTsv = () => {
    const header = 'Line\tDesignator\tPart Number\tQty\tUnit Price\tExtended Price\tStatus\n';
    const lines = items
      .map(
        (it) =>
          `${it.lineNumber}\t${it.designator}\t${it.rawPartNumber}\t${it.requestedQty}\t${it.unitPrice.toFixed(
            4
          )}\t${it.extendedPrice.toFixed(2)}\t${it.status}`
      )
      .join('\n');

    navigator.clipboard.writeText(header + lines);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setIsOpen(false);
    }, 2000);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm transition"
      >
        <Download className="w-4 h-4 text-blue-400" />
        <span>Download Enriched BOM</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-2xl bg-slate-900 border border-slate-700 divide-y divide-slate-800 focus:outline-none z-30 animate-in fade-in">
          <div className="p-1">
            <button
              onClick={() => {
                exportBomToExcel(items);
                setIsOpen(false);
              }}
              className="group flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white rounded-lg transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400 group-hover:text-white" />
              <div className="text-left">
                <p className="font-medium">Excel Spreadsheet (.xlsx)</p>
                <p className="text-[10px] text-slate-400 group-hover:text-blue-100">
                  Full formatting, links & pricing
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                exportBomToCsv(items);
                setIsOpen(false);
              }}
              className="group flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-200 hover:bg-blue-600 hover:text-white rounded-lg transition"
            >
              <FileText className="w-4 h-4 text-blue-400 group-hover:text-white" />
              <div className="text-left">
                <p className="font-medium">CSV File (.csv)</p>
                <p className="text-[10px] text-slate-400 group-hover:text-blue-100">
                  Standard comma-separated format
                </p>
              </div>
            </button>
          </div>

          <div className="p-1">
            <button
              onClick={handleCopyTsv}
              className="group flex items-center gap-2.5 w-full px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 rounded-lg transition"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-slate-400" />
              )}
              <div className="text-left">
                <p className="font-medium">{copied ? 'Copied to Clipboard!' : 'Copy as TSV Text'}</p>
                <p className="text-[10px] text-slate-500">Paste directly into Google Sheets</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
