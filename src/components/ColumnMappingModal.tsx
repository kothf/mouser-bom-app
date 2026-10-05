'use client';

import React, { useState } from 'react';
import { X, Check, ArrowRight, Table as TableIcon, FileText } from 'lucide-react';
import { ParsedRawFile, ColumnMapping } from '@/lib/mouser/types';
import { buildBomItemsFromRows } from '@/lib/parser/bom-parser';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';

interface ColumnMappingModalProps {
  parsedFile: ParsedRawFile | null;
  onClose: () => void;
}

export function ColumnMappingModal({ parsedFile, onClose }: ColumnMappingModalProps) {
  const { setItems, resolveAllItems } = useBomStore();
  const { searchApiKey } = useSettingsStore();

  const [mapping, setMapping] = useState<ColumnMapping>(
    parsedFile?.suggestedMapping || {
      partNumberCol: '',
      quantityCol: '',
      designatorCol: '',
      descriptionCol: '',
    }
  );

  if (!parsedFile) return null;

  const handleConfirm = async () => {
    if (!mapping.partNumberCol) {
      alert('Please select the column containing the Part Number');
      return;
    }

    const items = buildBomItemsFromRows(parsedFile.rows, mapping);
    setItems(items);
    onClose();

    // Trigger automatic resolution through Mouser API
    resolveAllItems(searchApiKey);
  };

  const previewRows = parsedFile.rows.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Map BOM Columns</h2>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <FileText className="w-3.5 h-3.5" />
                <span>{parsedFile.fileName}</span>
                <span>•</span>
                <span>{parsedFile.rows.length} rows detected</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Mapping Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            {/* Part Number Column (Required) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1">
                <span>Part Number (MPN or Mouser #)</span>
                <span className="text-rose-400">*</span>
              </label>
              <select
                value={mapping.partNumberCol}
                onChange={(e) => setMapping({ ...mapping, partNumberCol: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Select Column --</option>
                {parsedFile.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Column */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Quantity</label>
              <select
                value={mapping.quantityCol}
                onChange={(e) => setMapping({ ...mapping, quantityCol: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- None (Defaults to 1) --</option>
                {parsedFile.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Designator Column */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Reference / Designator</label>
              <select
                value={mapping.designatorCol}
                onChange={(e) => setMapping({ ...mapping, designatorCol: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Optional (e.g. C1, R5) --</option>
                {parsedFile.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Description Column */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white">Description / Notes</label>
              <select
                value={mapping.descriptionCol}
                onChange={(e) => setMapping({ ...mapping, descriptionCol: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Optional --</option>
                {parsedFile.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-slate-300">
                File Data Preview (First 5 Rows)
              </span>
              <span>Showing mapped field highlights</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                    <th className="py-2.5 px-3 font-medium">#</th>
                    {parsedFile.headers.map((h) => {
                      const isPn = h === mapping.partNumberCol;
                      const isQty = h === mapping.quantityCol;
                      const isDes = h === mapping.designatorCol;

                      return (
                        <th
                          key={h}
                          className={`py-2.5 px-3 font-medium ${
                            isPn
                              ? 'text-blue-400 bg-blue-500/10'
                              : isQty
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : isDes
                              ? 'text-purple-400 bg-purple-500/10'
                              : ''
                          }`}
                        >
                          <div className="flex flex-col">
                            <span>{h}</span>
                            {isPn && <span className="text-[10px] font-bold text-blue-400">Part #</span>}
                            {isQty && <span className="text-[10px] font-bold text-emerald-400">Qty</span>}
                            {isDes && <span className="text-[10px] font-bold text-purple-400">Designator</span>}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                      {parsedFile.headers.map((h) => (
                        <td
                          key={h}
                          className={`py-2 px-3 truncate max-w-[200px] ${
                            h === mapping.partNumberCol
                              ? 'font-mono font-medium text-blue-200 bg-blue-500/5'
                              : h === mapping.quantityCol
                              ? 'font-medium text-emerald-200 bg-emerald-500/5'
                              : h === mapping.designatorCol
                              ? 'font-medium text-purple-200 bg-purple-500/5'
                              : ''
                          }`}
                        >
                          {row[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!mapping.partNumberCol}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-md transition"
          >
            <span>Import & Query Mouser</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
