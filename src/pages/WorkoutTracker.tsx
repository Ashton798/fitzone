/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, CalendarDays, Check, ChevronDown, ChevronRight,
  Clock3, Dumbbell, Flame, History, Medal, MoreHorizontal, Plus, Save,
  TimerReset, Trash2, TrendingUp, Trophy, X, Sparkles, Loader2,
} from 'lucide-react';
import { exercisesApi, getToken, planGeneratorApi, workoutPlansApi, workoutsApi } from '@/lib/api';
import type {
  Exercise, PersonalRecord, Workout, WorkoutExercise, WorkoutPlan, WorkoutSet, WorkoutStats,
} from '@/types';

type TrackerTab = 'today' | 'history' | 'progress' | 'plans';
type LastPerformance = { date: string; sets: WorkoutSet[] } | null;

const uid = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const localDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const fmtNumber = (value: number) => new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value || 0);
const fmtDate = (date: string, withYear = false) => {
  const parsed = new Date(`${date}T00:00:00`);
  return new Intl.DateTimeFormat('zh-CN', withYear
    ? { year: 'numeric', month: '2-digit', day: '2-digit' }
    : { month: 'long', day: 'numeric' }).format(parsed);
};

function MiniLineChart({ points }: { points: Array<{ date: string; weight: number }> }) {
  if (points.length < 2) {
    return <div className="h-28 flex items-center justify-center text-sm text-dark-400">再完成一次训练即可生成趋势</div>;
  }
  const values = points.map(point => point.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const coords = points.map((point, index) => ({
    x: 12 + (index / Math.max(points.length - 1, 1)) * 276,
    y: 94 - ((point.weight - min) / span) * 72,
    ...point,
  }));
  return (
    <div className="mt-3">
      <svg viewBox="0 0 300 108" className="w-full h-28" role="img" aria-label="重量趋势折线图">
        <path d="M12 94H288" stroke="#D4DCE8" strokeWidth="1" />
        <polyline points={coords.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#2F6BFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(point => <circle key={`${point.date}-${point.x}`} cx={point.x} cy={point.y} r="5" fill="#FFCF45" stroke="#0A1A2F" strokeWidth="2" />)}
      </svg>
      <div className="flex justify-between text-[11px] text-dark-500 -mt-1">
        <span>{fmtDate(points[0].date)}</span>
        <span className="font-anton text-dark-900 text-sm">{points.at(-1)?.weight} kg</span>
        <span>{fmtDate(points.at(-1)!.date)}</span>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: { icon: any; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="surface-card p-8 md:p-12 text-center bg-white">
      <div className="w-14 h-14 rounded-2xl bg-primary-50 text-primary-500 flex items-center justify-center mx-auto mb-4"><Icon className="w-7 h-7" /></div>
      <h3 className="font-display text-xl text-dark-950">{title}</h3>
      <p className="text-sm text-dark-500 mt-2 mb-5">{description}</p>
      {action}
    </div>
  );
}

export default function WorkoutTracker() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TrackerTab>('today');
  const [active, setActive] = useState<Workout | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [range, setRange] = useState<'30d' | '3m' | '6m' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [exercisePicker, setExercisePicker] = useState(false);
  const [customExerciseOpen, setCustomExerciseOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customGroup, setCustomGroup] = useState('其他');
  const [lastByExercise, setLastByExercise] = useState<Record<string, LastPerformance>>({});
  const [restLeft, setRestLeft] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [completedWorkout, setCompletedWorkout] = useState<Workout | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planFocus, setPlanFocus] = useState('');
  const [planWeekday, setPlanWeekday] = useState<number | undefined>(undefined);
  const [planExerciseIds, setPlanExerciseIds] = useState<string[]>([]);
  const [aiPlanOpen, setAiPlanOpen] = useState(false);
  const [aiPlanGenerating, setAiPlanGenerating] = useState(false);
  const [aiPlanForm, setAiPlanForm] = useState({ goal: '增肌', level: '初级', equipment: '健身房器械', days: 3 });
  const hydrated = useRef(false);

  const loadAll = useCallback(async () => {
    if (!getToken()) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const [activeWorkout, history, exerciseList, planList, workoutStats] = await Promise.all([
        workoutsApi.getActiveWorkout(), workoutsApi.getWorkouts(100, 'completed'),
        exercisesApi.getExercises(), workoutPlansApi.getPlans(), workoutsApi.getStats(range),
      ]);
      setActive(activeWorkout as Workout | null);
      setWorkouts(history as Workout[]);
      setExercises(exerciseList as Exercise[]);
      setPlans(planList as WorkoutPlan[]);
      setStats(workoutStats as WorkoutStats);
      hydrated.current = true;
    } catch (err: any) {
      setError(err.message || '训练数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [navigate, range]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (!active || active.status !== 'in_progress' || !hydrated.current) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        const saved = await workoutsApi.saveWorkout(active.id, { name: active.name, exercises: active.exercises });
        setActive(current => current?.id === active.id ? { ...current, ...(saved as Workout) } : current);
      } catch (err: any) {
        setError(err.message || '自动保存失败');
      } finally {
        setSaving(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [active?.id, active?.name, JSON.stringify(active?.exercises)]);

  useEffect(() => {
    if (!active?.exercises.length) return;
    const missing = active.exercises.filter(exercise => !Object.prototype.hasOwnProperty.call(lastByExercise, exercise.exerciseId));
    if (!missing.length) return;
    Promise.all(missing.map(async exercise => {
      try { return [exercise.exerciseId, await workoutsApi.getLastPerformance(exercise.exerciseId)] as const; }
      catch { return [exercise.exerciseId, null] as const; }
    })).then(entries => setLastByExercise(current => ({ ...current, ...Object.fromEntries(entries) })));
  }, [active?.id, active?.exercises.map(exercise => exercise.exerciseId).join('|')]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const timer = window.setInterval(() => setRestLeft(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restLeft > 0]);

  const todayPlan = useMemo(() => plans.find(plan => plan.weekday === new Date().getDay()), [plans]);
  const summary = useMemo(() => {
    if (!active) return { sets: 0, volume: 0, exercises: 0, minutes: 0 };
    const completedSets = active.exercises.flatMap(exercise => exercise.sets).filter(set => set.completed);
    return {
      sets: completedSets.length,
      volume: completedSets.reduce((sum, set) => sum + set.weight * set.reps, 0),
      exercises: active.exercises.filter(exercise => exercise.sets.some(set => set.completed)).length,
      minutes: Math.max(1, Math.round((Date.now() - new Date(active.startedAt).getTime()) / 60000)),
    };
  }, [active]);

  const startWorkout = async (plan?: WorkoutPlan) => {
    setError('');
    try {
      const workout = await workoutsApi.startWorkout({ name: plan?.name || '自由训练', planId: plan?.id, date: localDateKey() });
      setActive(workout as Workout);
      setTab('today');
    } catch (err: any) { setError(err.message || '无法开始训练'); }
  };

  const updateExercise = (exerciseId: string, updater: (exercise: WorkoutExercise) => WorkoutExercise) => {
    setActive(current => current ? {
      ...current,
      exercises: current.exercises.map(exercise => exercise.id === exerciseId ? updater(exercise) : exercise),
    } : current);
  };

  const addExercise = async (exercise: Exercise) => {
    if (!active || active.exercises.some(item => item.exerciseId === exercise.id)) return;
    let last: LastPerformance = null;
    try { last = await workoutsApi.getLastPerformance(exercise.id) as LastPerformance; } catch { /* empty history is valid */ }
    setLastByExercise(current => ({ ...current, [exercise.id]: last }));
    const source = last?.sets.at(-1);
    const newExercise: WorkoutExercise = {
      id: uid(), exerciseId: exercise.id, exerciseName: exercise.name,
      order: active.exercises.length, restSeconds: 90,
      sets: [{ id: uid(), weight: source?.weight || 0, reps: source?.reps || 8, completed: false }],
    };
    setActive(current => current ? { ...current, exercises: [...current.exercises, newExercise] } : current);
    setExercisePicker(false);
  };

  const createCustomExercise = async () => {
    if (!customName.trim()) return;
    try {
      const exercise = await exercisesApi.createExercise({ name: customName, muscleGroup: customGroup }) as Exercise;
      setExercises(current => [...current, exercise]);
      setCustomName('');
      setCustomExerciseOpen(false);
      await addExercise(exercise);
    } catch (err: any) { setError(err.message || '创建动作失败'); }
  };

  const addSet = (exerciseId: string) => updateExercise(exerciseId, exercise => {
    const previous = exercise.sets.at(-1) || { weight: 0, reps: 8 };
    return { ...exercise, sets: [...exercise.sets, { id: uid(), weight: previous.weight, reps: previous.reps, completed: false }] };
  });

  const updateSet = (exerciseId: string, setId: string, patch: Partial<WorkoutSet>) => updateExercise(exerciseId, exercise => ({
    ...exercise, sets: exercise.sets.map(set => set.id === setId ? { ...set, ...patch } : set),
  }));

  const toggleSet = (exerciseId: string, setId: string) => {
    const exercise = active?.exercises.find(item => item.id === exerciseId);
    const set = exercise?.sets.find(item => item.id === setId);
    updateSet(exerciseId, setId, { completed: !set?.completed });
    if (!set?.completed && exercise) setRestLeft(exercise.restSeconds);
  };

  const removeSet = (exerciseId: string, setId: string) => updateExercise(exerciseId, exercise => ({
    ...exercise, sets: exercise.sets.filter(set => set.id !== setId),
  }));

  const removeExercise = (exerciseId: string) => setActive(current => current ? {
    ...current, exercises: current.exercises.filter(exercise => exercise.id !== exerciseId),
  } : current);

  const finishWorkout = async () => {
    if (!active || summary.sets === 0) return;
    setSaving(true);
    try {
      const result = await workoutsApi.completeWorkout(active.id, { name: active.name, exercises: active.exercises }) as Workout;
      setCompletedWorkout(result);
      setActive(null);
      setSummaryOpen(false);
      await loadAll();
    } catch (err: any) { setError(err.message || '保存训练失败'); }
    finally { setSaving(false); }
  };

  const createPlan = async () => {
    if (!planName.trim() || planExerciseIds.length === 0) return;
    try {
      const plan = await workoutPlansApi.createPlan({
        name: planName, focus: planFocus, weekday: planWeekday,
        exercises: planExerciseIds.map(id => {
          const exercise = exercises.find(item => item.id === id)!;
          return { exerciseId: id, exerciseName: exercise.name, sets: 3, weight: 0, reps: 8, restSeconds: 90 };
        }),
      }) as WorkoutPlan;
      setPlans(current => [...current, plan]);
      setPlanOpen(false); setPlanName(''); setPlanFocus(''); setPlanWeekday(undefined); setPlanExerciseIds([]);
    } catch (err: any) { setError(err.message || '创建计划失败'); }
  };

  const createAIPlans = async () => {
    setAiPlanGenerating(true);
    setError('');
    try {
      const generated = await planGeneratorApi.workout(aiPlanForm) as { plans: Array<any> };
      const saved = await Promise.all(generated.plans.map(plan => workoutPlansApi.createPlan(plan))) as WorkoutPlan[];
      setPlans(current => [...current, ...saved]);
      setAiPlanOpen(false);
      setTab('plans');
    } catch (err: any) {
      setError(err.message || 'AI 训练计划生成失败');
    } finally {
      setAiPlanGenerating(false);
    }
  };

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-dark-500"><Activity className="w-6 h-6 mr-2 animate-pulse" />正在读取训练数据</div>;

  const tabs: Array<{ id: TrackerTab; label: string; icon: any }> = [
    { id: 'today', label: '今天训练', icon: Dumbbell },
    { id: 'history', label: '训练历史', icon: History },
    { id: 'progress', label: '我的进步', icon: TrendingUp },
    { id: 'plans', label: '训练计划', icon: CalendarDays },
  ];

  return (
    <div className="min-h-screen bg-dark-100 pb-28 md:pb-12">
      <section className="hero-gradient text-white border-b-4 border-accent-400">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-anton text-xs tracking-[0.25em] text-accent-400 mb-2">WORKOUT TRACKER</p>
              <h1 className="font-display text-3xl md:text-5xl">每一组，都算数</h1>
              <p className="text-primary-200 text-sm mt-2">自动保存 · 上次重量随时可见</p>
            </div>
            {active && <div className="hidden sm:block text-right"><p className="text-xs text-primary-200">今日已完成</p><p className="font-anton text-3xl text-accent-400">{summary.sets}<span className="text-sm ml-1">SETS</span></p></div>}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-3 md:px-4 -mt-px">
        <div className="sticky top-14 md:top-16 z-30 bg-dark-100/95 backdrop-blur py-3">
          <div className="grid grid-cols-4 gap-1 p-1.5 bg-white border-2 border-dark-950 rounded-2xl shadow-sport">
            {tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`min-h-12 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-[11px] sm:text-sm font-bold transition-colors ${tab === item.id ? 'bg-primary-500 text-white' : 'text-dark-500 hover:bg-dark-100'}`}><item.icon className="w-4 h-4" />{item.label}</button>)}
          </div>
        </div>

        {error && <div className="my-3 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm flex items-center justify-between"><span>{error}</span><button onClick={() => setError('')}><X className="w-4 h-4" /></button></div>}

        {tab === 'today' && (
          <div className="max-w-3xl mx-auto py-3 md:py-6">
            {!active ? (
              <div className="space-y-4">
                {todayPlan && <div className="surface-card bg-[#0A1A2F] text-white p-5 md:p-7">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-accent-400 font-bold mb-1">今日计划</p><h2 className="font-display text-2xl">{todayPlan.name}</h2><p className="text-primary-200 text-sm mt-1">{todayPlan.focus}</p></div><span className="font-anton text-5xl text-white/10">GO</span></div>
                  <div className="flex flex-wrap gap-2 my-5">{todayPlan.exercises.map(item => <span key={item.exerciseId} className="px-3 py-1.5 rounded-full bg-white/10 text-xs">{item.exerciseName}</span>)}</div>
                  <button onClick={() => startWorkout(todayPlan)} className="btn-accent w-full min-h-14"><Dumbbell className="w-5 h-5" />开始训练</button>
                </div>}
                <EmptyState icon={Dumbbell} title="今天练什么？" description="开始自由训练，或者从计划一键载入全部动作。" action={<div className="flex flex-col sm:flex-row gap-3 justify-center"><button onClick={() => startWorkout()} className="btn-primary min-h-12"><Plus className="w-5 h-5" />开始自由训练</button><button onClick={() => setTab('plans')} className="btn-tonal min-h-12">选择训练计划</button></div>} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div><p className="text-xs text-primary-600 font-bold">今天 · {fmtDate(active.date)}</p><input value={active.name} onChange={event => setActive({ ...active, name: event.target.value })} className="bg-transparent font-display text-2xl md:text-3xl text-dark-950 w-full outline-none border-b border-transparent focus:border-primary-300" aria-label="训练名称" /></div>
                  <span className={`text-xs flex items-center gap-1 ${saving ? 'text-primary-500' : 'text-dark-400'}`}><Save className="w-3.5 h-3.5" />{saving ? '保存中' : '已自动保存'}</span>
                </div>

                {active.exercises.map(exercise => {
                  const last = lastByExercise[exercise.exerciseId];
                  return <section key={exercise.id} className="surface-card bg-white overflow-hidden">
                    <div className="p-4 md:p-5 border-b-2 border-dark-950 flex items-start justify-between gap-3">
                      <div><h2 className="font-display text-xl md:text-2xl text-dark-950">{exercise.exerciseName}</h2><p className="text-xs text-dark-500 mt-1">{last ? `上次 ${fmtDate(last.date, true)} · ${last.sets.map(set => `${set.weight}kg × ${set.reps}`).join(' / ')}` : '暂无历史记录，从今天开始'}</p></div>
                      <button onClick={() => removeExercise(exercise.id)} className="w-10 h-10 rounded-full text-dark-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center" aria-label={`删除${exercise.exerciseName}`}><MoreHorizontal className="w-5 h-5" /></button>
                    </div>
                    <div className="px-3 md:px-5 py-3">
                      <div className="grid grid-cols-[32px_1fr_1fr_52px] gap-2 text-[11px] text-dark-400 font-bold text-center mb-2"><span>组</span><span>重量 KG</span><span>次数</span><span>完成</span></div>
                      <div className="space-y-2">
                        {exercise.sets.map((set, index) => <div key={set.id} className={`grid grid-cols-[32px_1fr_1fr_52px] gap-2 items-center rounded-xl p-1.5 transition-colors ${set.completed ? 'bg-green-50' : 'bg-dark-100'}`}>
                          <button onClick={() => removeSet(exercise.id, set.id)} className="text-sm font-anton text-dark-500 h-12" title="删除本组">{index + 1}</button>
                          <input type="number" inputMode="decimal" min="0" step="0.5" value={set.weight || ''} onFocus={event => event.currentTarget.select()} onChange={event => updateSet(exercise.id, set.id, { weight: event.target.value === '' ? 0 : Number(event.target.value) })} className="h-12 min-w-0 rounded-lg border-2 border-dark-300 bg-white text-center font-anton text-xl text-dark-950 focus:border-primary-500 focus:outline-none" aria-label={`${exercise.exerciseName}第${index + 1}组重量`} placeholder="0" />
                          <input type="number" inputMode="numeric" min="0" step="1" value={set.reps || ''} onFocus={event => event.currentTarget.select()} onChange={event => updateSet(exercise.id, set.id, { reps: event.target.value === '' ? 0 : Number(event.target.value) })} className="h-12 min-w-0 rounded-lg border-2 border-dark-300 bg-white text-center font-anton text-xl text-dark-950 focus:border-primary-500 focus:outline-none" aria-label={`${exercise.exerciseName}第${index + 1}组次数`} placeholder="0" />
                          <button onClick={() => toggleSet(exercise.id, set.id)} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center active:scale-90 transition-all ${set.completed ? 'bg-vibe-green border-dark-950 text-dark-950 shadow-[2px_2px_0_#0A1A2F]' : 'bg-white border-dark-300 text-dark-300'}`} aria-label={`${set.completed ? '取消' : '完成'}第${index + 1}组`}><Check className="w-6 h-6" strokeWidth={3} /></button>
                        </div>)}
                      </div>
                      <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
                        <button onClick={() => addSet(exercise.id)} className="min-h-12 rounded-xl border-2 border-dashed border-primary-300 text-primary-600 font-bold text-sm hover:bg-primary-50 active:scale-[.98] flex items-center justify-center gap-2"><Plus className="w-4 h-4" />添加一组 <span className="text-xs font-normal text-dark-400">复制上一组</span></button>
                        <button onClick={() => setRestLeft(exercise.restSeconds)} className="min-w-12 px-3 rounded-xl bg-dark-100 text-dark-600 text-xs"><Clock3 className="w-4 h-4 mx-auto mb-0.5" />{Math.floor(exercise.restSeconds / 60)}:{String(exercise.restSeconds % 60).padStart(2, '0')}</button>
                      </div>
                    </div>
                  </section>;
                })}

                <button onClick={() => setExercisePicker(true)} className="w-full min-h-14 rounded-2xl border-2 border-dashed border-dark-400 bg-white text-dark-800 font-display text-base flex items-center justify-center gap-2 active:scale-[.98]"><Plus className="w-5 h-5 text-primary-500" />添加动作</button>
                <button onClick={() => setSummaryOpen(true)} disabled={summary.sets === 0} className="btn-accent w-full min-h-14 text-base disabled:opacity-50 disabled:shadow-none"><Trophy className="w-5 h-5" />结束训练 · {summary.sets} 组</button>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && <div className="max-w-3xl mx-auto py-4 space-y-3">
          {workouts.length === 0 ? <EmptyState icon={History} title="还没有训练历史" description="完成第一场训练后，这里会留下每一组数据。" action={<button onClick={() => setTab('today')} className="btn-primary">开始训练</button>} /> : workouts.map(workout => <article key={workout.id} className="surface-card bg-white overflow-hidden">
            <button onClick={() => setExpandedHistory(expandedHistory === workout.id ? null : workout.id)} className="w-full p-4 md:p-5 text-left flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary-50 text-primary-600 flex flex-col items-center justify-center shrink-0"><span className="font-anton text-xl leading-none">{new Date(`${workout.date}T00:00:00`).getDate()}</span><span className="text-[10px]">{new Date(`${workout.date}T00:00:00`).getMonth() + 1}月</span></div>
              <div className="min-w-0 flex-1"><h3 className="font-display text-lg text-dark-950 truncate">{workout.name}</h3><p className="text-xs text-dark-500 mt-1">{workout.durationMinutes} 分钟 · {fmtNumber(workout.totalVolume)} kg · {workout.exercises.length} 个动作</p></div>
              <ChevronDown className={`w-5 h-5 text-dark-400 transition-transform ${expandedHistory === workout.id ? 'rotate-180' : ''}`} />
            </button>
            {expandedHistory === workout.id && <div className="px-4 md:px-5 pb-5 border-t border-dark-200 pt-3 space-y-3">{workout.exercises.map(exercise => <div key={exercise.id}><div className="font-bold text-sm text-dark-800">{exercise.exerciseName}</div><div className="flex flex-wrap gap-2 mt-1.5">{exercise.sets.filter(set => set.completed).map((set, index) => <span key={set.id} className="px-2.5 py-1 rounded-lg bg-dark-100 text-xs font-mono">{index + 1}. {set.weight}kg × {set.reps}</span>)}</div></div>)}</div>}
          </article>)}
        </div>}

        {tab === 'progress' && <div className="max-w-5xl mx-auto py-4 space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ['训练次数', stats?.totalWorkouts || 0, '次', Dumbbell], ['本周训练', stats?.thisWeekWorkouts || 0, '次', CalendarDays],
              ['连续训练', stats?.streakDays || 0, '天', Flame], ['累计时长', stats?.totalDurationMinutes || 0, '分钟', Clock3],
              ['训练容量', fmtNumber(stats?.totalVolume || 0), 'kg', BarChart3],
            ].map(([label, value, unit, Icon]: any) => <div key={label} className="surface-card bg-white p-4"><Icon className="w-5 h-5 text-primary-500 mb-3" /><p className="font-anton text-2xl md:text-3xl text-dark-950">{value}<span className="text-xs text-dark-500 ml-1">{unit}</span></p><p className="text-xs text-dark-500 mt-1">{label}</p></div>)}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">{([['30d', '最近30天'], ['3m', '最近3个月'], ['6m', '最近6个月'], ['all', '全部']] as const).map(([id, label]) => <button key={id} onClick={() => setRange(id)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${range === id ? 'bg-dark-950 text-white' : 'bg-white text-dark-600 border border-dark-300'}`}>{label}</button>)}</div>
          {stats?.trends.length ? <div className="grid md:grid-cols-2 gap-4">{stats.trends.map(trend => <div key={trend.exerciseId} className="surface-card bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs text-primary-500 font-bold">核心动作</p><h3 className="font-display text-xl text-dark-950 mt-1">{trend.exerciseName}</h3></div><TrendingUp className="w-6 h-6 text-vibe-green" /></div><MiniLineChart points={trend.points} /></div>)}</div> : <EmptyState icon={TrendingUp} title="数据正在热身" description="完成包含重量的训练后，这里会出现动作趋势。" />}
          {!!stats?.personalRecords.length && <section><h2 className="font-display text-2xl text-dark-950 mb-3 flex items-center gap-2"><Trophy className="w-6 h-6 text-accent-600" />个人纪录</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{stats.personalRecords.map(record => <div key={record.id} className="surface-card bg-[#0A1A2F] text-white p-5"><p className="text-accent-400 text-xs font-bold">🏆 PERSONAL RECORD</p><h3 className="font-display text-xl mt-2">{record.exerciseName}</h3><p className="font-anton text-3xl mt-3">{record.weight}<span className="text-sm">kg</span> × {record.reps}</p></div>)}</div></section>}
        </div>}

        {tab === 'plans' && <div className="max-w-4xl mx-auto py-4">
          <div className="flex items-center justify-between mb-4 gap-3"><div><h2 className="font-display text-2xl text-dark-950">我的训练计划</h2><p className="text-sm text-dark-500 mt-1">一次设置，到点直接开练</p></div><div className="flex gap-2"><button onClick={() => setAiPlanOpen(true)} className="btn-tonal px-3 md:px-5"><Sparkles className="w-4 h-4" />AI 创建</button><button onClick={() => setPlanOpen(true)} className="btn-primary px-3 md:px-5"><Plus className="w-4 h-4" />新计划</button></div></div>
          {plans.length === 0 ? <EmptyState icon={CalendarDays} title="建立你的训练节奏" description="创建 Push / Pull / Legs，或为某一天安排固定训练。" action={<button onClick={() => setPlanOpen(true)} className="btn-primary">创建训练计划</button>} /> : <div className="grid sm:grid-cols-2 gap-4">{plans.map(plan => <article key={plan.id} className="surface-card bg-white p-5 flex flex-col"><div className="flex justify-between gap-3"><div><p className="text-xs text-primary-500 font-bold">{plan.weekday === undefined ? '随时训练' : ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][plan.weekday]}</p><h3 className="font-display text-2xl text-dark-950 mt-1">{plan.name}</h3><p className="text-sm text-dark-500 mt-1">{plan.focus}</p></div><button onClick={async () => { await workoutPlansApi.deletePlan(plan.id); setPlans(current => current.filter(item => item.id !== plan.id)); }} className="w-10 h-10 rounded-full text-dark-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button></div><div className="flex flex-wrap gap-2 my-5 flex-1">{plan.exercises.map(item => <span key={item.exerciseId} className="px-2.5 py-1 bg-dark-100 rounded-lg text-xs">{item.exerciseName} · {item.sets}组</span>)}</div><button onClick={() => startWorkout(plan)} className="btn-accent w-full min-h-12">开始这个计划<ChevronRight className="w-4 h-4" /></button></article>)}</div>}
        </div>}
      </div>

      {restLeft > 0 && <div className="fixed bottom-[72px] md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-sm bg-dark-950 text-white border-2 border-accent-400 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3"><TimerReset className="w-6 h-6 text-accent-400" /><div className="flex-1"><p className="text-[10px] text-primary-200">休息时间</p><p className="font-anton text-2xl">{Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}</p></div><button onClick={() => setRestLeft(value => value + 30)} className="px-3 py-2 rounded-lg bg-white/10 text-xs">+30秒</button><button onClick={() => setRestLeft(0)} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"><X className="w-4 h-4" /></button></div>}

      {exercisePicker && <div className="fixed inset-0 z-[70] bg-dark-950/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setExercisePicker(false)}><div onClick={event => event.stopPropagation()} className="bg-white w-full md:max-w-2xl max-h-[82vh] rounded-t-3xl md:rounded-3xl border-2 border-dark-950 overflow-hidden"><div className="p-4 border-b border-dark-200 flex items-center justify-between"><div><h2 className="font-display text-xl">添加动作</h2><p className="text-xs text-dark-500">点一下即可加入今天训练</p></div><button onClick={() => setExercisePicker(false)} className="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center"><X className="w-5 h-5" /></button></div><div className="p-3 overflow-y-auto max-h-[60vh] grid sm:grid-cols-2 gap-2">{exercises.map(exercise => <button key={exercise.id} disabled={active?.exercises.some(item => item.exerciseId === exercise.id)} onClick={() => addExercise(exercise)} className="min-h-14 px-4 rounded-xl bg-dark-100 hover:bg-primary-50 disabled:opacity-40 text-left flex items-center gap-3"><span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-primary-500"><Dumbbell className="w-4 h-4" /></span><span><strong className="block text-sm text-dark-900">{exercise.name}</strong><small className="text-dark-500">{exercise.muscleGroup}{exercise.isCustom ? ' · 自定义' : ''}</small></span></button>)}</div><div className="p-4 border-t border-dark-200"><button onClick={() => setCustomExerciseOpen(true)} className="btn-tonal w-full min-h-12"><Plus className="w-4 h-4" />创建自定义动作</button></div></div></div>}

      {customExerciseOpen && <div className="fixed inset-0 z-[80] bg-dark-950/60 flex items-center justify-center p-4"><div className="surface-card bg-white w-full max-w-sm p-5"><h2 className="font-display text-xl mb-4">自定义动作</h2><label className="text-xs font-bold text-dark-600">动作名称<input autoFocus value={customName} onChange={event => setCustomName(event.target.value)} className="mt-1 w-full h-12 rounded-xl border-2 border-dark-300 px-4 text-base focus:border-primary-500 outline-none" placeholder="例如：地雷管划船" /></label><label className="text-xs font-bold text-dark-600 block mt-3">训练部位<select value={customGroup} onChange={event => setCustomGroup(event.target.value)} className="mt-1 w-full h-12 rounded-xl border-2 border-dark-300 px-4 bg-white">{['胸', '背', '肩', '腿', '二头', '三头', '核心', '其他'].map(item => <option key={item}>{item}</option>)}</select></label><div className="grid grid-cols-2 gap-3 mt-5"><button onClick={() => setCustomExerciseOpen(false)} className="btn-secondary">取消</button><button onClick={createCustomExercise} className="btn-primary">创建并添加</button></div></div></div>}

      {summaryOpen && active && <div className="fixed inset-0 z-[70] bg-dark-950/70 backdrop-blur-sm flex items-end md:items-center justify-center"><div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl border-2 border-dark-950 p-5 md:p-7"><div className="flex items-start justify-between"><div><p className="text-xs text-primary-500 font-bold">训练结束总结</p><h2 className="font-display text-3xl text-dark-950 mt-1">{active.name}</h2></div><Medal className="w-10 h-10 text-accent-600" /></div><div className="grid grid-cols-2 gap-3 my-6">{[['训练时间', `${summary.minutes} 分钟`], ['完成动作', `${summary.exercises} 个`], ['完成组数', `${summary.sets} 组`], ['训练容量', `${fmtNumber(summary.volume)} kg`]].map(([label, value]) => <div key={label} className="rounded-xl bg-dark-100 p-4"><p className="text-xs text-dark-500">{label}</p><p className="font-anton text-xl text-dark-950 mt-1">{value}</p></div>)}</div><div className="grid grid-cols-2 gap-3"><button onClick={() => setSummaryOpen(false)} className="btn-secondary min-h-12">继续训练</button><button onClick={finishWorkout} disabled={saving} className="btn-accent min-h-12"><Save className="w-4 h-4" />保存训练</button></div></div></div>}

      {completedWorkout && <div className="fixed inset-0 z-[75] bg-dark-950/75 backdrop-blur flex items-center justify-center p-4"><div className="surface-card bg-white w-full max-w-md p-6 text-center"><div className="w-16 h-16 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center mx-auto"><Trophy className="w-8 h-8" /></div><p className="font-hand text-2xl text-primary-500 mt-4">workout complete!</p><h2 className="font-display text-3xl text-dark-950 mt-1">训练已保存</h2>{!!completedWorkout.newRecords?.length && <div className="mt-5 p-4 rounded-2xl bg-dark-950 text-white text-left"><p className="text-accent-400 text-xs font-bold mb-2">🏆 新纪录</p>{completedWorkout.newRecords.map((record: PersonalRecord) => <p key={record.id} className="font-display text-lg">恭喜！你创造了新的{record.exerciseName}记录 <span className="font-anton text-accent-400">{record.weight}kg × {record.reps}</span></p>)}</div>}<button onClick={() => { setCompletedWorkout(null); setTab('history'); }} className="btn-primary w-full mt-6 min-h-12">查看训练历史</button></div></div>}

      {planOpen && <div className="fixed inset-0 z-[70] bg-dark-950/65 flex items-end md:items-center justify-center"><div className="bg-white w-full md:max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl md:rounded-3xl border-2 border-dark-950 p-5"><div className="flex justify-between items-center mb-4"><h2 className="font-display text-2xl">创建训练计划</h2><button onClick={() => setPlanOpen(false)} className="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center"><X className="w-5 h-5" /></button></div><div className="grid sm:grid-cols-2 gap-3"><label className="text-xs font-bold text-dark-600">计划名称<input value={planName} onChange={event => setPlanName(event.target.value)} placeholder="Push" className="mt-1 w-full h-12 rounded-xl border-2 border-dark-300 px-4 outline-none focus:border-primary-500" /></label><label className="text-xs font-bold text-dark-600">训练部位<input value={planFocus} onChange={event => setPlanFocus(event.target.value)} placeholder="胸 + 肩 + 三头" className="mt-1 w-full h-12 rounded-xl border-2 border-dark-300 px-4 outline-none focus:border-primary-500" /></label></div><label className="text-xs font-bold text-dark-600 block mt-3">安排日期<select value={planWeekday ?? ''} onChange={event => setPlanWeekday(event.target.value === '' ? undefined : Number(event.target.value))} className="mt-1 w-full h-12 rounded-xl border-2 border-dark-300 px-4 bg-white"><option value="">不指定日期</option>{['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label><p className="text-xs font-bold text-dark-600 mt-4 mb-2">选择动作 · 默认 3组 × 8次</p><div className="grid grid-cols-2 gap-2">{exercises.map(exercise => { const selected = planExerciseIds.includes(exercise.id); return <button key={exercise.id} onClick={() => setPlanExerciseIds(current => selected ? current.filter(id => id !== exercise.id) : [...current, exercise.id])} className={`min-h-11 px-3 rounded-xl border-2 text-sm text-left flex items-center gap-2 ${selected ? 'border-primary-500 bg-primary-50 text-primary-700 font-bold' : 'border-dark-200 text-dark-600'}`}><span className={`w-5 h-5 rounded-md flex items-center justify-center ${selected ? 'bg-primary-500 text-white' : 'bg-dark-100'}`}>{selected && <Check className="w-3.5 h-3.5" />}</span>{exercise.name}</button>; })}</div><button onClick={createPlan} disabled={!planName.trim() || !planExerciseIds.length} className="btn-accent w-full min-h-12 mt-5 disabled:opacity-50">保存训练计划</button></div></div>}

      {aiPlanOpen && <div className="fixed inset-0 z-[80] bg-dark-950/70 flex items-end md:items-center justify-center"><div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl border-2 border-dark-950 p-5 pb-[calc(20px+env(safe-area-inset-bottom))]"><div className="flex justify-between"><div><p className="text-xs text-primary-600 font-bold">AI PROGRAM BUILDER</p><h2 className="font-display text-2xl text-dark-950 mt-1">让 AI 创建训练计划</h2></div><button onClick={() => setAiPlanOpen(false)} className="w-10 h-10 rounded-full bg-dark-100 flex items-center justify-center"><X className="w-5 h-5" /></button></div><div className="grid grid-cols-2 gap-3 mt-6"><label className="text-xs font-bold text-dark-600">目标<select value={aiPlanForm.goal} onChange={event => setAiPlanForm({ ...aiPlanForm, goal: event.target.value })} className="mt-1 w-full h-12 rounded-xl border-2 border-dark-300 px-3 bg-white"><option>增肌</option><option>减脂</option><option>提升力量</option><option>塑形</option></select></label><label className="text-xs font-bold text-dark-600">训练水平<select value={aiPlanForm.level} onChange={event => setAiPlanForm({ ...aiPlanForm, level: event.target.value })} className="mt-1 w-full h-12 rounded-xl border-2 border-dark-300 px-3 bg-white"><option>初级</option><option>中级</option><option>高级</option></select></label><label className="text-xs font-bold text-dark-600">每周训练天数<input type="number" min="1" max="6" value={aiPlanForm.days} onChange={event => setAiPlanForm({ ...aiPlanForm, days: Math.max(1, Math.min(6, Number(event.target.value) || 1)) })} className="mt-1 w-full h-12 rounded-xl border-2 border-dark-300 px-3" /></label><label className="text-xs font-bold text-dark-600">器械<input value={aiPlanForm.equipment} onChange={event => setAiPlanForm({ ...aiPlanForm, equipment: event.target.value })} className="mt-1 w-full h-12 rounded-xl border-2 border-dark-300 px-3" /></label></div><p className="text-xs text-dark-500 mt-4">生成后会直接保存到你的账号，并在手机和电脑同步显示。</p><button onClick={createAIPlans} disabled={aiPlanGenerating} className="btn-accent w-full min-h-14 mt-5 disabled:opacity-50">{aiPlanGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}{aiPlanGenerating ? 'AI 正在编排…' : '生成并保存计划'}</button></div></div>}
    </div>
  );
}
