/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Express, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';

export type WorkoutTable = 'exercises' | 'workout_records' | 'workout_plans' | 'personal_records';

export interface WorkoutStore {
  get: (table: WorkoutTable) => any[];
  set: (table: WorkoutTable, rows: any[]) => void;
}

const BUILTIN_EXERCISES = [
  ['bench-press', '卧推', '胸'],
  ['incline-dumbbell-press', '上斜哑铃卧推', '胸'],
  ['squat', '深蹲', '腿'],
  ['deadlift', '硬拉', '背'],
  ['pull-up', '引体向上', '背'],
  ['lat-pulldown', '高位下拉', '背'],
  ['seated-row', '坐姿划船', '背'],
  ['dumbbell-curl', '哑铃弯举', '二头'],
  ['rope-pushdown', '绳索下压', '三头'],
  ['lateral-raise', '侧平举', '肩'],
  ['leg-press', '腿举', '腿'],
  ['overhead-press', '肩推', '肩'],
].map(([id, name, muscleGroup]) => ({ id, name, muscleGroup, isCustom: false }));

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const dateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const sanitizeExercises = (items: any[]) => (Array.isArray(items) ? items : []).map((item, index) => ({
  id: item.id || uuidv4(),
  exerciseId: String(item.exerciseId || ''),
  exerciseName: String(item.exerciseName || '').trim(),
  order: index,
  restSeconds: Math.round(numberValue(item.restSeconds, 90)),
  sets: (Array.isArray(item.sets) ? item.sets : []).map((set: any) => ({
    id: set.id || uuidv4(),
    weight: numberValue(set.weight),
    reps: Math.round(numberValue(set.reps)),
    completed: !!set.completed,
  })),
})).filter(item => item.exerciseId && item.exerciseName);

const calculateSummary = (workout: any) => {
  const completedSets = workout.exercises.flatMap((exercise: any) => exercise.sets)
    .filter((set: any) => set.completed);
  const totalVolume = completedSets.reduce(
    (sum: number, set: any) => sum + numberValue(set.weight) * numberValue(set.reps), 0,
  );
  return {
    completedSets: completedSets.length,
    totalVolume: Math.round(totalVolume * 10) / 10,
  };
};

const estimateOneRepMax = (weight: number, reps: number) =>
  Math.round((weight * (1 + reps / 30)) * 10) / 10;

const workoutDate = (workout: any) => new Date(`${workout.date || dateKey()}T00:00:00`);

