import { Link } from 'react-router-dom';
import { ArrowRight, Bot, CalendarDays, ChevronRight, Dumbbell, Flame, Play, Utensils } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function MobileHomePage() {
  const { user } = useAuthStore();
  const { loading, isLoggedIn, workout, plan, stats, meals, targets, aiAdvice } = useDashboardData();
  const exercises = workout
    ? workout.exercises.map(exercise => ({ key: exercise.id, name: exercise.exerciseName }))
    : plan
      ? plan.exercises.map(exercise => ({ key: exercise.exerciseId, name: exercise.exerciseName }))
      : [];
  const caloriesProgress = Math.min(100, (meals.calories / Math.max(targets.calories, 1)) * 100);

  return (
    <div className="min-h-full bg-[#F4F6FA] px-4 pt-5 pb-7">
      <header className="mb-5">
        <p className="text-xs text-dark-500">今天也要稳稳进步</p>
        <h1 className="font-display text-2xl text-dark-950 mt-1">{user?.nickname ? `${user.nickname}，准备好了吗？` : '你的今日训练'}</h1>
      </header>

      {!isLoggedIn ? (
        <section className="mobile-ticket bg-dark-950 text-white p-5">
          <p className="text-xs font-bold text-accent-400">FITZONE TRAINING</p>
          <h2 className="font-display text-3xl mt-2">登录后开始记录</h2>
          <p className="text-sm text-primary-200 mt-2">训练、饮食和 AI 建议会同步到你的账号。</p>
          <Link to="/login" className="btn-accent w-full min-h-12 mt-6">登录 / 注册 <ArrowRight className="w-4 h-4" /></Link>
        </section>
      ) : loading ? (
        <div className="mobile-ticket bg-white h-64 animate-pulse" />
      ) : (
        <>
          <section className="mobile-ticket bg-dark-950 text-white p-5 relative overflow-hidden">
            <div className="absolute -right-7 -top-5 w-28 h-28 rounded-full border-[16px] border-white/[0.04]" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-accent-400 font-bold"><Dumbbell className="w-4 h-4" />今日训练</span>
                <span className="text-[11px] text-primary-200">{workout?.status === 'in_progress' ? '进行中' : workout ? '已完成' : plan ? '已安排' : '自由训练'}</span>
              </div>
              <h2 className="font-display text-3xl mt-4">{workout?.name || plan?.name || '自由训练'}</h2>
              <div className="space-y-2 mt-4 min-h-10">
                {exercises.slice(0, 4).map(exercise => <div key={exercise.key} className="flex items-center gap-2 text-sm text-primary-100"><span className="w-1.5 h-1.5 rounded-full bg-accent-400" />{exercise.name}</div>)}
                {!exercises.length && <p className="text-sm text-primary-200">进入训练后，一键添加今天的动作</p>}
              </div>
              <Link to="/workout" className="btn-accent w-full min-h-14 mt-5 text-base"><Play className="w-5 h-5 fill-current" />{workout?.status === 'in_progress' ? '继续训练' : '开始训练'}</Link>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 mt-4">
            <div className="mobile-ticket bg-white p-4"><CalendarDays className="w-5 h-5 text-primary-500" /><p className="text-xs text-dark-500 mt-4">本周训练</p><p className="font-anton text-3xl text-dark-950 mt-1">{stats?.thisWeekWorkouts || 0}<span className="text-sm text-dark-400"> / 5</span></p></div>
            <div className="mobile-ticket bg-white p-4"><Flame className="w-5 h-5 text-vibe-orange" /><p className="text-xs text-dark-500 mt-4">连续训练</p><p className="font-anton text-3xl text-dark-950 mt-1">{stats?.streakDays || 0}<span className="text-sm text-dark-400 ml-1">天</span></p></div>
          </section>

          <Link to="/meal-plan" className="mobile-ticket bg-white p-4 mt-4 block active:scale-[.99] transition-transform">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="w-9 h-9 rounded-xl bg-green-50 text-vibe-green flex items-center justify-center"><Utensils className="w-4 h-4" /></span><div><p className="font-bold text-sm text-dark-900">今日饮食</p><p className="text-xs text-dark-500 mt-0.5">蛋白质 {Math.round(meals.protein)}g</p></div></div><div className="text-right"><p className="font-anton text-xl text-dark-950">{Math.round(meals.calories)} <span className="text-xs text-dark-400">/ {targets.calories}</span></p><p className="text-[10px] text-dark-400">kcal</p></div></div>
            <div className="h-2 rounded-full bg-dark-200 overflow-hidden mt-4"><div className="h-full rounded-full bg-vibe-green" style={{ width: `${caloriesProgress}%` }} /></div>
          </Link>

          <Link to="/ai-coach" className="mobile-ticket bg-primary-50 border-primary-200 p-4 mt-4 flex items-start gap-3 active:scale-[.99] transition-transform">
            <span className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shrink-0"><Bot className="w-5 h-5" /></span>
            <div className="min-w-0 flex-1"><div className="flex items-center justify-between"><p className="font-bold text-sm text-primary-900">AI 建议</p><ChevronRight className="w-4 h-4 text-primary-400" /></div><p className="text-sm text-primary-800 leading-relaxed mt-1">“{aiAdvice}”</p></div>
          </Link>
        </>
      )}
    </div>
  );
}
