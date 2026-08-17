'use client';

import { X, CheckCircle2, ShieldCheck, Printer, FileText } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    start_time: string;
    end_time: string;
    total: number | string;
    sitter?: { display_name?: string };
    parent?: { display_name?: string };
  };
}

export function ReceiptModal({ isOpen, onClose, booking }: ReceiptModalProps) {
  if (!isOpen) return null;

  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  const durationHrs = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60)));
  
  const totalVal = Number(booking.total) || 101.64;
  const subtotalVal = (totalVal / 1.155).toFixed(2);
  const feeVal = (Number(subtotalVal) * 0.10).toFixed(2);
  const taxVal = ((Number(subtotalVal) + Number(feeVal)) * 0.05).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-black text-heading dark:text-white">Payment Receipt</h2>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex justify-between items-center bg-stone-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-stone-150 dark:border-slate-700">
            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Booking Reference</span>
              <span className="font-mono font-bold text-heading dark:text-white">#BK-{booking.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg text-[10px] font-black flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid (CAD)
            </span>
          </div>

          <div className="space-y-2 border-b border-stone-100 dark:border-slate-800 pb-3">
            <div className="flex justify-between text-stone-600 dark:text-slate-300">
              <span>Caregiver:</span>
              <strong className="text-heading dark:text-white">{booking.sitter?.display_name || 'Caregiver'}</strong>
            </div>
            <div className="flex justify-between text-stone-600 dark:text-slate-300">
              <span>Date & Time:</span>
              <strong className="text-heading dark:text-white">{start.toLocaleDateString()} ({durationHrs} hrs)</strong>
            </div>
            <div className="flex justify-between text-stone-600 dark:text-slate-300">
              <span>Payment Method:</span>
              <strong className="text-heading dark:text-white">Visa •••• 4242</strong>
            </div>
          </div>

          {/* Itemized Pricing */}
          <div className="space-y-2 bg-stone-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-stone-100 dark:border-slate-800">
            <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Itemized Charges</h4>
            <div className="flex justify-between text-stone-600 dark:text-slate-300">
              <span>Childcare Services ({durationHrs} hrs):</span>
              <span className="font-bold">${subtotalVal} CAD</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>NestCare Service Fee:</span>
              <span className="font-bold">+${feeVal} CAD</span>
            </div>
            <div className="flex justify-between text-stone-600 dark:text-slate-300">
              <span>Applicable Tax (GST):</span>
              <span className="font-bold">+${taxVal} CAD</span>
            </div>
            <div className="border-t border-stone-200 dark:border-slate-700 pt-2 flex justify-between font-black text-sm text-heading dark:text-white">
              <span>Total Paid:</span>
              <span className="text-primary dark:text-emerald-400">${totalVal.toFixed(2)} CAD</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-2xl active-press transition-colors flex items-center justify-center gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-2xl hover:bg-emerald-800 active-press transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
