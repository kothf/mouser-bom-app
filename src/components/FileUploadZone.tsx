'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  ClipboardPaste,
  Sparkles,
  Loader2,
  ArrowRight,
  Info,
  Plus,
  Zap,
} from 'lucide-react';
import { parseBomFile, parseTextContent } from '@/lib/parser/bom-parser';
import { ParsedRawFile } from '@/lib/mouser/types';
import { SAMPLE_BOMS } from '@/lib/parser/sample-boms';
import { useBomStore } from '@/store/bom-store';
import { CadKeywordImport } from './CadKeywordImport';

interface FileUploadZoneProps {
  onParsedFile: (parsed: ParsedRawFile) => void;
}

export function FileUploadZone({ onParsedFile }: FileUploadZoneProps) {
  const { setIsManualSearchOpen } = useBomStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'cad'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setErrorMessage(null);
    try {
      const parsed = await parseBomFile(file);
      onParsedFile(parsed);
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage((err as Error).message || 'Failed to parse file. Please verify file format.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedText.trim()) return;
    setIsParsing(true);
    setErrorMessage(null);
    try {
      const parsed = parseTextContent(pastedText, 'pasted_bom.txt');
      onParsedFile(parsed);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to parse text input.');
    } finally {
      setIsParsing(false);
    }
  };

  const loadSample = (key: keyof typeof SAMPLE_BOMS) => {
    const sample = SAMPLE_BOMS[key];
    if (!sample) return;

    const rows = sample.items.map((it) => ({
      'Part Number': it.partNumber,
      Quantity: String(it.quantity),
      Designator: it.designator,
      Description: it.description,
    }));

    const parsed: ParsedRawFile = {
      fileName: `${sample.name}.xlsx`,
      headers: ['Part Number', 'Quantity', 'Designator', 'Description'],
      rows,
      suggestedMapping: {
        partNumberCol: 'Part Number',
        quantityCol: 'Quantity',
        designatorCol: 'Designator',
        descriptionCol: 'Description',
      },
    };

    onParsedFile(parsed);
  };

  const tabs = [
    { id: 'upload' as const, icon: FileSpreadsheet, label: 'File', long: 'Spreadsheet / CSV / TXT' },
    { id: 'paste' as const, icon: ClipboardPaste, label: 'Paste', long: 'Paste text' },
    { id: 'cad' as const, icon: Zap, label: 'Tube CAD', long: 'Tube Amp CAD (keywords)' },
  ];

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl shadow-black/20 relative overflow-hidden">
      {/* Tab Selector */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-3 sm:px-5">
        <div role="tablist" aria-label="Import source" className="flex items-center gap-1 overflow-x-auto -mb-px">
          {tabs.map(({ id, icon: Icon, label, long }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-3 py-3.5 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                  isActive
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
                <span className="sm:hidden">{label}</span>
                <span className="hidden sm:inline">{long}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsManualSearchOpen(true)}
          className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition shrink-0"
          title="Add an individual line item manually"
        >
          <Plus className="w-4 h-4" />
          <span>Add Line</span>
        </button>
      </div>

      <div className="p-4 sm:p-5">
      {/* Tab 1: Drag & Drop Upload */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition flex flex-col items-center justify-center ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700/80 hover:border-blue-500/50 bg-slate-950/40 hover:bg-slate-950/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.tsv,.txt"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20 mb-4">
            {isParsing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>

          <h3 className="text-sm font-semibold text-white mb-1">
            {isParsing ? 'Reading BOM file…' : (
              <>
                Drop your BOM here, or <span className="text-blue-400">browse files</span>
              </>
            )}
          </h3>
          <p className="text-xs text-slate-400 max-w-md">
            Excel (<span className="text-slate-300 font-mono">.xlsx, .xls</span>), CSV, TSV or plain text. Columns are detected
            automatically and you can adjust the mapping before import.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <span>Prefer adding parts one by one?</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsManualSearchOpen(true);
              }}
              className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line</span>
            </button>
          </div>
        </div>

        {/* 1-Click Sample BOMs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">Try a sample:</span>
          {[
            { key: 'hammondPowerSupply' as const, label: 'Hammond Tube Supply' },
            { key: 'iotNode' as const, label: 'IoT Sensor Node' },
            { key: 'motorController' as const, label: 'STM32 Controller' },
          ].map((sample) => (
            <button
              key={sample.key}
              type="button"
              onClick={() => loadSample(sample.key)}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{sample.label}</span>
            </button>
          ))}
        </div>
        </div>
      )}

      {/* Tab 2: Raw Text Paste */}
      {activeTab === 'paste' && (
        <div className="space-y-3">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={5}
            placeholder={`STM32F401RET6 10 U1\nESP32-WROOM-32E 5 U2\nRC0603FR-0710KL 100 R1-R100\nCC0603KRX7R9BB104 100 C1-C100`}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono leading-relaxed resize-y"
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-1.5 text-xs text-slate-400">
              <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
              <span>One part per line, separated by comma, tab or space: <code className="font-mono text-slate-300">PartNumber Qty [Designator]</code></span>
            </div>
            <button
              onClick={handlePasteSubmit}
              disabled={!pastedText.trim() || isParsing}
              className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md transition"
            >
              {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>Process Text BOM</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: CAD export matched by component keywords */}
      {activeTab === 'cad' && <CadKeywordImport />}

      {/* Error Alert */}
      {errorMessage && (
        <div role="alert" className="mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}
      </div>
    </div>
  );
}
