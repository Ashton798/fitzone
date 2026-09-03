/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exercisesApi, getToken, workoutPlansApi, workoutsApi } from '@/lib/api';
import type { Exercise, Workout, WorkoutExercise, WorkoutPlan, WorkoutSet } from '@/types';

export type LastPerformance = { date: string; sets: WorkoutSet[] } | null;
const uid = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const localDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function useWorkoutSession() {
  const navigate = useNavigate();
  const [active, setActive] = useState<Workout | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [lastByExercise, setLastByExercise] = useState<Record<string, LastPerformance>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState<Workout | null>(null);
  const hydrated = useRef(false);

  const load = useCallback(async () => {
    if (!getToken()) { navigate('/login'); return; }
    setLoading(true);
    try {
      const [workout, exerciseRows, planRows] = await Promise.all([
        workoutsApi.getActiveWorkout(), exercisesApi.getExercises(), workoutPlansApi.getPlans(),
      ]);
      setActive(workout as Workout | null);
      setExercises(exerciseRows as Exercise[]);
      setPlans(planRows as WorkoutPlan[]);
      hydrated.current = true;
    } catch (err: any) { setError(err.message || '训练数据加载失败'); }
    finally { setLoading(false); }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!active || active.status !== 'in_progress' || !hydrated.current) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try { await workoutsApi.saveWorkout(active.id, { name: active.name, exercises: active.exercises }); }
      catch (err: any) { setError(err.message || '自动保存失败'); }
      finally { setSaving(false); }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [active?.id, active?.name, JSON.stringify(active?.exercises)]);

  useEffect(() => {
    if (!active?.exercises.length) return;
    const missing = active.exercises.filter(item => !Object.prototype.hasOwnProperty.call(lastByExercise, item.exerciseId));
    if (!missing.length) return;
    Promise.all(missing.map(async item => {
      try { return [item.exerciseId, await workoutsApi.getLastPerformance(item.exerciseId)] as const; }
      catch { return [item.exerciseId, null] as const; }
    })).then(entries => setLastByExercise(current => ({ ...current, ...Object.fromEntries(entries) })));
  }, [active?.id, active?.exercises.map(item => item.exerciseId).join('|')]);

  const start = async (plan?: WorkoutPlan) => {
    try {
      const workout = await workoutsApi.startWorkout({ name: plan?.name || '自由训练', planId: plan?.id, date: localDateKey() });
      setActive(workout as Workout);
    } catch (err: any) { setError(err.message || '无法开始训练'); }
  };

  const updateExercise = (id: string, updater: (exercise: WorkoutExercise) => WorkoutExercise) => setActive(current => current ? {
    ...current, exercises: current.exercises.map(exercise => exercise.id === id ? updater(exercise) : exercise),
  } : current);

  const addExercise = async (exercise: Exercise) => {
    if (!active || active.exercises.some(item => item.exerciseId === exercise.id)) return;
    let last: LastPerformance = null;
    try { last = await workoutsApi.getLastPerformance(exercise.id) as LastPerformance; } catch { /* first session */ }
    setLastByExercise(current => ({ ...current, [exercise.id]: last }));
    const previous = last?.sets.at(-1);
    setActive(current => current ? { ...current, exercises: [...current.exercises, {
      id: uid(), exerciseId: exercise.id, exerciseName: exercise.name,
      order: current.exercises.length, restSeconds: 90,
      sets: [{ id: uid(), weight: previous?.weight || 0, reps: previous?.reps || 8, completed: false }],
    }] } : current);
  };

  const updateSet = (exerciseId: string, setId: string, patch: Partial<WorkoutSet>) => updateExercise(exerciseId, exercise => ({
    ...exercise, sets: exercise.sets.map(set => set.id === setId ? { ...set, ...patch } : set),
  }));

  const toggleSet = (exerciseId: string, setId: string) => {
    const set = active?.exercises.find(item => item.id === exerciseId)?.sets.find(item => item.id === setId);
    updateSet(exerciseId, setId, { completed: !set?.completed });
  };

  const addSet = (exerciseId: string) => updateExercise(exerciseId, exercise => {
    const previous = exercise.sets.at(-1) || { weight: 0, reps: 8 };
    return { ...exercise, sets: [...exercise.sets, { id: uid(), weight: previous.weight, reps: previous.reps, completed: false }] };
  });

  const finish = async () => {
    if (!active) return null;
    setSaving(true);
    try {
      const result = await workoutsApi.completeWorkout(active.id, { name: active.name, exercises: active.exercises }) as Workout;
      setCompleted(result);
      setActive(null);
      return result;
    } catch (err: any) { setError(err.message || '保存训练失败'); return null; }
    finally { setSaving(false); }
  };

  const completedSets = active?.exercises.flatMap(item => item.sets).filter(set => set.completed).length || 0;
  const todayPlan = plans.find(plan => plan.weekday === new Date().getDay()) || null;

  return {
    active, exercises, plans, todayPlan, lastByExercise, loading, saving, error, completed, completedSets,
    setError, setCompleted, setActive, refresh: load, start, addExercise, updateSet, toggleSet, addSet, finish,
  };
}
