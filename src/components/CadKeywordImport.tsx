'use client';

import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowRight, FileUp, Info, Settings2, Sparkles, AlertTriangle, RotateCcw, Save } from 'lucide-react';
import {
  buildCadConfig,
  cadLinesToBomItems,
  categoriesToText,
  columnsToText,
  DEFAULT_CAD_CATEGORIES,
  DEFAULT_CAD_COLUMNS,
  parseCadBom,
} from '@/lib/parser/cad-keyword-parser';
import { SUPPLIER_LABELS } from '@/lib/supplier';
import { useBomStore } from '@/store/bom-store';
import { useSettingsStore } from '@/store/settings-store';

const EXAMPLE_EXPORT = `# Example tube amp CAD export (Ref, Type, Value, Rating)
C1, Cap, 22uF, 450V, electrolytic
C2, Cap, 22uF, 450V, electrolytic
C3, Cap, 22nF, 630V, film
C4, Cap, 0.1uF, 400V, film
R1-R2, Res, 100k, 1W
R3, Res, 1k5, 0.5W
R4, Res, 470R, 5W
VR1, Pot, 1M, audio
V1, Tube, 12AX7
V2, Tube, EL84
V3, Tube, EZ81
D1-D4, Diode, 1N4007
L1, Choke, 5H`;

function RulesEditor({ onClose }: { onClose: () => void }) {
  const { cadCategoriesText, cadColumnsText, saveCadRules } = useSettingsStore();
  const [categoriesText, setCategoriesText] = useState(
    cadCategoriesText || categoriesToText(DEFAULT_CAD_CATEGORIES)
  );
  const [columnsText, setColumnsText] = useState(cadColumnsText || columnsToText(DEFAULT_CAD_COLUMNS));

  return (
    <div className="space-y-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white">Component keywords</label>
          <p className="text-[11px] text-slate-400">
            <code>Category: keyword, keyword | designator prefixes</code>. The category name is added to the search query.
          </p>
          <textarea
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-[11px] text-white font-mono leading-relaxed focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white">Column header keywords</label>
          <p className="text-[11px] text-slate-400">
            Used when the export has a header row. <code>column: header names</code>
          </p>
          <textarea
            value={columnsText}
            onChange={(e) => setColumnsText(e.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-[11px] text-white font-mono leading-relaxed focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setCategoriesText(categoriesToText(DEFAULT_CAD_CATEGORIES));
            setColumnsText(columnsToText(DEFAULT_CAD_COLUMNS));
            saveCadRules('', '');
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to defaults</span>
        </button>
        <button
          type="button"
          onClick={() => {
            saveCadRules(categoriesText, columnsText);
            onClose();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save keywords</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Import a BOM exported from a schematic/CAD tool that lists components by
 * type and value (Cap 22uF 450V, Res 100k 1W, Tube 12AX7...). Each line
 * becomes a keyword search against the selected supplier.
 */
export function CadKeywordImport() {
  const { supplier, items, setItems, resolveAllItems, isResolving } = useBomStore();
  const { cadCategoriesText, cadColumnsText } = useSettingsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => buildCadConfig(cadCategoriesText, cadColumnsText), [cadCategoriesText, cadColumnsText]);
  const result = useMemo(() => (text.trim() ? parseCadBom(text, config) : null), [text, config]);
  const label = SUPPLIER_LABELS[supplier];

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (ext === 'xlsx' || ext === 'xls') {
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) throw new Error('Spreadsheet has no sheets');
        setText(XLSX.utils.sheet_to_csv(sheet, { FS: ';' }));
      } else {
        setText(await file.text());
      }
      setFileName(file.name);
    } catch (err: unknown) {
      setError((err as Error).message || 'Could not read the file');
    }
  };

  const handleImport = () => {
    if (!result || result.lines.length === 0) return;
    if (
      items.length > 0 &&
      !window.confirm(`Replace the ${items.length} lines currently in your ${label} BOM with this CAD import?`)
    ) {
      return;
    }
    setItems(cadLinesToBomItems(result.lines));
    resolveAllItems();
    setText('');
    setFileName(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            Paste or load a BOM from your tube amp CAD. Lines are matched by keywords like <code>Cap</code>,{' '}
            <code>Res</code>, <code>Tube</code> and values like <code>22uF 450V</code> or <code>100k 1W</code>, then
            searched on {label}.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setText(EXAMPLE_EXPORT);
              setFileName(null);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Load example</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <FileUp className="w-3.5 h-3.5 text-blue-400" />
            <span>Load file</span>
          </button>
          <button
            type="button"
            onClick={() => setShowRules(!showRules)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-slate-300" />
            <span>{showRules ? 'Hide keywords' : 'Edit keywords'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt,.bom,.lst,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {showRules && <RulesEditor onClose={() => setShowRules(false)} />}

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setFileName(null);
        }}
        rows={7}
        spellCheck={false}
        placeholder={`C1, Cap, 22uF, 450V\nR1-R4, Res, 100k, 1W\nV1, Tube, 12AX7`}
        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono leading-relaxed resize-y"
      />

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">{error}</div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              {fileName ? <strong className="text-slate-200">{fileName}: </strong> : null}
              <strong className="text-white">{result.lines.length}</strong> components recognised
              {result.headerDetected ? ' (header row detected)' : ''}
              {result.unmatched.length > 0 && (
                <>
                  , <strong className="text-amber-300">{result.unmatched.length}</strong> lines skipped
                </>
              )}
            </span>
          </div>

          {result.lines.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40 max-h-72">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0">
                  <tr className="border-b border-slate-800 bg-slate-900 text-slate-400">
                    <th className="py-2 px-3 font-medium">Category</th>
                    <th className="py-2 px-3 font-medium">Designators</th>
                    <th className="py-2 px-3 font-medium">Qty</th>
                    <th className="py-2 px-3 font-medium">{label} search query</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {result.lines.map((line) => (
                    <tr key={`${line.category}-${line.query}`}>
                      <td className="py-1.5 px-3 text-amber-200">{line.category}</td>
                      <td className="py-1.5 px-3 font-mono text-purple-300 max-w-[200px] truncate" title={line.designators.join(', ')}>
                        {line.designators.join(', ') || '—'}
                      </td>
                      <td className="py-1.5 px-3 font-mono font-bold">{line.quantity}</td>
                      <td className="py-1.5 px-3 font-mono text-blue-200">{line.query}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.unmatched.length > 0 && (
            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Skipped lines (add a keyword for them under Edit keywords)</span>
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-[11px]">
                {result.unmatched.map((u) => (
                  <li key={u.lineNumber}>
                    <span className="text-slate-500">Line {u.lineNumber}:</span> {u.text}{' '}
                    <span className="text-amber-400/80">({u.reason})</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleImport}
              disabled={result.lines.length === 0 || isResolving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition"
            >
              <span>
                Import {result.lines.length} lines &amp; search {label}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
