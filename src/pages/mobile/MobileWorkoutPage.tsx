/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-extra-boolean-cast */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Check, ChevronRight, Clock3, Dumbbell, History, Loader2, Plus, Save, Sparkles, TrendingUp, Trophy, X } from 'lucide-react';
import { useWorkoutSession } from '@/hooks/useWorkoutSession';
import { planGeneratorApi, workoutPlansApi, workoutsApi } from '@/lib/api';
import type { Workout, WorkoutStats } from '@/types';
import { requestReminderPermission, sendWorkoutReminder } from '@/lib/reminders';
import ExerciseLibraryPicker from '@/components/ExerciseLibraryPicker';

const formatElapsed = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const formatDate = (date: string) => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(`${date}T00:00:00`));

export default function MobileWorkoutPage() {
  const session = useWorkoutSession();
  const [elapsed, setElapsed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [history, setHistory] = useState<Workout[]>([]);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [restExerciseName, setRestExerciseName] = useState('');
  const restRunning = useRef(false);
  const activeStartedAt = session.active?.startedAt;

  useEffect(() => {
    if (!activeStartedAt) {
      setElapsed(0);
      return;
    }
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(activeStartedAt).getTime()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [activeStartedAt]);

  const volume = useMemo(
    () =>
      session.active?.exercises
        .flatMap((item) => item.sets)
        .filter((set) => set.completed)
        .reduce((sum, set) => sum + set.weight * set.reps, 0) || 0,
    [session.active],
  );

  useEffect(() => {
    if (session.active) return;
    Promise.all([workoutsApi.getWorkouts(20, 'completed'), workoutsApi.getStats('30d')])
      .then(([rows, summary]) => {
        setHistory(rows as Workout[]);
        setStats(summary as WorkoutStats);
      })
      .catch(() => {});
  }, [session.active?.id, session.completed?.id]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const timer = window.setInterval(() => setRestLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restLeft > 0]);

  useEffect(() => {
    if (restLeft !== 0 || !restRunning.current) return;
    restRunning.current = false;
    sendWorkoutReminder('休息结束', `${restExerciseName}可以开始下一组了`, 'mobile-rest-finished');
  }, [restLeft, restExerciseName]);

  const createAIPlans = async () => {
    setAiGenerating(true);
    try {
      requestReminderPermission();
      const generated = (await planGeneratorApi.workout({
        goal: '增肌',
        level: '初级',
        equipment: '健身房器械',
        days: 3,
      })) as { plans: Array<any> };
      await Promise.all(
        generated.plans.map((plan) =>
          workoutPlansApi.createPlan({
            ...plan,
            reminderEnabled: plan.weekday !== undefined,
            reminderTime: '18:00',
          }),
        ),
      );
      await session.refresh();
    } catch (error: any) {
      session.setError(error.message || 'AI 计划生成失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const toggleSetWithReminder = (exerciseId: string, setId: string) => {
    const exercise = session.active?.exercises.find((item) => item.id === exerciseId);
    const set = exercise?.sets.find((item) => item.id === setId);
    session.toggleSet(exerciseId, setId);
    if (!set?.completed && exercise) {
      restRunning.current = true;
      setRestExerciseName(exercise.exerciseName);
      setRestLeft(exercise.restSeconds);
    }
  };

  if (session.loading)
    return (
      <div className="min-h-[70dvh] flex items-center justify-center text-sm text-dark-500">
        <Dumbbell className="w-5 h-5 mr-2 animate-pulse" />
        正在准备训练
      </div>
    );

  if (session.completed)
    return (
      <div className="min-h-[calc(100dvh-116px)] bg-dark-950 flex items-center justify-center p-5 text-center text-white">
        <div>
          <span className="w-20 h-20 rounded-full bg-accent-400 text-dark-950 flex items-center justify-center mx-auto">
            <Trophy className="w-10 h-10" />
          </span>
          <p className="font-hand text-3xl text-accent-400 mt-6">workout complete!</p>
          <h2 className="font-display text-4xl mt-2">训练已保存</h2>
          <p className="text-primary-200 mt-3">
            {session.completed.completedSets} 组 · {session.completed.totalVolume.toLocaleString()} kg
          </p>
          {!!session.completed.newRecords?.length && (
            <div className="mt-6 bg-white/10 rounded-2xl p-4 text-left">
              <p className="text-accent-400 text-xs font-bold">🏆 新纪录</p>
              {session.completed.newRecords.map((record) => (
                <p key={record.id} className="mt-2">
                  {record.exerciseName} {record.weight}kg × {record.reps}
                </p>
              ))}
            </div>
          )}
          <button onClick={() => session.setCompleted(null)} className="btn-accent min-h-14 w-full mt-8">
            完成
          </button>
        </div>
      </div>
    );

  if (!session.active)
    return (
      <div className="min-h-full px-4 pt-5 pb-8 bg-dark-100">
        <div className="mb-5">
          <p className="text-xs text-primary-500 font-bold">TODAY</p>
          <h1 className="font-display text-3xl text-dark-950 mt-1">今天练什么？</h1>
          <p className="text-sm text-dark-500 mt-1">选好计划，直接开练</p>
        </div>
        {session.error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm">{session.error}</div>}
        {session.todayPlan && (
          <section className="mobile-ticket bg-dark-950 text-white p-5 mb-4">
            <p className="text-xs text-accent-400 font-bold">今日计划</p>
            <h2 className="font-display text-3xl mt-2">{session.todayPlan.name}</h2>
            <p className="text-sm text-primary-200 mt-1">{session.todayPlan.focus}</p>
            <div className="flex flex-wrap gap-2 my-5">
              {session.todayPlan.exercises.slice(0, 5).map((item) => (
                <span key={item.exerciseId} className="text-xs bg-white/10 rounded-full px-2.5 py-1">
                  {item.exerciseName}
                </span>
              ))}
            </div>
            <button onClick={() => session.start(session.todayPlan!)} className="btn-accent w-full min-h-14">
              开始今日计划 <ChevronRight className="w-4 h-4" />
            </button>
          </section>
        )}
        <button onClick={() => session.start()} className="mobile-ticket w-full bg-white p-5 text-left flex items-center gap-4 active:scale-[.99] transition-transform">
          <span className="w-12 h-12 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </span>
          <span className="flex-1">
            <strong className="font-display text-lg text-dark-950 block">开始自由训练</strong>
            <small className="text-dark-500">边练边添加动作</small>
          </span>
          <ChevronRight className="w-5 h-5 text-dark-400" />
        </button>
        <section className="mt-7">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-xl text-dark-950">训练计划</h2>
            <button onClick={createAIPlans} disabled={aiGenerating} className="min-h-10 px-3 rounded-xl bg-primary-50 text-primary-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
              {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              AI 创建
            </button>
          </div>
          {!!session.plans.length ? (
            <div className="space-y-3">
              {session.plans
                .filter((plan) => plan.id !== session.todayPlan?.id)
                .map((plan) => (
                  <button key={plan.id} onClick={() => session.start(plan)} className="mobile-ticket w-full bg-white p-4 text-left flex items-center justify-between">
                    <div>
                      <strong className="text-dark-900">{plan.name}</strong>
                      <p className="text-xs text-dark-500 mt-1">{plan.focus || `${plan.exercises.length} 个动作`}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-primary-400" />
                  </button>
                ))}
            </div>
          ) : (
            <p className="mobile-ticket bg-white p-4 text-sm text-dark-500">还没有计划，可以让 AI 一键创建 Push / Pull / Legs。</p>
          )}
        </section>
        <section className="mt-7">
          <h2 className="font-display text-xl text-dark-950 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            最近进步
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="mobile-ticket bg-white p-3">
              <p className="text-[10px] text-dark-500">30天训练</p>
              <p className="font-anton text-2xl mt-2">
                {stats?.totalWorkouts || 0}
                <span className="text-xs ml-1">次</span>
              </p>
            </div>
            <div className="mobile-ticket bg-white p-3">
              <p className="text-[10px] text-dark-500">连续训练</p>
              <p className="font-anton text-2xl mt-2">
                {stats?.streakDays || 0}
                <span className="text-xs ml-1">天</span>
              </p>
            </div>
            <div className="mobile-ticket bg-white p-3">
              <p className="text-[10px] text-dark-500">训练容量</p>
              <p className="font-anton text-xl mt-2">{Math.round(stats?.totalVolume || 0).toLocaleString()}</p>
            </div>
          </div>
        </section>
        <section className="mt-7">
          <h2 className="font-display text-xl text-dark-950 mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-primary-500" />
            训练历史
          </h2>
          {history.length ? (
            <div className="space-y-3">
              {history.slice(0, 5).map((workout) => (
                <div key={workout.id} className="mobile-ticket bg-white p-4 flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-dark-950 text-white flex items-center justify-center font-anton">{new Date(`${workout.date}T00:00:00`).getDate()}</span>
                  <div className="min-w-0 flex-1">
                    <strong className="text-dark-900 block truncate">{workout.name}</strong>
                    <p className="text-xs text-dark-500 mt-1">
                      {workout.completedSets} 组 · {Math.round(workout.totalVolume).toLocaleString()} kg · {workout.durationMinutes} 分钟
                    </p>
                  </div>
                  <BarChart3 className="w-4 h-4 text-dark-300" />
                </div>
              ))}
            </div>
          ) : (
            <p className="mobile-ticket bg-white p-4 text-sm text-dark-500">完成第一场训练后，每次记录都会保存在这里。</p>
          )}
        </section>
      </div>
    );

  return (
    <div className="min-h-full bg-dark-100 pb-[104px]">
      <header className="bg-dark-950 text-white px-4 pt-5 pb-6 border-b-4 border-accent-400">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-accent-400 font-bold">今天 · {session.active.name}</p>
            <h1 className="font-display text-3xl mt-1">训练进行中</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-primary-200">训练时间</p>
            <p className="font-anton text-3xl text-accent-400 tabular-nums mt-1">{formatElapsed(elapsed)}</p>
          </div>
        </div>
        <div className="flex gap-4 mt-4 text-xs text-primary-200">
          <span>{session.completedSets} 组完成</span>
          <span>{volume.toLocaleString()} kg 容量</span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Save className="w-3 h-3" />
            {session.saving ? '保存中' : '已保存'}
          </span>
        </div>
      </header>

      {session.error && (
        <div className="mx-4 mt-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm flex justify-between">
          <span>{session.error}</span>
          <button onClick={() => session.setError('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="px-3 py-4 space-y-4">
        {session.active.exercises.map((exercise) => {
          const last = session.lastByExercise[exercise.exerciseId];
          return (
            <section key={exercise.id} className="mobile-ticket bg-white overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-dark-200">
                <h2 className="font-display text-2xl text-dark-950">{exercise.exerciseName}</h2>
                <div className="text-xs text-dark-500 mt-1.5">
                  <span className="font-bold text-primary-600">上次：</span>
                  {last?.sets?.length ? last.sets.map((set) => `${set.weight}kg × ${set.reps}`).join(' · ') : '暂无记录'}
                </div>
                {last?.date && <p className="text-[10px] text-dark-400 mt-1">{formatDate(last.date)}</p>}
              </div>
              <div className="p-3 space-y-2">
                {exercise.sets.map((set, index) => (
                  <div key={set.id} className={`grid grid-cols-[34px_1fr_1fr_54px] items-center gap-2 p-1.5 rounded-xl ${set.completed ? 'bg-green-50' : 'bg-dark-100'}`}>
                    <span className="font-anton text-center text-dark-400">{index + 1}</span>
                    <label className="relative">
                      <input
                        aria-label={`${exercise.exerciseName}第${index + 1}组重量`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.5"
                        value={set.weight || ''}
                        placeholder="0"
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) =>
                          session.updateSet(exercise.id, set.id, {
                            weight: event.target.value === '' ? 0 : Number(event.target.value),
                          })
                        }
                        className="w-full h-14 rounded-xl border-2 border-dark-300 bg-white pl-2 pr-7 text-center font-anton text-xl text-dark-950 outline-none focus:border-primary-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-dark-400">kg</span>
                    </label>
                    <label className="relative">
                      <input
                        aria-label={`${exercise.exerciseName}第${index + 1}组次数`}
                        type="number"
                        inputMode="numeric"
                        min="0"
                        step="1"
                        value={set.reps || ''}
                        placeholder="0"
                        onFocus={(event) => event.currentTarget.select()}
                        onChange={(event) =>
                          session.updateSet(exercise.id, set.id, {
                            reps: event.target.value === '' ? 0 : Number(event.target.value),
                          })
                        }
                        className="w-full h-14 rounded-xl border-2 border-dark-300 bg-white pl-2 pr-7 text-center font-anton text-xl text-dark-950 outline-none focus:border-primary-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-dark-400">次</span>
                    </label>
                    <button aria-label={`${set.completed ? '取消' : '完成'}第${index + 1}组`} onClick={() => toggleSetWithReminder(exercise.id, set.id)} className={`w-[54px] h-14 rounded-xl border-2 flex items-center justify-center active:scale-90 transition-transform ${set.completed ? 'bg-vibe-green border-dark-950 text-dark-950 shadow-[2px_2px_0_#0A1A2F]' : 'bg-white border-dark-300 text-dark-300'}`}>
                      <Check className="w-7 h-7" strokeWidth={3} />
                    </button>
                  </div>
                ))}
                <button onClick={() => session.addSet(exercise.id)} className="w-full min-h-12 rounded-xl border-2 border-dashed border-primary-300 text-primary-600 font-bold flex items-center justify-center gap-2 active:bg-primary-50">
                  <Plus className="w-4 h-4" />
                  添加一组 <span className="text-xs font-normal text-dark-400">复制上一组</span>
                </button>
              </div>
            </section>
          );
        })}
        {!session.active.exercises.length && (
          <div className="mobile-ticket bg-white px-5 py-10 text-center">
            <Dumbbell className="w-10 h-10 mx-auto text-primary-300" />
            <h2 className="font-display text-xl text-dark-950 mt-3">添加第一个动作</h2>
            <p className="text-sm text-dark-500 mt-1">动作会自动带出你的上次成绩</p>
            <button onClick={() => setPickerOpen(true)} className="btn-primary min-h-12 mt-5">
              <Plus className="w-4 h-4" />
              添加动作
            </button>
          </div>
        )}
      </div>

      {restLeft > 0 && (
        <div className="fixed z-50 left-3 right-3 bottom-[calc(142px+env(safe-area-inset-bottom))] bg-dark-950 text-white border-2 border-accent-400 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
          <Clock3 className="w-6 h-6 text-accent-400" />
          <div className="flex-1">
            <p className="text-[10px] text-primary-200">{restExerciseName} · 下一组倒计时</p>
            <p className="font-anton text-3xl text-accent-400 tabular-nums">
              {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, '0')}
            </p>
          </div>
          <button onClick={() => setRestLeft((value) => value + 30)} className="min-h-10 px-3 rounded-xl bg-white/10 text-xs">
            +30秒
          </button>
          <button
            onClick={() => {
              restRunning.current = false;
              setRestLeft(0);
            }}
            className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
            aria-label="跳过休息"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="fixed left-0 right-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-40 bg-white/95 backdrop-blur border-t border-dark-200 p-3 grid grid-cols-2 gap-3 shadow-[0_-8px_24px_rgba(10,26,47,.12)]">
        <button onClick={() => setPickerOpen(true)} className="min-h-14 rounded-2xl bg-primary-50 text-primary-700 font-bold flex items-center justify-center gap-2 active:scale-95">
          <Plus className="w-5 h-5" />
          添加动作
        </button>
        <button disabled={!session.completedSets} onClick={() => setConfirmFinish(true)} className="min-h-14 rounded-2xl bg-accent-400 text-dark-950 border-2 border-dark-950 shadow-[0_3px_0_#B8860B] font-display flex items-center justify-center gap-2 active:translate-y-0.5 disabled:opacity-40">
          <Trophy className="w-5 h-5" />
          结束训练
        </button>
      </div>

      {pickerOpen && (
        <ExerciseLibraryPicker
          exercises={session.exercises}
          selectedIds={session.active?.exercises.map((item) => item.exerciseId) || []}
          onSelect={async (exercise) => {
            await session.addExercise(exercise);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {confirmFinish && (
        <div className="fixed inset-0 z-[75] bg-dark-950/65 flex items-end">
          <div className="w-full bg-white rounded-t-[28px] border-t-2 border-dark-950 p-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center">
                <Clock3 className="w-6 h-6" />
              </span>
              <div>
                <h2 className="font-display text-2xl">结束本次训练？</h2>
                <p className="text-sm text-dark-500">
                  {formatElapsed(elapsed)} · {session.completedSets} 组 · {volume.toLocaleString()} kg
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setConfirmFinish(false)} className="btn-secondary min-h-12">
                继续训练
              </button>
              <button
                onClick={async () => {
                  const result = await session.finish();
                  if (result) setConfirmFinish(false);
                }}
                className="btn-accent min-h-12"
              >
                保存并结束
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