export function registerWorkoutRoutes(app: Express, authenticate: RequestHandler, store: WorkoutStore) {
  app.get('/api/exercises', authenticate, (req: any, res) => {
    const custom = store.get('exercises').filter(row => row.userId === req.user.userId);
    res.json([...BUILTIN_EXERCISES, ...custom]);
  });

  app.post('/api/exercises', authenticate, (req: any, res) => {
    const name = String(req.body?.name || '').trim();
    const muscleGroup = String(req.body?.muscleGroup || '其他').trim();
    if (!name) return res.status(400).json({ error: '请输入动作名称' });
    const duplicate = [...BUILTIN_EXERCISES, ...store.get('exercises')]
      .find(item => item.name.toLowerCase() === name.toLowerCase() && (!item.userId || item.userId === req.user.userId));
    if (duplicate) return res.status(409).json({ error: '这个动作已经存在' });
    const exercise = { id: uuidv4(), userId: req.user.userId, name, muscleGroup, isCustom: true, createdAt: new Date().toISOString() };
    store.set('exercises', [...store.get('exercises'), exercise]);
    res.status(201).json(exercise);
  });

  app.get('/api/workouts/active', authenticate, (req: any, res) => {
    const active = store.get('workout_records')
      .filter(row => row.userId === req.user.userId && row.status === 'in_progress')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
    res.json(active || null);
  });

  app.get('/api/workouts/stats', authenticate, (req: any, res) => {
    const range = String(req.query.range || '30d');
    const days = range === '30d' ? 30 : range === '3m' ? 90 : range === '6m' ? 180 : null;
    const cutoff = days ? new Date(Date.now() - days * 86400000) : null;
    const allCompleted = store.get('workout_records')
      .filter(row => row.userId === req.user.userId && row.status === 'completed')
      .sort((a, b) => workoutDate(a).getTime() - workoutDate(b).getTime());
    const ranged = cutoff ? allCompleted.filter(row => workoutDate(row) >= cutoff) : allCompleted;
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

    const uniqueDates = [...new Set(allCompleted.map(row => row.date))].sort().reverse();
    let streakDays = 0;
    if (uniqueDates.length) {
      const cursor = new Date();
      cursor.setHours(0, 0, 0, 0);
      if (uniqueDates[0] !== dateKey(cursor)) cursor.setDate(cursor.getDate() - 1);
      while (uniqueDates.includes(dateKey(cursor))) {
        streakDays += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    const trendMap = new Map<string, any>();
    ranged.forEach(workout => workout.exercises.forEach((exercise: any) => {
      const best = exercise.sets.filter((set: any) => set.completed && set.weight > 0 && set.reps > 0)
        .map((set: any) => ({ ...set, estimatedOneRepMax: estimateOneRepMax(set.weight, set.reps) }))
        .sort((a: any, b: any) => b.estimatedOneRepMax - a.estimatedOneRepMax)[0];
      if (!best) return;
      if (!trendMap.has(exercise.exerciseId)) trendMap.set(exercise.exerciseId, {
        exerciseId: exercise.exerciseId, exerciseName: exercise.exerciseName, points: [],
      });
      trendMap.get(exercise.exerciseId).points.push({ date: workout.date, weight: best.weight, reps: best.reps, estimatedOneRepMax: best.estimatedOneRepMax });
    }));

    res.json({
      totalWorkouts: allCompleted.length,
      thisWeekWorkouts: allCompleted.filter(row => workoutDate(row) >= weekStart).length,
      streakDays,
      totalDurationMinutes: allCompleted.reduce((sum, row) => sum + numberValue(row.durationMinutes), 0),
      totalVolume: Math.round(allCompleted.reduce((sum, row) => sum + numberValue(row.totalVolume), 0) * 10) / 10,
      trends: [...trendMap.values()],
      personalRecords: store.get('personal_records').filter(row => row.userId === req.user.userId),
    });
  });

  app.get('/api/workouts/ai-context', authenticate, (req: any, res) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    const cutoff = new Date(Date.now() - days * 86400000);
    const workouts = store.get('workout_records')
      .filter(row => row.userId === req.user.userId && row.status === 'completed' && workoutDate(row) >= cutoff)
      .sort((a, b) => workoutDate(a).getTime() - workoutDate(b).getTime());
    const records = workouts.flatMap(workout => workout.exercises.map((exercise: any) => ({
      date: workout.date,
      workoutName: workout.name,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      sets: exercise.sets.filter((set: any) => set.completed).map((set: any) => ({ weight: set.weight, reps: set.reps })),
    }))).filter(item => item.sets.length > 0);
    res.json({ days, workoutCount: workouts.length, records });
  });

  app.get('/api/workouts/last-exercise/:exerciseId', authenticate, (req: any, res) => {
    const workouts = store.get('workout_records')
      .filter(row => row.userId === req.user.userId && row.status === 'completed')
      .sort((a, b) => workoutDate(b).getTime() - workoutDate(a).getTime());
    for (const workout of workouts) {
      const exercise = workout.exercises.find((item: any) => item.exerciseId === req.params.exerciseId);
      if (exercise) return res.json({ date: workout.date, workoutId: workout.id, sets: exercise.sets.filter((set: any) => set.completed) });
    }
    res.json(null);
  });

  app.get('/api/workouts', authenticate, (req: any, res) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const status = req.query.status;
    let rows = store.get('workout_records').filter(row => row.userId === req.user.userId);
    if (status === 'completed' || status === 'in_progress') rows = rows.filter(row => row.status === status);
    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(rows.slice(0, limit));
  });

  app.get('/api/workouts/:id', authenticate, (req: any, res) => {
    const workout = store.get('workout_records').find(row => row.id === req.params.id && row.userId === req.user.userId);
    if (!workout) return res.status(404).json({ error: '训练记录不存在' });
    res.json(workout);
  });

  app.post('/api/workouts', authenticate, (req: any, res) => {
    const current = store.get('workout_records');
    const existing = current.find(row => row.userId === req.user.userId && row.status === 'in_progress');
    if (existing) return res.status(200).json(existing);
    const plan = req.body?.planId
      ? store.get('workout_plans').find(row => row.id === req.body.planId && row.userId === req.user.userId)
      : null;
    const now = new Date().toISOString();
    const workout = {
      id: uuidv4(), userId: req.user.userId,
      name: String(req.body?.name || plan?.name || '自由训练').trim() || '自由训练',
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date || '')) ? req.body.date : dateKey(),
      status: 'in_progress', startedAt: now,
      durationMinutes: 0, totalVolume: 0, completedSets: 0,
      planId: plan?.id,
      exercises: plan ? sanitizeExercises(plan.exercises.map((item: any) => ({
        exerciseId: item.exerciseId, exerciseName: item.exerciseName, restSeconds: item.restSeconds,
        sets: Array.from({ length: Math.max(1, item.sets || 1) }, () => ({ weight: item.weight, reps: item.reps, completed: false })),
      }))) : [],
      createdAt: now, updatedAt: now,
    };
    store.set('workout_records', [...current, workout]);
    res.status(201).json(workout);
  });

  app.put('/api/workouts/:id', authenticate, (req: any, res) => {
    const rows = store.get('workout_records');
    const index = rows.findIndex(row => row.id === req.params.id && row.userId === req.user.userId);
    if (index < 0) return res.status(404).json({ error: '训练记录不存在' });
    if (rows[index].status === 'completed') return res.status(409).json({ error: '已完成的训练不能修改' });
    const updated = {
      ...rows[index],
      name: String(req.body?.name || rows[index].name).trim() || rows[index].name,
      exercises: sanitizeExercises(req.body?.exercises),
      updatedAt: new Date().toISOString(),
    };
    Object.assign(updated, calculateSummary(updated));
    rows[index] = updated;
    store.set('workout_records', rows);
    res.json(updated);
  });

  app.post('/api/workouts/:id/complete', authenticate, (req: any, res) => {
    const rows = store.get('workout_records');
    const index = rows.findIndex(row => row.id === req.params.id && row.userId === req.user.userId);
    if (index < 0) return res.status(404).json({ error: '训练记录不存在' });
    if (rows[index].status === 'completed') return res.json(rows[index]);
    const now = new Date();
    const workout = {
      ...rows[index],
      name: String(req.body?.name || rows[index].name).trim() || rows[index].name,
      exercises: sanitizeExercises(req.body?.exercises),
      status: 'completed', completedAt: now.toISOString(), updatedAt: now.toISOString(),
      durationMinutes: Math.max(1, Math.round((now.getTime() - new Date(rows[index].startedAt).getTime()) / 60000)),
    };
    Object.assign(workout, calculateSummary(workout));
    const records = store.get('personal_records');
    const newRecords: any[] = [];
    workout.exercises.forEach((exercise: any) => {
      const bestSet = exercise.sets.filter((set: any) => set.completed && set.weight > 0 && set.reps > 0)
        .map((set: any) => ({ ...set, estimatedOneRepMax: estimateOneRepMax(set.weight, set.reps) }))
        .sort((a: any, b: any) => b.estimatedOneRepMax - a.estimatedOneRepMax)[0];
      if (!bestSet) return;
      const recordIndex = records.findIndex(row => row.userId === req.user.userId && row.exerciseId === exercise.exerciseId);
      if (recordIndex < 0 || bestSet.estimatedOneRepMax > records[recordIndex].estimatedOneRepMax) {
        const record = {
          id: uuidv4(), userId: req.user.userId, exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName, weight: bestSet.weight, reps: bestSet.reps,
          estimatedOneRepMax: bestSet.estimatedOneRepMax, workoutId: workout.id, achievedAt: now.toISOString(),
        };
        if (recordIndex < 0) records.push(record); else records[recordIndex] = record;
        newRecords.push(record);
      }
    });
    workout.newRecords = newRecords;
    rows[index] = workout;
    store.set('workout_records', rows);
    store.set('personal_records', records);
    res.json(workout);
  });

  app.delete('/api/workouts/:id', authenticate, (req: any, res) => {
    const rows = store.get('workout_records');
    const filtered = rows.filter(row => !(row.id === req.params.id && row.userId === req.user.userId));
    if (filtered.length === rows.length) return res.status(404).json({ error: '训练记录不存在' });
    store.set('workout_records', filtered);
    res.json({ success: true });
  });

  app.get('/api/workout-plans', authenticate, (req: any, res) => {
    res.json(store.get('workout_plans').filter(row => row.userId === req.user.userId));
  });

  app.post('/api/workout-plans', authenticate, (req: any, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: '请输入计划名称' });
    const now = new Date().toISOString();
    const plan = {
      id: uuidv4(), userId: req.user.userId, name,
      focus: String(req.body?.focus || '').trim(),
      weekday: req.body?.weekday === undefined ? undefined : Math.min(6, Math.max(0, Number(req.body.weekday))),
      reminderEnabled: !!req.body?.reminderEnabled,
      reminderTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(req.body?.reminderTime || '')) ? req.body.reminderTime : '18:00',
      exercises: (Array.isArray(req.body?.exercises) ? req.body.exercises : []).map((item: any) => ({
        exerciseId: String(item.exerciseId || ''), exerciseName: String(item.exerciseName || ''),
        sets: Math.max(1, Math.round(numberValue(item.sets, 3))), weight: numberValue(item.weight),
        reps: Math.max(1, Math.round(numberValue(item.reps, 8))), restSeconds: Math.round(numberValue(item.restSeconds, 90)),
      })).filter((item: any) => item.exerciseId && item.exerciseName),
      createdAt: now, updatedAt: now,
    };
    store.set('workout_plans', [...store.get('workout_plans'), plan]);
    res.status(201).json(plan);
  });

  app.put('/api/workout-plans/:id', authenticate, (req: any, res) => {
    const rows = store.get('workout_plans');
    const index = rows.findIndex(row => row.id === req.params.id && row.userId === req.user.userId);
    if (index < 0) return res.status(404).json({ error: '训练计划不存在' });
    const updated = {
      ...rows[index], ...req.body, id: rows[index].id, userId: rows[index].userId,
      name: String(req.body?.name || rows[index].name).trim(), updatedAt: new Date().toISOString(),
    };
    updated.reminderEnabled = !!updated.reminderEnabled;
    updated.reminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(updated.reminderTime || '')) ? updated.reminderTime : '18:00';
    rows[index] = updated;
    store.set('workout_plans', rows);
    res.json(updated);
  });

  app.delete('/api/workout-plans/:id', authenticate, (req: any, res) => {
    const rows = store.get('workout_plans');
    const filtered = rows.filter(row => !(row.id === req.params.id && row.userId === req.user.userId));
    if (filtered.length === rows.length) return res.status(404).json({ error: '训练计划不存在' });
    store.set('workout_plans', filtered);
    res.json({ success: true });
  });
}
