import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Play, ArrowRight, Bot, Flame, TrendingUp, ChevronRight,
  Footprints, Timer, HeartPulse, Activity, Sparkles, CheckCircle2, Zap, Target, Dumbbell, CalendarDays, Utensils,
} from 'lucide-react';
import CategoryCard from '@/components/CategoryCard';
import VideoCard from '@/components/VideoCard';
import PostCard from '@/components/PostCard';
import { categories } from '@/data/categories';
import { videos } from '@/data/videos';
import { getToken, mealsApi, postsApi, workoutPlansApi, workoutsApi } from '@/lib/api';
import type { Workout, WorkoutPlan, WorkoutStats } from '@/types';
import { useAppStore } from '@/store/appStore';

/* ============================================================
   滚动入场 - IntersectionObserver
   ============================================================ */
const useReveal = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    el.querySelectorAll('.reveal').forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  return ref;
};

/* ============================================================
   数字滚动
   ============================================================ */
const useCountUp = (target: number, active: boolean, duration = 1400) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
};

/* ============================================================
   能量圆装饰(替换原杠铃片,更贴合海报风)
   ============================================================ */
const EnergyCircle = ({ size = 64, className = '', yellow = false }: { size?: number; className?: string; yellow?: boolean }) => (
  <div
    className={`rounded-full ${yellow ? 'bg-accent-400' : 'bg-primary-500'} ${className}`}
    style={{ width: size, height: size, boxShadow: 'inset 0 0 0 6px rgba(255,255,255,0.25), 0 0 40px rgba(47,107,255,0.25)' }}
  />
);

