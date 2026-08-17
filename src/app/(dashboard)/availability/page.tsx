'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Calendar, Clock, Plus, Trash2, Save, Loader2, CalendarRange, AlertCircle } from 'lucide-react';
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
  // Map of day_of_week -> { is_active: boolean, start_time: string, end_time: string }
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
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role !== 'sitter') {
          // Parents don't need availability settings
          router.push('/dashboard');
          return;
        }

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
              is_active: true, // If it exists, this day is active
              start_time: start,
              end_time: end,
            };
          });
          setWeeklyRules(rulesMap);
        }

        // Fetch exceptions (only future exceptions, filtered on start_date)
        const { data: ex } = await supabase
          .from('availability_exceptions')
          .select('*')
          .eq('sitter_id', user.id)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true });

        const mappedEx = (ex || []).map((e: any) => {
          const dateOnly = e.start_date.split('T')[0];
          const startT = e.start_date.substring(11, 16);
          const endT = e.end_date.substring(11, 16);
          return {
            id: e.id,
            sitter_id: e.sitter_id,
            exception_type: e.exception_type,
            exception_date: dateOnly,
            start_time: startT,
            end_time: endT,
            reason: e.notes || '',
          };
        });

        setExceptions(mappedEx);
      } catch (err) {
        console.error('Failed to load availability:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();
  }, []);

  const handleRuleToggle = (day: number) => {
    setWeeklyRules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        is_active: !prev[day].is_active,
      },
    }));
  };

  const handleTimeChange = (day: number, field: 'start_time' | 'end_time', value: string) => {
    setWeeklyRules((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSaveWeeklyRules = async () => {
    if (!sitterId) return;

    try {
      setSavingRules(true);

      // 1. Delete all existing recurring rules for this sitter
      const { error: deleteErr } = await supabase
        .from('availability_rules')
        .delete()
        .eq('sitter_id', sitterId);

      if (deleteErr) throw deleteErr;

      // 2. Filter active rules
      const activeDays = DAYS_OF_WEEK.filter(day => weeklyRules[day.value].is_active);

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

        // 3. Insert active rules
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

      // Map back to layout format
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
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl font-black text-heading">Availability Settings</h1>
        <p className="text-xs text-stone-400 mt-1">Configure your weekly recurring shifts and block vacation dates.</p>
      </div>

      {/* Weekly Recurring Availability card */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="font-display text-base font-bold text-heading flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Weekly Recurring Shifts
          </h2>
          <p className="text-[11px] text-stone-400 mt-1">Define which days of the week parents are allowed to book your care services.</p>
        </div>

        <div className="space-y-3.5">
          {DAYS_OF_WEEK.map((day) => {
            const rule = weeklyRules[day.value];
            return (
              <div 
                key={day.value}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  rule.is_active ? 'bg-emerald-50/40 border-emerald-100' : 'bg-stone-50/50 border-stone-200/60'
                }`}
              >
                {/* Day toggle checkbox */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rule.is_active}
                    onChange={() => handleRuleToggle(day.value)}
                    className="h-4.5 w-4.5 rounded border-stone-300 text-primary focus:ring-primary accent-primary"
                  />
                  <span className={`text-xs font-bold ${rule.is_active ? 'text-emerald-800' : 'text-stone-500'}`}>
                    {day.label}
                  </span>
                </label>

                {/* Time picker settings */}
                {rule.is_active && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-stone-400 font-medium">Available from</span>
                    <input
                      type="time"
                      value={rule.start_time}
                      onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                      className="p-1.5 rounded-lg border border-stone-200 outline-none text-xs bg-white font-medium"
                    />
                    <span className="text-stone-400 font-medium">to</span>
                    <input
                      type="time"
                      value={rule.end_time}
                      onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                      className="p-1.5 rounded-lg border border-stone-200 outline-none text-xs bg-white font-medium"
                    />
                  </div>
                )}
                {!rule.is_active && (
                  <span className="text-[10px] text-stone-400 italic">Unavailable / Closed</span>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSaveWeeklyRules}
          disabled={savingRules}
          className="w-full py-3.5 bg-primary text-white text-xs font-bold rounded-2xl active-press hover:bg-emerald-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5"
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

      {/* Exceptions/Vacations card */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="font-display text-base font-bold text-heading flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" /> Vacation & Override Dates
          </h2>
          <p className="text-[11px] text-stone-400 mt-1">Block off holidays or set custom times for specific days (e.g. weekend overrides).</p>
        </div>

        {/* Existing Exceptions List */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Upcoming overrides</h3>
          {exceptions.length === 0 ? (
            <p className="text-xs text-stone-400 italic bg-stone-50 p-4 rounded-xl border border-stone-100">
              No vacation or override dates configured. You are fully open based on recurring shifts.
            </p>
          ) : (
            <div className="space-y-2">
              {exceptions.map((ex) => (
                <div key={ex.id} className="p-3 bg-stone-50 rounded-xl border border-stone-150 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="font-bold text-xs text-heading block">
                      📅 {new Date(ex.exception_date).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[8px] ${
                        ex.exception_type === 'unavailable' 
                          ? 'bg-red-50 text-red-600' 
                          : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {ex.exception_type === 'unavailable' ? 'Unavailable' : 'Available Override'}
                      </span>
                      {ex.exception_type === 'available_override' && (
                        <span className="text-stone-400">({ex.start_time.substring(0, 5)} - {ex.end_time.substring(0, 5)})</span>
                      )}
                      {ex.reason && <span className="text-stone-400 italic">• {ex.reason}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteException(ex.id)}
                    className="p-2 text-stone-400 hover:text-red-500 rounded-lg"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Exception Form */}
        <form onSubmit={handleAddException} className="border-t border-stone-100 pt-4 space-y-4">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Register vacation or override</h3>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Select Date</label>
              <input
                type="date"
                required
                value={exceptionDate}
                onChange={(e) => setExceptionDate(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none text-xs bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Type</label>
              <select
                value={exceptionType}
                onChange={(e) => setExceptionType(e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none text-xs bg-stone-50 font-bold"
              >
                <option value="unavailable">🚫 Unavailable (Block Date)</option>
                <option value="available_override">⏰ Custom Hours Override</option>
              </select>
            </div>
          </div>

          {exceptionType === 'available_override' && (
            <div className="flex items-center gap-2 text-xs bg-emerald-50/20 p-3 rounded-2xl border border-emerald-50">
              <span className="text-emerald-800 font-bold">Custom Hours:</span>
              <input
                type="time"
                value={exceptionStart}
                onChange={(e) => setExceptionStart(e.target.value)}
                className="p-1.5 rounded-lg border border-stone-200 outline-none text-xs bg-white font-medium"
              />
              <span className="text-stone-400 font-medium">to</span>
              <input
                type="time"
                value={exceptionEnd}
                onChange={(e) => setExceptionEnd(e.target.value)}
                className="p-1.5 rounded-lg border border-stone-200 outline-none text-xs bg-white font-medium"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Reason / Description</label>
            <input
              type="text"
              placeholder="e.g. Thanksgiving Holiday, Weekend markup"
              value={exceptionReason}
              onChange={(e) => setExceptionReason(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-stone-200 outline-none text-xs bg-stone-50"
            />
          </div>

          <button
            type="submit"
            disabled={submittingException || !exceptionDate}
            className="w-full py-3.5 border border-dashed border-primary text-primary hover:bg-emerald-50 text-xs font-bold rounded-2xl active-press transition-colors flex items-center justify-center gap-1.5"
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
