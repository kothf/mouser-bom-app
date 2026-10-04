'use client';

import React from 'react';
import { DollarSign, Layers, CheckCircle, AlertTriangle } from 'lucide-react';
import { useBomStore } from '@/store/bom-store';
import { formatCurrency, formatNumber } from '@/lib/utils';

export function SummaryCards() {
  const { getSummary, items } = useBomStore();
  const summary = getSummary();

  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Cost */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total BOM Cost</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white tracking-tight">
              {formatCurrency(summary.totalCost, summary.currency)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Across {formatNumber(summary.totalQuantity)} requested units
          </p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <DollarSign className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Line Items & Units */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Line Items / Units</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">{summary.totalLineItems}</span>
            <span className="text-xs text-slate-400 font-medium">lines</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Total component count: <strong className="text-slate-300">{formatNumber(summary.totalQuantity)}</strong>
          </p>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Fulfillment Rate */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Stock Fulfillment</p>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white tracking-tight">{summary.fulfillmentRate}%</span>
            <span className="text-xs text-slate-400">
              {summary.matchedCount} / {summary.totalLineItems} in stock
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                summary.fulfillmentRate >= 90
                  ? 'bg-emerald-500'
                  : summary.fulfillmentRate >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${summary.fulfillmentRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. Attention Required */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Items Needing Review</p>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                summary.unresolvedCount + summary.lowStockCount > 0 ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              {summary.unresolvedCount + summary.lowStockCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">alerts</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span>Low Stock: <strong className="text-amber-300">{summary.lowStockCount}</strong></span>
            <span>•</span>
            <span>Unmatched: <strong className="text-rose-400">{summary.unresolvedCount}</strong></span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