/* ============================================================ */
const Home = () => {
  const { posts: localPosts } = useAppStore();
  const featuredVideos = videos.slice(0, 4);
  const [hotPosts, setHotPosts] = useState<any[]>(localPosts.slice(0, 3));
  const [workoutSnapshot, setWorkoutSnapshot] = useState<{
    workout: Workout | null; plan: WorkoutPlan | null; stats: WorkoutStats | null; calories: number; protein: number;
  } | null>(null);
  const revealRef = useReveal();

  // 社区热帖取真实后端(游客可看),失败时用本地预设
  useEffect(() => {
    let mounted = true;
    postsApi
      .getPosts('new')
      .then((list: any[]) => {
        if (!mounted) return;
        const adapted = list.slice(0, 3).map((p: any) => ({
          id: p.id,
          userId: p.user_id || p.userId,
          userName: p.nickname || '健身用户',
          userAvatar: p.avatar || '',
          content: p.content,
          images: p.images || [],
          likes: p.likes || 0,
          comments: p.comments || 0,
          shares: p.shares || 0,
          tags: p.tags || [],
          createdAt: p.created_at || p.createdAt,
          isLiked: !!p.isLiked,
        }));
        if (adapted.length > 0) setHotPosts(adapted);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    Promise.all([
      workoutsApi.getActiveWorkout(), workoutsApi.getWorkouts(20, 'completed'),
      workoutPlansApi.getPlans(), workoutsApi.getStats('30d'), mealsApi.getMeals(today),
    ]).then(([active, history, plans, workoutStats, meals]: any[]) => {
      const todayWorkout = active || history.find((item: Workout) => item.date === today) || null;
      const todayPlan = plans.find((item: WorkoutPlan) => item.weekday === new Date().getDay()) || null;
      const eaten = meals.filter((meal: any) => meal.eaten !== false);
      setWorkoutSnapshot({
        workout: todayWorkout, plan: todayPlan, stats: workoutStats,
        calories: eaten.reduce((sum: number, meal: any) => sum + Number(meal.calories || 0), 0),
        protein: eaten.reduce((sum: number, meal: any) => sum + Number(meal.protein || 0), 0),
      });
    }).catch(() => {});
  }, []);

  const [statsVisible, setStatsVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStatsVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  const stats = [
    { icon: Zap, value: 500, suffix: '+', label: '专业课程' },
    { icon: Activity, value: 52, suffix: '万', label: '注册用户' },
    { icon: Flame, value: 1240, suffix: '万', label: '累计训练分钟' },
    { icon: TrendingUp, value: 98, suffix: '%', label: '用户好评' },
  ];

  const todayMetrics = [
    { icon: Footprints, value: 8420, target: 10000, unit: '步', label: '步数', color: '#2F6BFF', tag: 'STEPS' },
    { icon: Flame, value: 412, target: 600, unit: '千卡', label: '卡路里', color: '#FF6B4D', tag: 'KCAL' },
    { icon: Timer, value: 38, target: 60, unit: '分钟', label: '活动时长', color: '#2FD673', tag: 'MINS' },
    { icon: HeartPulse, value: 72, target: 100, unit: 'bpm', label: '心率', color: '#FFC93C', tag: 'BPM' },
  ];

  const StatItem = ({ stat, index }: { stat: typeof stats[0]; index: number }) => {
    const count = useCountUp(stat.value, statsVisible);
    return (
      <div
        className={`transition-all duration-700 ${
          statsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        style={{ transitionDelay: `${index * 90}ms` }}
      >
        <div className="flex items-baseline gap-1.5">
          <span className="font-anton text-3xl md:text-4xl text-white leading-none">
            {stat.value >= 1000 ? count.toLocaleString() : count}
            <span className="text-accent-400 text-2xl md:text-3xl">{stat.suffix}</span>
          </span>
        </div>
        <p className="text-xs text-primary-300 mt-1.5 tracking-wide">{stat.label}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-100" ref={revealRef}>
      {/* ============ HERO - 深蓝运动风 ============ */}
      <section className="relative overflow-hidden hero-gradient">
        {/* 微光网格 */}
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        {/* 斜切底部过渡 */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-dark-100" style={{ transform: 'skewY(-2deg) scale(1.02)', transformOrigin: 'bottom left' }} />

        <div className="container mx-auto px-4 pt-20 pb-32 md:pt-24 md:pb-36 relative z-10">
          <div className="grid lg:grid-cols-12 gap-14 items-center">
            {/* 左侧文案 */}
            <div className="lg:col-span-7">
              <div className="animate-slide-up flex flex-wrap items-center gap-3 mb-7">
                <span className="sticker text-sm px-3.5 py-1.5">
                  💪 科学训练 · 数据驱动
                </span>
                <span className="font-hand text-2xl text-primary-300 -rotate-3">
                  let's get strong!
                </span>
              </div>

              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-[1.12]">
                练就更好的
                <span className="relative inline-block mx-2">
                  <span className="gradient-text">自己</span>
                  <svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 120 10" preserveAspectRatio="none">
                    <path d="M2 8 Q 30 2, 60 6 T 118 4" fill="none" stroke="#FFC93C" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
                <br />
                每一滴汗都算数
              </h1>

              <p className="text-primary-200/90 text-base md:text-lg mb-9 max-w-xl leading-relaxed">
                专业视频课程覆盖全品类，AI 教练为你定制训练计划，
                社区陪你坚持到底。今天流的汗，明天就是你的铠甲。
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <Link to="/videos" className="btn-accent text-base px-8 py-4">
                  <Play className="w-5 h-5 fill-current" />
                  开始训练
                </Link>
                <Link to="/ai-coach" className="btn-outlined-light text-base px-7 py-4">
                  <Bot className="w-5 h-5" />
                  体验 AI 教练
                </Link>
              </div>

              {/* 平台数据 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl">
                {stats.map((stat, index) => (
                  <StatItem key={index} stat={stat} index={index} />
                ))}
              </div>
            </div>

            {/* 右侧视觉 - 原创能量海报卡(非照片,风格与全站统一) */}
            <div className="lg:col-span-5 relative">
              <div className="relative animate-pop-in">
                <div className="absolute -inset-3 border-2 border-accent-400/60 rounded-[30px] rotate-2 pointer-events-none" />

                {/* 海报卡主体 */}
                <div className="relative rounded-[26px] border-2 border-white/15 shadow-2xl shadow-black/40 aspect-[4/5] overflow-hidden poster-energy group">
                  {/* 深蓝渐变底 + 网格 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#102A52] via-[#0C2145] to-[#0A1A2F]" />
                  <div className="absolute inset-0 bg-grid opacity-30" />
                  {/* 光斑装饰 */}
                  <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-primary-500/25 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-accent-400/15 blur-3xl pointer-events-none" />
                  {/* 大能量圆 */}
                  <div className="absolute -top-14 -right-12 w-48 h-48 md:w-56 md:h-56 rounded-full bg-accent-400/90 border-[10px] border-white/10 float-slow pointer-events-none" />
                  <div className="absolute top-24 -right-6 w-24 h-24 rounded-full border-[10px] border-primary-400/50 float-slower pointer-events-none" />

                  {/* 海报内容 */}
                  <div className="relative h-full flex flex-col justify-between p-7 md:p-8">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-anton text-[11px] tracking-[0.3em] text-primary-200/80">DAILY DOSE</p>
                        <p className="font-anton text-[10px] tracking-[0.3em] text-accent-400 mt-1.5">Nº 08 · SEP</p>
                      </div>
                      <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-anton text-accent-400 text-sm">FZ</div>
                    </div>

                    <div className="text-center">
                      <p className="font-display text-white text-5xl md:text-6xl leading-[1.05] tracking-wide drop-shadow-[0_4px_0_rgba(10,26,47,0.55)]">
                        BE<br />
                        <span className="text-accent-400 drop-shadow-none">STRONG</span>
                      </p>
                      <p className="font-hand text-xl md:text-2xl text-primary-200/90 mt-3 -rotate-2">one more rep, every day</p>
                    </div>

                    <div className="relative">
                      {/* 心率线 */}
                      <svg viewBox="0 0 220 30" className="w-full opacity-90" fill="none">
                        <path
                          className="heartbeat-line"
                          d="M0 15 H60 L70 15 L78 5 L88 25 L96 12 L104 15 H150 L158 15 L168 6 L178 24 L186 13 L194 15 H220"
                          stroke="#FF4D4D"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex items-center justify-between mt-2.5">
                        <span className="font-anton text-[10px] tracking-[0.25em] text-white/60">SWEAT · STAY · STRONG</span>
                        <span className="font-anton text-[10px] text-accent-400 bg-accent-400/10 border border-accent-400/30 rounded px-2 py-0.5">LIVE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 心率卡片(浮动) */}
                <div className="absolute -bottom-10 -left-4 md:-left-8 bg-white rounded-2xl border-2 border-[#0A1A2F] shadow-sport p-4 w-60 hidden md:block float-slower">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-sm text-[#0A1A2F]">今日心率</span>
                    <span className="font-anton text-[10px] text-primary-500 bg-primary-50 rounded px-1.5 py-0.5">LIVE</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-anton text-3xl text-[#0A1A2F]">72</span>
                    <span className="text-xs text-dark-500">bpm · 静息</span>
                  </div>
                  <svg viewBox="0 0 220 44" className="w-full mt-2" fill="none">
                    <path
                      className="heartbeat-line"
                      d="M0 24 H38 L48 24 L56 8 L66 38 L76 18 L84 24 H120 L128 24 L138 10 L148 34 L158 20 L166 24 H220"
                      stroke="#FF4D4D"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 今日训练 + 饮食闭环 ============ */}
      <section className="py-12 md:py-16 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark opacity-50 pointer-events-none" />
        <div className="container mx-auto px-4 relative">
          <div className="flex items-end justify-between gap-4 mb-7">
            <div>
              <p className="font-anton text-xs text-primary-500 tracking-[0.25em] mb-2">TODAY'S ROUTINE</p>
              <h2 className="font-display text-3xl md:text-4xl text-dark-950">今日训练</h2>
            </div>
            <Link to="/workout" className="btn-tonal">训练数据 <ChevronRight className="w-4 h-4" /></Link>
          </div>

          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-5">
            <div className="surface-card bg-dark-950 text-white p-5 md:p-7 relative overflow-hidden">
              <div className="absolute -right-8 -top-10 font-anton text-[110px] text-white/[0.035] leading-none">GO</div>
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-400 text-dark-950 flex items-center justify-center shrink-0"><Dumbbell className="w-6 h-6" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-primary-200">今天 · {workoutSnapshot?.workout?.status === 'in_progress' ? '训练进行中' : workoutSnapshot?.workout ? '已完成' : '等待开练'}</p>
                  <h3 className="font-display text-2xl mt-1">{workoutSnapshot?.workout?.name || workoutSnapshot?.plan?.name || '自由训练'}</h3>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {(workoutSnapshot?.workout?.exercises || workoutSnapshot?.plan?.exercises || []).slice(0, 6).map((exercise: any) => <span key={exercise.id || exercise.exerciseId} className="px-2.5 py-1 rounded-full bg-white/10 text-xs text-primary-100">{exercise.exerciseName}</span>)}
                    {!workoutSnapshot?.workout?.exercises?.length && !workoutSnapshot?.plan?.exercises?.length && <span className="text-sm text-primary-200">动作可在训练页一键添加</span>}
                  </div>
                </div>
              </div>
              <Link to="/workout" className="btn-accent w-full md:w-auto min-h-12 mt-6"><Play className="w-4 h-4 fill-current" />{workoutSnapshot?.workout?.status === 'in_progress' ? '继续训练' : '开始训练'}</Link>
            </div>

            <div className="surface-card bg-white p-5 md:p-6">
              <div className="flex items-center justify-between mb-5"><div><p className="text-xs text-dark-500">本周训练</p><p className="font-anton text-3xl text-dark-950 mt-1">{workoutSnapshot?.stats?.thisWeekWorkouts || 0}<span className="text-sm text-dark-400"> / 5 次</span></p></div><div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-500 flex items-center justify-center"><CalendarDays className="w-5 h-5" /></div></div>
              <div className="h-2.5 rounded-full bg-dark-200 overflow-hidden"><div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(100, ((workoutSnapshot?.stats?.thisWeekWorkouts || 0) / 5) * 100)}%` }} /></div>
              <div className="grid grid-cols-3 gap-2 mt-5 pt-5 border-t border-dark-200">
                <div><p className="text-[10px] text-dark-500">连续训练</p><p className="font-anton text-xl text-dark-950 mt-1">{workoutSnapshot?.stats?.streakDays || 0}<span className="text-xs ml-1">天</span></p></div>
                <div><p className="text-[10px] text-dark-500 flex items-center gap-1"><Utensils className="w-3 h-3" />热量</p><p className="font-anton text-xl text-dark-950 mt-1">{workoutSnapshot?.calories || 0}<span className="text-xs ml-1">kcal</span></p></div>
                <div><p className="text-[10px] text-dark-500">蛋白质</p><p className="font-anton text-xl text-dark-950 mt-1">{workoutSnapshot?.protein || 0}<span className="text-xs ml-1">g</span></p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 今日数据 - 运动数据卡 ============ */}
      <section className="py-16 bg-dark-100">
        <div className="container mx-auto px-4">
          <div className="reveal flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="font-anton text-sm text-primary-500 tracking-[0.25em] mb-2">TODAY'S METRICS</p>
              <h2 className="font-display text-3xl md:text-4xl text-[#0A1A2F]">
                今日训练<span className="skew-tag ml-2 text-xl">数据</span>
              </h2>
            </div>
            <Link to="/profile" className="btn-tonal">
              查看全部数据
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {todayMetrics.map((m, index) => {
              const percent = Math.round((m.value / m.target) * 100);
              return (
                <div
                  key={index}
                  className={`reveal reveal-delay-${index + 1} surface-card p-5 group cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
                      style={{ backgroundColor: `${m.color}1A`, color: m.color }}
                    >
                      <m.icon className="w-5 h-5" />
                    </div>
                    <span className="font-anton text-[10px] text-dark-400 tracking-widest border border-dark-300 rounded px-1.5 py-0.5">
                      {m.tag}
                    </span>
                  </div>
                  <p className="font-anton text-3xl md:text-4xl text-[#0A1A2F] leading-none">
                    {m.value.toLocaleString()}
                    <span className="text-sm font-body font-normal text-dark-500 ml-1">{m.unit}</span>
                  </p>
                  <p className="text-sm text-dark-500 mt-2 mb-3">{m.label} · 目标 {m.target.toLocaleString()}</p>
                  <div className="h-2.5 bg-dark-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 group-hover:brightness-110"
                      style={{ width: `${percent}%`, backgroundColor: m.color, transitionDelay: `${index * 100}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ 训练分类 ============ */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-dark pointer-events-none opacity-60" />
        <div className="container mx-auto px-4 relative">
          <div className="reveal text-center mb-14 max-w-2xl mx-auto">
            <p className="font-anton text-sm text-primary-500 tracking-[0.25em] mb-2">16 CATEGORIES</p>
            <h2 className="font-display text-3xl md:text-5xl text-[#0A1A2F] mb-4">
              找到你的<span className="gradient-text">主场</span>
            </h2>
            <p className="font-hand text-2xl text-primary-400 -rotate-1">
              strength · cardio · yoga · boxing · swimming ...
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className={`reveal reveal-delay-${(index % 4) + 1} transition-all duration-500`}
              >
                <CategoryCard category={category} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 热门课程 ============ */}
      <section className="py-20 bg-dark-100">
        <div className="container mx-auto px-4">
          <div className="reveal flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="font-anton text-sm text-primary-500 tracking-[0.25em] mb-2">HOT CLASSES</p>
              <h2 className="font-display text-3xl md:text-4xl text-[#0A1A2F]">
                本周热门<span className="skew-tag ml-2 text-xl">课程</span>
              </h2>
              <p className="font-hand text-xl text-dark-400 mt-1">pick your poison ↓</p>
            </div>
            <Link to="/videos" className="btn-tonal">
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featuredVideos.map((video, i) => (
              <div key={video.id} className={`reveal reveal-delay-${(i % 4) + 1}`}>
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ AI 教练 CTA - 深蓝块 ============ */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-60" />
        <div className="container mx-auto px-4 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="reveal">
              <div className="inline-flex items-center gap-2 mb-5">
                <span className="sticker sticker-blue text-sm px-3.5 py-1.5">
                  <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                  AI 智能教练
                </span>
              </div>

              <h2 className="font-display text-3xl md:text-5xl text-white mb-5 leading-tight">
                24 小时在线的
                <br />
                <span className="text-accent-400">专属</span>健身教练
              </h2>

              <p className="text-primary-200/90 mb-8 leading-relaxed">
                基于你的训练数据与身体指标，AI 教练为你制定个性化训练计划，
                实时分析动作姿势，解答饮食与恢复疑问。
              </p>

              <ul className="space-y-3.5 mb-9">
                {[
                  { text: '基于数据生成个性化训练计划', icon: Zap },
                  { text: '上传视频即可分析动作姿势', icon: Target },
                  { text: '语音对话实时答疑指导', icon: Sparkles },
                  { text: '饮食营养科学搭配建议', icon: CheckCircle2 },
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-white/90">
                    <span className="w-7 h-7 rounded-lg bg-accent-400 text-[#0A1A2F] flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4" />
                    </span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-4">
                <Link to="/ai-coach" className="btn-accent">
                  <Bot className="w-[18px] h-[18px]" />
                  立即体验
                </Link>
                <Link to="/videos" className="btn-outlined-light">
                  浏览课程
                </Link>
              </div>
            </div>

            {/* AI 对话预览 */}
            <div className="reveal reveal-delay-2 hidden md:block">
              <div className="relative">
                <div className="absolute -inset-3 border-2 border-accent-400/40 rounded-[28px] -rotate-2 pointer-events-none" />
                <div className="bg-white/95 backdrop-blur rounded-[24px] border-2 border-[#0A1A2F] shadow-2xl shadow-black/40 p-6 max-w-md ml-auto relative rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="flex items-center gap-3 pb-4 mb-4 border-b border-dark-200">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-display text-sm text-[#0A1A2F]">FitZone AI 教练</p>
                      <p className="text-[11px] text-accent-600 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-accent-500 rounded-full pulse-dot" />
                        在线 · 平均响应 0.8 秒
                      </p>
                    </div>
                    <span className="ml-auto font-anton text-[10px] text-white bg-[#0A1A2F] rounded px-2 py-1">REPS 01</span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="bg-primary-500 text-white rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[82%]">
                        <p className="text-sm">深蹲时膝盖总是内扣怎么办？</p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-dark-100 text-dark-800 rounded-2xl rounded-tl-md px-4 py-2.5 max-w-[88%] border border-dark-200">
                        <p className="text-sm leading-relaxed">
                          膝盖内扣常见于髋外展肌群力量不足。建议：
                          <br />1. 暂时降低负重，专注动作模式
                          <br />2. 加入弹力带侧步走强化臀中肌
                          <br />3. 蹲下时主动「膝盖向外推」
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-dark-500 pl-1">
                      <Sparkles className="w-3 h-3 text-primary-500" />
                      基于运动科学文献生成
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 社区动态 ============ */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="reveal flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="font-anton text-sm text-primary-500 tracking-[0.25em] mb-2">COMMUNITY</p>
              <h2 className="font-display text-3xl md:text-4xl text-[#0A1A2F]">
                一起练<span className="skew-tag ml-2 text-xl">不孤单</span>
              </h2>
              <p className="font-hand text-xl text-dark-400 mt-1">real people, real sweat ↓</p>
            </div>
            <Link to="/community" className="btn-tonal">
              进入社区
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hotPosts.map((post, i) => (
              <div key={post.id} className={`reveal reveal-delay-${(i % 3) + 1}`}>
                <PostCard post={post} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ 底部 CTA ============ */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />
        <div className="absolute -top-10 -right-16 opacity-25 float-slow">
          <EnergyCircle size={150} yellow />
        </div>
        <div className="absolute -bottom-14 -left-14 opacity-20 float-slower">
          <EnergyCircle size={110} />
        </div>

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="font-hand text-3xl text-accent-400 -rotate-2 mb-4">no pain, no gain 💪</p>
            <h2 className="reveal font-display text-4xl md:text-6xl text-white mb-6 leading-tight">
              今天就开始
              <br />
              你的<em className="not-italic gradient-text">蜕变</em>之旅
            </h2>
            <p className="reveal reveal-delay-1 text-primary-200/90 text-base md:text-lg mb-10 max-w-xl mx-auto">
              免费注册即可解锁全部课程、AI 教练咨询与社区功能。
              让数据见证你的每一次进步。
            </p>
            <div className="reveal reveal-delay-2 flex flex-wrap justify-center gap-4">
              <Link to="/login" className="btn-accent text-base px-9 py-4">
                免费注册
              </Link>
              <Link to="/videos" className="btn-outlined-light text-base px-8 py-4">
                浏览课程
              </Link>
            </div>

            <div className="reveal reveal-delay-3 mt-14 pt-8 border-t border-white/15 grid grid-cols-3 gap-4 max-w-lg mx-auto">
              <div>
                <p className="font-anton text-2xl text-white">7 天</p>
                <p className="text-xs text-primary-300 mt-1">免费试用</p>
              </div>
              <div>
                <p className="font-anton text-2xl text-white">无广告</p>
                <p className="text-xs text-primary-300 mt-1">纯净体验</p>
              </div>
              <div>
                <p className="font-anton text-2xl text-white">随时取消</p>
                <p className="text-xs text-primary-300 mt-1">无绑定</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
