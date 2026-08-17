'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  X, CreditCard, Plus, Trash2, CheckCircle2, ShieldCheck, 
  Loader2, Lock, Star, Sparkles 
} from 'lucide-react';

interface PaymentMethodItem {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

interface PaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export function PaymentMethodsModal({ isOpen, onClose, onUpdate }: PaymentMethodsModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<PaymentMethodItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Card Form State
  const [newBrand, setNewBrand] = useState('Visa');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('2028');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    async function loadCards() {
      try {
        setLoading(true);
        const res = await fetch('/api/payments/methods');
        const data = await res.json();
        if (res.ok && data.methods) {
          setCards(data.methods);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadCards();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const last4Digits = cardNumber.slice(-4) || '4242';

      const res = await fetch('/api/payments/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: newBrand,
          last4: last4Digits,
          exp_month: Number(expMonth),
          exp_year: Number(expYear),
          is_default: cards.length === 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add credit card.');

      toast.success(`🎉 ${newBrand} card ending in ${last4Digits} saved successfully!`);
      setCards(prev => [data.card, ...prev.map(c => data.card.is_default ? { ...c, is_default: false } : c)]);
      setShowAddForm(false);
      setCardNumber('');
      setCvc('');
      if (onUpdate) onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save card.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      setCards(prev => prev.filter(c => c.id !== id));
      await fetch(`/api/payments/methods?id=${id}`, { method: 'DELETE' });
      toast.success('Card removed from saved payment methods.');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to remove card.');
    }
  };

  const handleSetDefault = async (card: PaymentMethodItem) => {
    try {
      setCards(prev => prev.map(c => ({ ...c, is_default: c.id === card.id })));
      await fetch('/api/payments/methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: card.brand,
          last4: card.last4,
          exp_month: card.exp_month,
          exp_year: card.exp_year,
          is_default: true,
        }),
      });
      toast.success(`${card.brand} ending in ${card.last4} set as default payment method!`);
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error('Failed to set default card.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-black text-heading dark:text-white">Saved Credit Cards</h2>
          </div>
          <button onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* List of Saved Cards */}
            <div className="space-y-3">
              {cards.map((card) => (
                <div 
                  key={card.id} 
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    card.is_default 
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/40 border-primary/30 shadow-xs' 
                      : 'bg-stone-50 dark:bg-slate-800/60 border-stone-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1.5 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-700 font-black text-xs shrink-0">
                      💳 {card.brand.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs font-bold text-heading dark:text-white">
                          {card.brand} ending in {card.last4}
                        </strong>
                        {card.is_default && (
                          <span className="px-2 py-0.5 bg-primary text-white rounded-md text-[9px] font-black uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400 font-semibold block">
                        Expires {card.exp_month}/{card.exp_year}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!card.is_default && (
                      <button
                        onClick={() => handleSetDefault(card)}
                        className="text-[10px] font-bold text-primary hover:underline px-2 py-1"
                      >
                        Make Default
                      </button>
                    )}
                    {cards.length > 1 && (
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg active-press transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Card CTA Button */}
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="w-full py-3.5 border border-dashed border-stone-300 dark:border-slate-700 hover:border-primary text-stone-600 dark:text-slate-300 hover:text-primary rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add New Credit Card
              </button>
            ) : (
              /* Inline Add Credit Card Form */
              <form onSubmit={handleAddCard} className="p-4 bg-stone-50 dark:bg-slate-800 rounded-2xl border border-stone-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-stone-200 dark:border-slate-700 pb-2">
                  <h4 className="text-xs font-bold text-heading dark:text-white flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-emerald-600" /> Enter Card Information
                  </h4>
                  <button type="button" onClick={() => setShowAddForm(false)} className="text-stone-400 hover:text-stone-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Card Brand</label>
                  <select
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-primary font-semibold"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">American Express</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Card Number</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Exp Month</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      required
                      placeholder="12"
                      value={expMonth}
                      onChange={(e) => setExpMonth(e.target.value)}
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Exp Year</label>
                    <input
                      type="number"
                      min={2026}
                      max={2035}
                      required
                      placeholder="2028"
                      value={expYear}
                      onChange={(e) => setExpYear(e.target.value)}
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">CVC</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      className="w-full p-3 rounded-xl border border-stone-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 dark:text-white outline-none focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 bg-primary text-white text-xs font-bold rounded-xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Credit Card'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-3 bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-200 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="p-3 bg-stone-50 dark:bg-slate-800/40 rounded-xl border border-stone-100 dark:border-slate-800 text-[10px] text-stone-400 flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-stone-400 shrink-0" />
              <span>Cards are stored securely with 256-bit Stripe encryption for instant 1-click booking checkout.</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
