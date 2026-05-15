/**
 * NationalCalendar — month-grid calendar that highlights today and marks
 * Zimbabwean public holidays + school term boundaries. Pulled from
 * rc_holidays. Side panel lists upcoming entries.
 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Flag, Sparkles, BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const KIND_LABEL = {
  public:     { label: 'Public holiday',  tone: 'bg-rose-500',     text: 'text-rose-700',    icon: Flag },
  religious:  { label: 'Religious',        tone: 'bg-rose-400',     text: 'text-rose-700',    icon: Sparkles },
  school:     { label: 'School event',     tone: 'bg-amber-500',    text: 'text-amber-700',   icon: BookOpen },
  term_start: { label: 'Term begins',      tone: 'bg-emerald-500',  text: 'text-emerald-700', icon: BookOpen },
  term_end:   { label: 'Term ends',        tone: 'bg-slate-500',    text: 'text-slate-700',   icon: BookOpen },
  exam:       { label: 'Exams',            tone: 'bg-blue-500',     text: 'text-blue-700',    icon: BookOpen },
};

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function ymd(d)          { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function sameDay(a, b)   { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function NationalCalendar() {
  const today = new Date();
  const [cursor, setCursor] = useState(startOfMonth(today));
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    supabase.from('rc_holidays').select('*').order('date').then(({ data }) => setHolidays(data || []));
  }, []);

  // Build a Mon-first grid for the current month, padded to whole weeks
  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const last  = endOfMonth(cursor);
    // Mon-first: dayOfWeek 0=Sun → 6, 1=Mon → 0, etc.
    const lead = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = lead; i > 0; i--) {
      const d = new Date(first); d.setDate(first.getDate() - i); cells.push(d);
    }
    for (let i = 1; i <= last.getDate(); i++) cells.push(new Date(first.getFullYear(), first.getMonth(), i));
    while (cells.length % 7 !== 0) {
      const d = new Date(cells[cells.length - 1]); d.setDate(d.getDate() + 1); cells.push(d);
    }
    return cells;
  }, [cursor]);

  const holidayByDate = useMemo(() => {
    const m = {};
    for (const h of holidays) m[h.date] = h;
    return m;
  }, [holidays]);

  // Upcoming list — next 4 holidays from today
  const upcoming = useMemo(() => {
    const todayYmd = ymd(today);
    return holidays.filter((h) => h.date >= todayYmd).slice(0, 5);
  }, [holidays]);

  const prevMonth = () => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); };
  const nextMonth = () => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); };
  const goToday   = () => setCursor(startOfMonth(new Date()));

  return (
    <div className="rounded-2xl border border-rc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-rc-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-rc-700"/>
          <h3 className="font-display text-lg font-bold text-rc-900">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="rounded-md p-2 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><ChevronLeft size={16}/></button>
          <button onClick={goToday} className="rounded-md px-3 py-1.5 text-xs font-semibold text-rc-700 hover:bg-rc-100">Today</button>
          <button onClick={nextMonth} className="rounded-md p-2 text-rc-500 hover:bg-rc-100 hover:text-rc-900"><ChevronRight size={16}/></button>
        </div>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[1.4fr_1fr]">
        {/* Calendar grid */}
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wider text-rc-500">
            {DOWS.map((d) => <div key={d} className="py-1">{d}</div>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = sameDay(d, today);
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              const h = holidayByDate[ymd(d)];
              const tone = h ? KIND_LABEL[h.kind]?.tone : null;
              return (
                <div
                  key={i}
                  title={h ? `${h.name} — ${KIND_LABEL[h.kind]?.label || h.kind}` : ''}
                  className={cn(
                    'relative grid aspect-square place-items-center rounded-lg text-sm',
                    !inMonth && 'text-rc-300',
                    inMonth && !isToday && 'text-rc-700',
                    isToday && 'bg-rc-900 text-white font-bold shadow-sm',
                    !isToday && isWeekend && inMonth && 'bg-rc-50',
                    !isToday && h && 'ring-1 ring-rose-200 bg-rose-50/60'
                  )}
                >
                  {d.getDate()}
                  {h && !isToday && (
                    <span className={cn('absolute bottom-1 h-1 w-1 rounded-full', tone || 'bg-rose-500')}/>
                  )}
                  {h && isToday && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white"/>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-rc-500">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"/>Public holiday</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Term begins</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-500"/>Term ends</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"/>School event</span>
          </div>
        </div>

        {/* Upcoming list */}
        <div>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-rc-500">Upcoming this year</p>
          {upcoming.length === 0 ? (
            <p className="text-sm text-rc-500">Nothing on the calendar.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((h) => {
                const cfg = KIND_LABEL[h.kind] || KIND_LABEL.public;
                const Icon = cfg.icon;
                const d = new Date(h.date);
                return (
                  <li key={h.id} className="flex items-center gap-3 rounded-lg border border-rc-100 bg-rc-50/30 p-3">
                    <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white', cfg.tone)}>
                      <Icon size={14}/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-rc-500">
                        {d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </p>
                      <p className="font-display text-base font-bold text-rc-900">{h.name}</p>
                      {h.description && <p className="text-xs text-rc-600">{h.description}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
