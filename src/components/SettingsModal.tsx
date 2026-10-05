'use client';

import React, { useState } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Sliders,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useSettingsStore } from '@/store/settings-store';
import { useBomStore } from '@/store/bom-store';
import { apiPath } from '@/lib/api-path';
import { sanitizeApiKey } from '@/lib/mouser/client';

export function SettingsModal() {
  const {
    searchApiKey,
    cartApiKey,
    rateLimitDelayMs,
    maxConcurrency,
    isSettingsOpen,
    saveSettings,
    setIsSettingsOpen,
  } = useSettingsStore();

  const { items, resolveAllItems } = useBomStore();

  const [localSearchKey, setLocalSearchKey] = useState(searchApiKey);
  const [localCartKey, setLocalCartKey] = useState(cartApiKey);
  const [localDelay, setLocalDelay] = useState(rateLimitDelayMs);
  const [localConcurrency, setLocalConcurrency] = useState(maxConcurrency);

  const [showSearchKey, setShowSearchKey] = useState(false);
  const [showCartKey, setShowCartKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string } | null>(null);

  React.useEffect(() => {
    if (isSettingsOpen) {
      setLocalSearchKey(searchApiKey);
      setLocalCartKey(cartApiKey);
      setLocalDelay(rateLimitDelayMs);
      setLocalConcurrency(maxConcurrency);
      setTestResult(null);
      setSavedSuccess(false);
    }
  }, [isSettingsOpen, searchApiKey, cartApiKey, rateLimitDelayMs, maxConcurrency]);

  if (!isSettingsOpen) return null;

  const handleTestKey = async () => {
    const cleanKey = sanitizeApiKey(localSearchKey);
    if (!cleanKey) {
      setTestResult({ valid: false, message: 'Please enter a Search API Key to test' });
      return;
    }

    setLocalSearchKey(cleanKey);
    setTestingKey(true);
    setTestResult(null);

    try {
      const res = await fetch(apiPath('/api/mouser/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });
      const data = await res.json();
      if (data.valid) {
        setTestResult({ valid: true, message: '✓ Valid Search API Key — Saved automatically!' });
        // Auto-save verified key to store & localStorage immediately
        await saveSettings({
          searchApiKey: cleanKey,
          cartApiKey: sanitizeApiKey(localCartKey),
          rateLimitDelayMs: localDelay,
          maxConcurrency: localConcurrency,
        });
        setSavedSuccess(true);

        // If BOM has items waiting, auto-resolve with the verified key!
        if (items.length > 0) {
          resolveAllItems(cleanKey);
        }
      } else {
        setTestResult({ valid: false, message: data.message || 'Key rejected by Mouser API' });
      }
    } catch (err: unknown) {
      setTestResult({ valid: false, message: (err as Error).message || 'Verification request failed' });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSave = async () => {
    const cleanSearch = sanitizeApiKey(localSearchKey);
    const cleanCart = sanitizeApiKey(localCartKey);
    setLocalSearchKey(cleanSearch);
    setLocalCartKey(cleanCart);
    setIsSaving(true);
    await saveSettings({
      searchApiKey: cleanSearch,
      cartApiKey: cleanCart,
      rateLimitDelayMs: localDelay,
      maxConcurrency: localConcurrency,
    });
    setIsSaving(false);
    setSavedSuccess(true);

    // If BOM has items, automatically resolve them with the newly saved key!
    if (items.length > 0 && cleanSearch) {
      resolveAllItems(cleanSearch);
    }

    setTimeout(() => {
      setIsSettingsOpen(false);
    }, 600);
  };

  const handleClose = () => {
    // If the user modified the key and it looks valid, persist it silently
    const cleanSearch = sanitizeApiKey(localSearchKey);
    if (cleanSearch && cleanSearch !== searchApiKey) {
      saveSettings({
        searchApiKey: cleanSearch,
        cartApiKey: sanitizeApiKey(localCartKey),
        rateLimitDelayMs: localDelay,
        maxConcurrency: localConcurrency,
      });
      if (items.length > 0) {
        resolveAllItems(cleanSearch);
      }
    }
    setIsSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Mouser API & Integration Settings</h2>
              <p className="text-xs text-slate-400">Configure your Mouser API credentials and rate limits</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Search API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Mouser Search API Key
              </label>
              <a
                href="https://www.mouser.com/api-search/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Get API Key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showSearchKey ? 'text' : 'password'}
                value={localSearchKey}
                onChange={(e) => {
                  setLocalSearchKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="e.g. 12345678-abcd-1234-abcd-1234567890ab"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-20 font-mono"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowSearchKey(!showSearchKey)}
                  className="p-1 text-slate-400 hover:text-white rounded"
                >
                  {showSearchKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestKey}
                disabled={testingKey || !localSearchKey.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 transition"
              >
                {testingKey ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Test Key Validity
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-md ${
                    testResult.valid
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                  }`}
                >
                  {testResult.valid ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Cart API Key */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Mouser Cart API Key (Optional)
              </label>
              <span className="text-[11px] text-slate-400">Defaults to Search Key if omitted</span>
            </div>
            <div className="relative">
              <input
                type={showCartKey ? 'text' : 'password'}
                value={localCartKey}
                onChange={(e) => setLocalCartKey(e.target.value)}
                placeholder="Optional separate Cart API Key"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCartKey(!showCartKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded"
              >
                {showCartKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Rate Limiting & Concurrency Settings */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2 text-white font-medium text-xs uppercase tracking-wider">
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Rate Limiting & Concurrency Controls</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Max Concurrent Requests</label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={localConcurrency}
                  onChange={(e) => setLocalConcurrency(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500">Mouser recommends 2-4 parallel requests</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Delay Between Requests (ms)</label>
                <input
                  type="number"
                  min={100}
                  max={3000}
                  step={50}
                  value={localDelay}
                  onChange={(e) => setLocalDelay(Math.max(50, parseInt(e.target.value, 10) || 100))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-500">Prevents HTTP 429 during bulk BOM uploads</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white shadow-md transition"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>Saved Permanently!</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
