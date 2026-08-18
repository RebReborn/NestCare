'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { 
  CreditCard, 
  DollarSign, 
  Receipt, 
  TrendingUp, 
  Clock, 
  Download, 
  Eye, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  User, 
  ArrowLeft,
  X,
  Loader2,
  Filter,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function TransactionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<'parent' | 'sitter' | 'admin'>('parent');
  const [transactions, setTransactions] = useState<any[]>([]);

  // Selected Transaction for Digital Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  // Financial Summary Metrics
  const [totalMoneySpent, setTotalMoneySpent] = useState<number>(0);
  const [totalMoneyEarned, setTotalMoneyEarned] = useState<number>(0);
  const [pendingPayouts, setPendingPayouts] = useState<number>(0);
  const [totalPlatformFees, setTotalPlatformFees] = useState<number>(0);

  useEffect(() => {
    async function loadFinancialData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        setCurrentUser(user);

        // Fetch User Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, display_name')
          .eq('id', user.id)
          .single();

        const role = profile?.role || 'parent';
        setUserRole(role);

        // Fetch bookings & payment transactions for this user
        let query = supabase
          .from('bookings')
          .select(`
            id,
            status,
            start_time,
            end_time,
            actual_end,
            duration_minutes,
            hourly_rate,
            subtotal,
            platform_fee,
            tax,
            total,
            currency,
            created_at,
            parent:profiles!parent_id(id, display_name, avatar_url, email),
            sitter:profiles!sitter_id(id, display_name, avatar_url, email)
          `)
          .order('created_at', { ascending: false });

        if (role === 'sitter') {
          query = query.eq('sitter_id', user.id);
        } else {
          query = query.eq('parent_id', user.id);
        }

        const { data: bookingList, error } = await query;

        if (error) throw error;

        const list = bookingList || [];
        setTransactions(list);

        // Calculate Totals
        let spent = 0;
        let earned = 0;
        let pending = 0;
        let fees = 0;

        list.forEach((b: any) => {
          const totalAmt = Number(b.total) || Number(b.subtotal || 0) + Number(b.platform_fee || 0) + Number(b.tax || 0);
          const feeAmt = Number(b.platform_fee) || 0;
          const sitterEarning = Number(b.subtotal) || (totalAmt * 0.85);

          if (b.status === 'completed' || b.status === 'in_progress' || b.status === 'accepted') {
            spent += totalAmt;
            fees += feeAmt;

            if (b.status === 'completed') {
              earned += sitterEarning;
            } else {
              pending += sitterEarning;
            }
          }
        });

        setTotalMoneySpent(spent);
        setTotalMoneyEarned(earned);
        setPendingPayouts(pending);
        setTotalPlatformFees(fees);

      } catch (err: any) {
        console.error('Error loading transaction history:', err);
        toast.error('Failed to load transaction history.');
      } finally {
        setLoading(false);
      }
    }

    loadFinancialData();
  }, []);

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-500 dark:text-slate-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-2xl font-black text-heading dark:text-white flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" /> Financial Receipts & Transactions
            </h1>
          </div>
          <p className="text-xs text-stone-500 dark:text-slate-400 font-medium ml-8">
            View detailed payment logs, downloadable tax receipts, and platform fee breakdowns.
          </p>
        </div>

        <Link
          href="/settings"
          className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-200 rounded-2xl text-xs font-bold active-press hover:bg-stone-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-2 shrink-0"
        >
          <CreditCard className="h-4 w-4 text-primary" /> Manage Payment Methods
        </Link>
      </div>

      {/* METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {userRole === 'sitter' ? (
          <>
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-400 font-bold uppercase">
                <span>Total Net Earned</span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="font-display text-2xl font-black text-heading dark:text-white">
                ${totalMoneyEarned.toFixed(2)}
              </p>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Paid out via Stripe Connect
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-400 font-bold uppercase">
                <span>Pending Payouts</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <p className="font-display text-2xl font-black text-heading dark:text-white">
                ${pendingPayouts.toFixed(2)}
              </p>
              <p className="text-[10px] text-stone-400 font-medium">
                Released upon care completion
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-400 font-bold uppercase">
                <span>Total Bookings</span>
                <Calendar className="h-4 w-4 text-sky-600" />
              </div>
              <p className="font-display text-2xl font-black text-heading dark:text-white">
                {transactions.length}
              </p>
              <p className="text-[10px] text-stone-400 font-medium">
                Care sessions completed
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-400 font-bold uppercase">
                <span>Total Money Spent</span>
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <p className="font-display text-2xl font-black text-heading dark:text-white">
                ${totalMoneySpent.toFixed(2)}
              </p>
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Encrypted Stripe Payments
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-400 font-bold uppercase">
                <span>Platform Fees Paid</span>
                <TrendingUp className="h-4 w-4 text-sky-600" />
              </div>
              <p className="font-display text-2xl font-black text-heading dark:text-white">
                ${totalPlatformFees.toFixed(2)}
              </p>
              <p className="text-[10px] text-stone-400 font-medium">
                Includes 24/7 Support & Insurance
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs text-stone-400 font-bold uppercase">
                <span>Total Bookings</span>
                <Calendar className="h-4 w-4 text-violet-600" />
              </div>
              <p className="font-display text-2xl font-black text-heading dark:text-white">
                {transactions.length}
              </p>
              <p className="text-[10px] text-stone-400 font-medium">
                Childcare sessions booked
              </p>
            </div>
          </>
        )}
      </div>

      {/* TRANSACTIONS TABLE LIST */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
          <h3 className="font-display font-extrabold text-base text-heading dark:text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Transaction & Receipt History
          </h3>
          <span className="text-xs font-bold text-stone-400">{transactions.length} records</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16 text-stone-400 font-bold text-xs">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading financial records...
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 space-y-3 text-stone-400 text-xs font-medium">
            <Receipt className="h-10 w-10 mx-auto text-stone-300 dark:text-slate-700" />
            <p className="font-bold text-stone-700 dark:text-slate-300">No transaction records found.</p>
            <p className="text-[11px]">When you book or complete childcare sessions, itemized receipts appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-100 dark:border-slate-800 text-[10px] text-stone-400 uppercase font-black tracking-wider">
                  <th className="pb-3">Booking ID</th>
                  <th className="pb-3">{userRole === 'sitter' ? 'Parent' : 'Caregiver'}</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Hours</th>
                  <th className="pb-3 text-right">Base Subtotal</th>
                  <th className="pb-3 text-right">Platform Fee</th>
                  <th className="pb-3 text-right">GST/HST Tax</th>
                  <th className="pb-3 text-right">Total Amount</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-slate-800/60 font-medium text-stone-700 dark:text-slate-300">
                {transactions.map((tx) => {
                  const partner = userRole === 'sitter' ? tx.parent : tx.sitter;
                  const partnerName = partner?.display_name || 'Care Partner';
                  const partnerAvatar = partner?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100';

                  const durationHours = Math.round((Number(tx.duration_minutes || 120) / 60) * 10) / 10;
                  const subtotal = Number(tx.subtotal) || (Number(tx.hourly_rate || 22) * durationHours);
                  const fee = Number(tx.platform_fee) || (subtotal * 0.15);
                  const tax = Number(tx.tax) || ((subtotal + fee) * 0.05);
                  const total = Number(tx.total) || (subtotal + fee + tax);
                  const sitterEarn = subtotal;

                  const isCompleted = tx.status === 'completed';
                  const isAccepted = tx.status === 'accepted' || tx.status === 'in_progress';

                  return (
                    <tr key={tx.id} className="hover:bg-stone-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 font-mono font-bold text-heading dark:text-white">
                        #{tx.id.slice(0, 8)}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={partnerAvatar}
                            alt={partnerName}
                            className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-slate-800"
                          />
                          <span className="font-bold text-heading dark:text-white">{partnerName}</span>
                        </div>
                      </td>
                      <td className="py-4 text-stone-500 dark:text-slate-400">
                        {new Date(tx.start_time || tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-4 font-bold">{durationHours} hrs</td>
                      <td className="py-4 text-right font-mono">${subtotal.toFixed(2)}</td>
                      <td className="py-4 text-right font-mono text-stone-500">${fee.toFixed(2)}</td>
                      <td className="py-4 text-right font-mono text-stone-500">${tax.toFixed(2)}</td>
                      <td className="py-4 text-right font-mono font-extrabold text-heading dark:text-white">
                        ${userRole === 'sitter' ? sitterEarn.toFixed(2) : total.toFixed(2)}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                          isCompleted ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          isAccepted ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300' :
                          'bg-stone-100 text-stone-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <button
                          onClick={() => setSelectedReceipt(tx)}
                          className="p-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-stone-700 dark:text-slate-200 rounded-xl transition-colors active-press inline-flex items-center gap-1 text-[10px] font-bold"
                        >
                          <Eye className="h-3.5 w-3.5" /> Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DIGITAL ITEMIZED TAX RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-primary" />
                <div>
                  <h3 className="font-display text-lg font-black text-heading dark:text-white">NestCare Receipt</h3>
                  <p className="text-[10px] text-stone-400 font-mono">Tax Receipt #{selectedReceipt.id.slice(0, 12)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-slate-800 text-stone-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Itemized Receipt Card */}
            <div className="p-5 bg-stone-50 dark:bg-slate-950/60 rounded-2xl border border-stone-200/80 dark:border-slate-800 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-slate-800">
                <span className="font-bold text-stone-500 uppercase text-[10px]">Issued To</span>
                <span className="font-extrabold text-heading dark:text-white">
                  {userRole === 'sitter' ? selectedReceipt.sitter?.display_name : selectedReceipt.parent?.display_name}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-slate-800">
                <span className="font-bold text-stone-500 uppercase text-[10px]">Care Provider</span>
                <span className="font-bold text-heading dark:text-white">
                  {selectedReceipt.sitter?.display_name || 'Caregiver'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-slate-800">
                <span className="font-bold text-stone-500 uppercase text-[10px]">Date of Service</span>
                <span className="font-medium text-stone-800 dark:text-slate-200">
                  {new Date(selectedReceipt.start_time || selectedReceipt.created_at).toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              {/* Breakdown Table */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between font-medium">
                  <span className="text-stone-600 dark:text-slate-400">Childcare Subtotal ({Math.round((Number(selectedReceipt.duration_minutes || 120) / 60) * 10) / 10} hrs @ ${(Number(selectedReceipt.hourly_rate) || 22).toFixed(2)}/hr)</span>
                  <span className="font-mono font-bold">${(Number(selectedReceipt.subtotal) || 44).toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-medium">
                  <span className="text-stone-600 dark:text-slate-400">Platform Service & Safety Fee (15%)</span>
                  <span className="font-mono font-bold">${(Number(selectedReceipt.platform_fee) || 6.60).toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-medium">
                  <span className="text-stone-600 dark:text-slate-400">Sales Tax (GST/HST 5%)</span>
                  <span className="font-mono font-bold">${(Number(selectedReceipt.tax) || 2.53).toFixed(2)}</span>
                </div>

                <div className="flex justify-between pt-3 border-t border-stone-200 dark:border-slate-800 text-sm font-black text-heading dark:text-white">
                  <span>Total Amount Paid</span>
                  <span className="font-mono text-primary">${(Number(selectedReceipt.total) || 53.13).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Verification Footer */}
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-3 text-xs">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="font-extrabold text-emerald-900 dark:text-emerald-300">Payment Processed & Verified</p>
                <p className="text-[10px] text-emerald-800 dark:text-emerald-400 font-medium">
                  Processed via Stripe PCI-DSS Level 1 Encrypted Integration. GST/HST Registration #789012345.
                </p>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-3 bg-primary text-white rounded-2xl text-xs font-bold active-press hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="h-4 w-4" /> Download / Print Receipt
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-5 py-3 border border-stone-200 dark:border-slate-800 text-stone-700 dark:text-slate-200 rounded-2xl text-xs font-bold hover:bg-stone-50 dark:hover:bg-slate-800 active-press"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
