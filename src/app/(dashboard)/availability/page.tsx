'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, Clock, Plus, Trash2, Save, Loader2, CalendarRange, AlertCircle, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function AvailabilityPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [sitterId, setSitterId] = useState<string | null>(null);

  // Weekly Recurring Rules state
  const [weeklyRules, setWeeklyRules] = useState<{
    [key: number]: { id?: string; is_active: boolean; start_time: string; end_time: string };
  }>({
    0: { is_active: false, start_time: '09:00', end_time: '17:00' },
    1: { is_active: false, start_time: '09:00', end_time: '17:00' },
    2: { is_active: false, start_time: '09:00', end_time: '17:00' },
    3: { is_active: false, start_time: '09:00', end_time: '17:00' },
    4: { is_active: false, start_time: '09:00', end_time: '17:00' },
    5: { is_active: false, start_time: '09:00', end_time: '17:00' },
    6: { is_active: false, start_time: '09:00', end_time: '17:00' },
  });

  // Exceptions (vacation, overrides) state
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [exceptionDate, setExceptionDate] = useState('');
  const [exceptionType, setExceptionType] = useState('unavailable');
  const [exceptionStart, setExceptionStart] = useState('09:00');
  const [exceptionEnd, setExceptionEnd] = useState('17:00');
  const [exceptionReason, setExceptionReason] = useState('');
  const [submittingException, setSubmittingException] = useState(false);

  // Booking notice state
  const [minimumNoticeHours, setMinimumNoticeHours] = useState(0);
  const [savingNotice, setSavingNotice] = useState(false);

  useEffect(() => {
    async function loadAvailability() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Check if user is a sitter
        const { data: profile } = await supabase
          .from('profiles')
          .select(`
            role,
            sitter_profiles(minimum_notice_hours)
          `)
          .eq('id', user.id)
          .single();

        if (profile?.role !== 'sitter') {
          router.push('/dashboard');
          return;
        }

        const sp = Array.isArray(profile?.sitter_profiles) ? profile.sitter_profiles[0] : profile?.sitter_profiles;
        setMinimumNoticeHours(sp?.minimum_notice_hours || 0);

        setSitterId(user.id);

        // Fetch recurring rules
        const { data: rules } = await supabase
          .from('availability_rules')
          .select('*')
          .eq('sitter_id', user.id);

        if (rules && rules.length > 0) {
          const rulesMap = { ...weeklyRules };
          rules.forEach((rule) => {
            const start = rule.start_time.substring(0, 5);
            const end = rule.end_time.substring(0, 5);
            rulesMap[rule.day_of_week] = {
              id: rule.id,
              is_active: true,
              start_time: start,
              end_time: end,
            };
          });
          setWeeklyRules(rulesMap);
        }

        // Fetch exceptions
        const { data: exData } = await supabase
          .from('availability_exceptions')
          .select('*')
          .eq('sitter_id', user.id)
          .order('start_date', { ascending: true });

        if (exData) {
          const mappedEx = exData.map((data) => {
            const dateOnly = data.start_date.split('T')[0];
            const startT = data.start_date.substring(11, 16);
            const endT = data.end_date.substring(11, 16);
            return {
              id: data.id,
              sitter_id: data.sitter_id,
              exception_type: data.exception_type,
              exception_date: dateOnly,
              start_time: startT,
              end_time: endT,
              reason: data.notes || '',
            };
          });
          setExceptions(mappedEx);
        }
      } catch (err) {
        console.error('Error loading availability settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();
  }, [router]);

  const handleRuleToggle = (dayValue: number) => {
    setWeeklyRules((prev) => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        is_active: !prev[dayValue].is_active,
      },
    }));
  };

  const handleTimeChange = (dayValue: number, field: 'start_time' | 'end_time', value: string) => {
    setWeeklyRules((prev) => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        [field]: value,
      },
    }));
  };

  const handleSaveWeeklyRules = async () => {
    if (!sitterId) return;

    try {
      setSavingRules(true);

      // Delete old rules for this sitter
      await supabase
        .from('availability_rules')
        .delete()
        .eq('sitter_id', sitterId);

      const activeDays = DAYS_OF_WEEK.filter((day) => weeklyRules[day.value].is_active);

      if (activeDays.length > 0) {
        const insertData = activeDays.map((day) => {
          const rule = weeklyRules[day.value];
          return {
            sitter_id: sitterId,
            day_of_week: day.value,
            start_time: `${rule.start_time}:00`,
            end_time: `${rule.end_time}:00`,
          };
        });

        const { error: insertErr } = await supabase
          .from('availability_rules')
          .insert(insertData);

        if (insertErr) throw insertErr;
      }

      toast.success('Weekly recurring availability saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save weekly recurring rules.');
    } finally {
      setSavingRules(false);
    }
  };

  const handleSaveNotice = async () => {
    if (!sitterId) return;

    try {
      setSavingNotice(true);
      const { error } = await supabase
        .from('sitter_profiles')
        .update({ minimum_notice_hours: minimumNoticeHours })
        .eq('id', sitterId);

      if (error) throw error;
      toast.success('Booking notice requirements updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notice requirements.');
    } finally {
      setSavingNotice(false);
    }
  };

  const handleAddException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sitterId || !exceptionDate) return;

    try {
      setSubmittingException(true);

      const startDateStr = exceptionType === 'available_override' 
        ? `${exceptionDate}T${exceptionStart}:00.000Z` 
        : `${exceptionDate}T00:00:00.000Z`;

      const endDateStr = exceptionType === 'available_override' 
        ? `${exceptionDate}T${exceptionEnd}:00.000Z` 
        : `${exceptionDate}T23:59:59.000Z`;

      const insertException = {
        sitter_id: sitterId,
        exception_type: exceptionType,
        start_date: startDateStr,
        end_date: endDateStr,
        notes: exceptionReason || null,
      };

      const { data, error } = await supabase
        .from('availability_exceptions')
        .insert(insertException)
        .select()
        .single();

      if (error) throw error;

      const dateOnly = data.start_date.split('T')[0];
      const startT = data.start_date.substring(11, 16);
      const endT = data.end_date.substring(11, 16);
      const mappedNewEx = {
        id: data.id,
        sitter_id: data.sitter_id,
        exception_type: data.exception_type,
        exception_date: dateOnly,
        start_time: startT,
        end_time: endT,
        reason: data.notes || '',
      };

      setExceptions((prev) => [...prev, mappedNewEx].sort((a, b) => a.exception_date.localeCompare(b.exception_date)));
      setExceptionDate('');
      setExceptionReason('');
      toast.success('Vacation / override date added!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add vacation/override date.');
    } finally {
      setSubmittingException(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      const { error } = await supabase
        .from('availability_exceptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExceptions((prev) => prev.filter((ex) => ex.id !== id));
      toast.success('Override date removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove override date.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-stone-400 dark:text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span className="text-xs font-bold">Loading shift schedule…</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-heading dark:text-white">Shift & Availability Settings</h1>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-slate-400 mt-1 font-medium">Configure your weekly recurring shifts, minimum booking notice, and block off vacation dates.</p>
      </div>

      {/* Weekly Recurring Availability Card */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-slate-950/50 space-y-6">
        <div>
          <h2 className="font-display text-base sm:text-lg font-extrabold text-heading dark:text-slate-100 flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-primary" /> Weekly Recurring Shifts
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 font-medium">Define which days of the week parents are allowed to book your care services.</p>
        </div>

        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day) => {
            const rule = weeklyRules[day.value];
            return (
              <div 
                key={day.value}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 ${
                  rule.is_active 
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50' 
                    : 'bg-stone-50/70 dark:bg-slate-800/40 border-stone-200/70 dark:border-slate-800'
                }`}
              >
                {/* Day toggle checkbox */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rule.is_active}
                    onChange={() => handleRuleToggle(day.value)}
                    className="h-4.5 w-4.5 rounded border-stone-300 dark:border-slate-700 text-primary focus:ring-primary accent-primary"
                  />
                  <span className={`text-xs sm:text-sm font-bold ${
                    rule.is_active ? 'text-emerald-800 dark:text-emerald-300 font-extrabold' : 'text-stone-500 dark:text-slate-400'
                  }`}>
                    {day.label}
                  </span>
                </label>

                {/* Time picker settings */}
                {rule.is_active && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-stone-500 dark:text-slate-400 font-semibold">Available from</span>
                    <input
                      type="time"
                      value={rule.start_time}
                      onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 outline-none text-xs bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-100 font-medium focus:border-primary transition-colors"
                    />
                    <span className="text-stone-500 dark:text-slate-400 font-semibold">to</span>
                    <input
                      type="time"
                      value={rule.end_time}
                      onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 outline-none text-xs bg-white dark:bg-slate-800 text-stone-800 dark:text-slate-100 font-medium focus:border-primary transition-colors"
                    />
                  </div>
                )}
                {!rule.is_active && (
                  <span className="text-xs text-stone-400 dark:text-slate-500 italic font-medium">Unavailable / Closed</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSaveWeeklyRules}
          disabled={savingRules}
          className="w-full py-3.5 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-2 shadow-sm"
        >
          {savingRules ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4.5 w-4.5" /> Save Recurring Shifts
            </>
          )}
        </button>
      </div>

      {/* Booking Notice Policy Card */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-slate-950/50 space-y-5">
        <div>
          <h2 className="font-display text-base sm:text-lg font-extrabold text-heading dark:text-slate-100 flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-primary" /> Booking Notice Policy
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 font-medium">Specify how much advance warning you require before a parent can book your care services.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider mb-1.5">Minimum notice required</label>
            <select
              value={minimumNoticeHours}
              onChange={(e) => setMinimumNoticeHours(Number(e.target.value))}
              className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 outline-none text-xs bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-slate-100 font-bold focus:border-primary transition-colors"
            >
              <option value={0} className="dark:bg-slate-900">Same day (no notice required)</option>
              <option value={2} className="dark:bg-slate-900">2 hours notice</option>
              <option value={6} className="dark:bg-slate-900">6 hours notice</option>
              <option value={12} className="dark:bg-slate-900">12 hours notice</option>
              <option value={24} className="dark:bg-slate-900">24 hours (1 day) notice</option>
              <option value={48} className="dark:bg-slate-900">48 hours (2 days) notice</option>
            </select>
          </div>

          <button
            onClick={handleSaveNotice}
            disabled={savingNotice}
            className="w-full py-3.5 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-2 shadow-sm"
          >
            {savingNotice ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4.5 w-4.5" /> Save Notice Policy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Exceptions/Vacations Card */}
      <div className="bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-slate-950/50 space-y-6">
        <div>
          <h2 className="font-display text-base sm:text-lg font-extrabold text-heading dark:text-slate-100 flex items-center gap-2.5">
            <CalendarRange className="h-5 w-5 text-primary" /> Vacation & Override Dates
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 font-medium">Block off holidays or set custom times for specific days (e.g. weekend overrides).</p>
        </div>

        {/* Existing Exceptions List */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">Upcoming overrides</h3>
          {exceptions.length === 0 ? (
            <p className="text-xs text-stone-400 dark:text-slate-400 italic bg-stone-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-stone-200/60 dark:border-slate-800">
              No vacation or override dates configured. You are fully open based on recurring shifts.
            </p>
          ) : (
            <div className="space-y-2">
              {exceptions.map((ex) => (
                <div key={ex.id} className="p-3.5 bg-stone-50 dark:bg-slate-800/80 rounded-2xl border border-stone-200/70 dark:border-slate-700 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-heading dark:text-slate-100 block">
                      📅 {new Date(ex.exception_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider text-[9px] border ${
                        ex.exception_type === 'unavailable' 
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60' 
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
                      }`}>
                        {ex.exception_type === 'unavailable' ? 'Unavailable' : 'Available Override'}
                      </span>
                      {ex.exception_type === 'available_override' && (
                        <span className="text-stone-500 dark:text-slate-400 font-semibold">({ex.start_time.substring(0, 5)} - {ex.end_time.substring(0, 5)})</span>
                      )}
                      {ex.reason && <span className="text-stone-400 dark:text-slate-400 italic">• {ex.reason}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteException(ex.id)}
                    className="p-2 text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-colors"
                    title="Remove override date"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Exception Form */}
        <form onSubmit={handleAddException} className="border-t border-stone-100 dark:border-slate-800 pt-5 space-y-4">
          <h3 className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider">Register vacation or override</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider mb-1">Select Date</label>
              <input
                type="date"
                required
                value={exceptionDate}
                onChange={(e) => setExceptionDate(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 outline-none text-xs bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-slate-100 font-medium focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider mb-1">Type</label>
              <select
                value={exceptionType}
                onChange={(e) => setExceptionType(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 outline-none text-xs bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-slate-100 font-bold focus:border-primary transition-colors"
              >
                <option value="unavailable" className="dark:bg-slate-900">🚫 Unavailable (Block Date)</option>
                <option value="available_override" className="dark:bg-slate-900">⏰ Custom Hours Override</option>
              </select>
            </div>
          </div>

          {exceptionType === 'available_override' && (
            <div className="flex flex-wrap items-center gap-2 text-xs bg-emerald-50/50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60">
              <span className="text-emerald-800 dark:text-emerald-300 font-bold">Custom Hours:</span>
              <input
                type="time"
                value={exceptionStart}
                onChange={(e) => setExceptionStart(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 outline-none text-xs bg-white dark:bg-slate-800 text-stone-900 dark:text-slate-100 font-medium focus:border-primary transition-colors"
              />
              <span className="text-stone-500 dark:text-slate-400 font-medium">to</span>
              <input
                type="time"
                value={exceptionEnd}
                onChange={(e) => setExceptionEnd(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-slate-700 outline-none text-xs bg-white dark:bg-slate-800 text-stone-900 dark:text-slate-100 font-medium focus:border-primary transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-stone-400 dark:text-slate-400 uppercase tracking-wider mb-1">Reason / Description</label>
            <input
              type="text"
              placeholder="e.g. Thanksgiving Holiday, Weekend markup"
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-slate-700 outline-none text-xs bg-stone-50 dark:bg-slate-800 text-stone-900 dark:text-slate-100 font-medium placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:border-primary transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submittingException || !exceptionDate}
            className="w-full py-3.5 border border-dashed border-primary text-primary hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold rounded-2xl active-press transition-colors flex items-center justify-center gap-2"
          >
            {submittingException ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4.5 w-4.5" /> Add Vacation / Override
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
