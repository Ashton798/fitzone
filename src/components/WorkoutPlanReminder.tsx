import { useEffect, useState } from 'react';
import { AlarmClock, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getToken, workoutPlansApi } from '@/lib/api';
import { sendWorkoutReminder } from '@/lib/reminders';
import type { WorkoutPlan } from '@/types';

const localDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function WorkoutPlanReminder() {
  const navigate = useNavigate();
  const [duePlan, setDuePlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    if (!getToken()) return;
    let plans: WorkoutPlan[] = [];
    let active = true;

    const check = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const due = plans.find(plan => {
        if (!plan.reminderEnabled || plan.weekday !== now.getDay() || !plan.reminderTime) return false;
        const [hour, minute] = plan.reminderTime.split(':').map(Number);
        const targetMinutes = hour * 60 + minute;
        const remindedKey = `fitzone_plan_reminded_${plan.id}_${localDateKey(now)}`;
        return currentMinutes >= targetMinutes && currentMinutes - targetMinutes <= 90 && !localStorage.getItem(remindedKey);
      });
      if (!due) return;
      localStorage.setItem(`fitzone_plan_reminded_${due.id}_${localDateKey(now)}`, '1');
      setDuePlan(due);
      sendWorkoutReminder(`该练 ${due.name} 了`, due.focus || '打开 FitZone 开始今天的训练', `plan-${due.id}`);
    };

    const refreshPlans = () => workoutPlansApi.getPlans().then(rows => {
      if (!active) return;
      plans = rows as WorkoutPlan[];
      check();
    }).catch(() => {});
    refreshPlans();
    const timer = window.setInterval(refreshPlans, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  if (!duePlan) return null;
  return <div className="fixed z-[100] top-[calc(64px+env(safe-area-inset-top))] md:top-20 left-3 right-3 md:left-auto md:right-6 md:w-[380px] bg-dark-950 text-white border-2 border-accent-400 rounded-2xl shadow-2xl p-4 flex items-center gap-3" role="alert"><span className="w-11 h-11 rounded-xl bg-accent-400 text-dark-950 flex items-center justify-center shrink-0"><AlarmClock className="w-6 h-6" /></span><div className="min-w-0 flex-1"><p className="text-xs text-accent-400 font-bold">训练提醒</p><p className="font-display text-lg truncate">该练 {duePlan.name} 了</p><p className="text-xs text-primary-200 truncate">{duePlan.focus}</p></div><button onClick={() => { setDuePlan(null); navigate('/workout'); }} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center" aria-label="去训练"><ChevronRight className="w-5 h-5" /></button><button onClick={() => setDuePlan(null)} className="w-8 h-8 rounded-full text-white/60 flex items-center justify-center" aria-label="关闭提醒"><X className="w-4 h-4" /></button></div>;
}
