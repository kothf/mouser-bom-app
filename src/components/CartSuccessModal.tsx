'use client';

import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  DollarSign,
  Package,
} from 'lucide-react';
import { useBomStore } from '@/store/bom-store';
import { formatCurrency } from '@/lib/utils';

export function CartSuccessModal() {
  const { activeCart, isCartModalOpen, setIsCartModalOpen } = useBomStore();
  const [copied, setCopied] = useState(false);

  if (!isCartModalOpen || !activeCart) return null;

  const handleCopyKey = () => {
    if (activeCart.CartKey) {
      navigator.clipboard.writeText(activeCart.CartKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const checkoutUrl =
    activeCart.CheckoutUrl || `https://www.mouser.com/Cart/?CartKey=${activeCart.CartKey}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-emerald-950/60 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Mouser Cart Generated Successfully!</h2>
              <p className="text-xs text-slate-400">Your BOM items have been packaged into an active Mouser shopping session</p>
            </div>
          </div>
          <button
            onClick={() => setIsCartModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Cart Key Block */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mouser Cart Key (Session GUID)
              </span>
              <button
                onClick={handleCopyKey}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Key'}</span>
              </button>
            </div>
            <p className="font-mono text-xs text-emerald-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 break-all select-all">
              {activeCart.CartKey}
            </p>
            <p className="text-[11px] text-slate-500">
              You can import this Cart Key into any Mouser account or direct procurement software.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Items Pushed</p>
                <p className="text-base font-bold text-white">
                  {activeCart.CartItems?.length || 0} line items
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Estimated Total</p>
                <p className="text-base font-bold text-emerald-300">
                  {formatCurrency(activeCart.Total || 0, activeCart.CurrencyCode || 'USD')}
                </p>
              </div>
            </div>
          </div>

          {/* Itemized preview */}
          {activeCart.CartItems && activeCart.CartItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-slate-300">Cart Contents</span>
                <span>{activeCart.CartItems.length} parts</span>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800/80">
                {activeCart.CartItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 text-xs flex items-center justify-between bg-slate-950/40 hover:bg-slate-900/60">
                    <div>
                      <span className="font-mono font-medium text-slate-200">{item.MouserPartNumber}</span>
                      {item.CustomerPartNumber && (
                        <span className="ml-2 text-[10px] text-slate-500">Ref: {item.CustomerPartNumber}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <span>Qty: <strong className="text-white">{item.Quantity}</strong></span>
                      {item.ExtendedPrice && (
                        <span className="font-mono text-emerald-400 font-medium">
                          {formatCurrency(item.ExtendedPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with primary checkout button */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={() => setIsCartModalOpen(false)}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            Done
          </button>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open Cart on Mouser.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
