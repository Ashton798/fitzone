import { useEffect, useMemo, useState } from 'react';
import { getToken, mealsApi, workoutPlansApi, workoutsApi } from '@/lib/api';
import { calcNutritionTargets, loadNutritionProfile } from '@/lib/nutrition';
import type { Workout, WorkoutPlan, WorkoutStats } from '@/types';

const localDateKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

type MealSummary = { calories: number; protein: number };
type MealRow = { eaten?: boolean; calories?: number; protein?: number };

export function useDashboardData() {
  const [loading, setLoading] = useState(!!getToken());
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [meals, setMeals] = useState<MealSummary>({ calories: 0, protein: 0 });
  const targets = useMemo(() => calcNutritionTargets(loadNutritionProfile()), []);

  useEffect(() => {
    if (!getToken()) return;
    const today = localDateKey();
    let active = true;
    Promise.all([
      workoutsApi.getActiveWorkout(), workoutsApi.getWorkouts(20, 'completed'),
      workoutPlansApi.getPlans(), workoutsApi.getStats('30d'), mealsApi.getMeals(today),
    ]).then(results => {
      if (!active) return;
      const activeWorkout = results[0] as Workout | null;
      const history = results[1] as Workout[];
      const plans = results[2] as WorkoutPlan[];
      const workoutStats = results[3] as WorkoutStats;
      const mealRows = results[4] as MealRow[];
      const current = activeWorkout || history.find((item: Workout) => item.date === today) || null;
      const scheduled = plans.find((item: WorkoutPlan) => item.weekday === new Date().getDay()) || null;
      const eaten = mealRows.filter(meal => meal.eaten !== false);
      setWorkout(current);
      setPlan(scheduled);
      setStats(workoutStats);
      setMeals({
        calories: eaten.reduce((sum, meal) => sum + Number(meal.calories || 0), 0),
        protein: eaten.reduce((sum, meal) => sum + Number(meal.protein || 0), 0),
      });
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const aiAdvice = useMemo(() => {
    const remaining = Math.max(0, targets.calories - meals.calories);
    if (workout?.status === 'in_progress') return '训练正在进行，组间补水，复合动作保留 1–2 次余力。';
    if (plan && meals.calories < targets.calories * 0.5) return `今天安排了${plan.name}，训练前可补充易消化的碳水和 20–30g 蛋白质。`;
    if (remaining > 500) return `今天还可摄入约 ${remaining} kcal，优先补足蛋白质和蔬菜。`;
    return '今日摄入接近目标，晚间注意补水和睡眠，为下一次训练恢复。';
  }, [meals.calories, plan, targets.calories, workout?.status]);

  return { loading, isLoggedIn: !!getToken(), workout, plan, stats, meals, targets, aiAdvice };
}
