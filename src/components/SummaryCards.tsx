'use client';

import React from 'react';
import { DollarSign, Layers, CheckCircle, AlertTriangle } from 'lucide-react';
import { useBomStore } from '@/store/bom-store';
import { formatCurrency, formatNumber } from '@/lib/utils';

function MetricCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <span className="text-slate-500 shrink-0">{icon}</span>
      </div>
      {children}
    </div>
  );
}

export function SummaryCards() {
  const { getSummary, items } = useBomStore();
  const summary = getSummary();

  if (items.length === 0) return null;

  const alerts = summary.unresolvedCount + summary.lowStockCount;
  const fulfillmentColor =
    summary.fulfillmentRate >= 90 ? 'bg-emerald-500' : summary.fulfillmentRate >= 60 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
      {/* 1. Total Cost */}
      <MetricCard label="Total BOM cost" icon={<DollarSign className="w-4 h-4" />}>
        <p className="tabular text-xl sm:text-2xl font-semibold text-white tracking-tight truncate">
          {formatCurrency(summary.totalCost, summary.currency)}
        </p>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          For <span className="tabular">{formatNumber(summary.totalQuantity)}</span> units
        </p>
      </MetricCard>

      {/* 2. Line Items & Units */}
      <MetricCard label="Line items" icon={<Layers className="w-4 h-4" />}>
        <p className="tabular text-xl sm:text-2xl font-semibold text-white tracking-tight">
          {summary.totalLineItems}
        </p>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          <span className="tabular text-slate-300">{formatNumber(summary.totalQuantity)}</span> components in total
        </p>
      </MetricCard>

      {/* 3. Fulfillment Rate */}
      <MetricCard label="In stock" icon={<CheckCircle className="w-4 h-4" />}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="tabular text-xl sm:text-2xl font-semibold text-white tracking-tight">
            {summary.fulfillmentRate}%
          </p>
          <span className="tabular text-[11px] text-slate-500">
            {summary.matchedCount} / {summary.totalLineItems}
          </span>
        </div>
        <div
          className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-2"
          role="progressbar"
          aria-valuenow={summary.fulfillmentRate}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Lines fully in stock"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${fulfillmentColor}`}
            style={{ width: `${summary.fulfillmentRate}%` }}
          />
        </div>
      </MetricCard>

      {/* 4. Attention Required */}
      <MetricCard
        label="Needs review"
        icon={<AlertTriangle className={`w-4 h-4 ${alerts > 0 ? 'text-amber-400' : ''}`} />}
      >
        <p
          className={`tabular text-xl sm:text-2xl font-semibold tracking-tight ${
            alerts > 0 ? 'text-amber-300' : 'text-white'
          }`}
        >
          {alerts}
        </p>
        <p className="text-[11px] text-slate-500 mt-1 truncate">
          <span className="tabular text-amber-300/90">{summary.lowStockCount}</span> low stock ·{' '}
          <span className="tabular text-rose-300/90">{summary.unresolvedCount}</span> unmatched
        </p>
      </MetricCard>
    </div>
  );
}
