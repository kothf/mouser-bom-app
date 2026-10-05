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
} from 'lucide-react';
import { parseBomFile, parseTextContent } from '@/lib/parser/bom-parser';
import { ParsedRawFile } from '@/lib/mouser/types';
import { SAMPLE_BOMS } from '@/lib/parser/sample-boms';

interface FileUploadZoneProps {
  onParsedFile: (parsed: ParsedRawFile) => void;
}

export function FileUploadZone({ onParsedFile }: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Tab Selector */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Spreadsheet / CSV / TXT</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'paste'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Paste Raw BOM Text</span>
          </button>
        </div>

        {/* 1-Click Sample BOMs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">Sample BOMs:</span>
          <button
            onClick={() => loadSample('hammondPowerSupply')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Hammond Tube Supply</span>
          </button>
          <button
            onClick={() => loadSample('iotNode')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>IoT Sensor Node</span>
          </button>
          <button
            onClick={() => loadSample('motorController')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>STM32 Controller</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Drag & Drop Upload */}
      {activeTab === 'upload' && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/70'
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

          <div className="p-3.5 rounded-full bg-blue-500/10 text-blue-400 mb-3">
            {isParsing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          <h3 className="text-sm font-semibold text-white mb-1">
            {isParsing ? 'Parsing BOM file...' : 'Drop your BOM spreadsheet here, or click to browse'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-3">
            Supports Microsoft Excel (<span className="text-slate-300 font-mono">.xlsx, .xls</span>), CSV, TSV, or plain text BOM lists.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Auto Column Detection</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Dynamic Header Mapping</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Batch Rate Limiting</span>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Delimited by comma, tab, or space: <code>PartNumber Qty [Designator]</code></span>
            </div>
            <button
              onClick={handlePasteSubmit}
              disabled={!pastedText.trim() || isParsing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md transition"
            >
              {isParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>Process Text BOM</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
