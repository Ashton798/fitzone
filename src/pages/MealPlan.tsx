/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Apple, Beef, Salad, Coffee,
  Trash2, ChevronLeft, ChevronRight,
  Flame, Target, TrendingUp, AlertCircle, Wand2, Loader2, CheckCircle,
  Droplets, Settings2, Sparkles
} from 'lucide-react';
import { mealsApi, nutritionApi, planGeneratorApi } from '@/lib/api';
import { getToken } from '@/lib/api';
import {
  loadNutritionProfile, saveNutritionProfile, calcNutritionTargets,
  ACTIVITY_OPTIONS, GOAL_OPTIONS, NutritionProfile, NutritionTargets,
} from '@/lib/nutrition';

interface Meal {
  id: string;
  date: string;
  meal_type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  description: string;
  image: string;
  eaten: boolean;      // 是否已吃(添加后默认已吃,自动出现在已吃记录)
  eatenAt?: string | null;
}

// ==================== 食物营养估算库（每份大体值）====================
// 每条代表一份常见食物的大致营养，输入名称按关键词拆分匹配后累加
interface FoodItem {
  keywords: string[];
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const FOOD_DB: FoodItem[] = [
  // 肉类
  { keywords: ['鸡腿', '烤鸡腿', '炸鸡腿'], label: '鸡腿', calories: 220, protein: 25, carbs: 0, fat: 13 },
  { keywords: ['鸡胸', '鸡胸肉'], label: '鸡胸肉', calories: 165, protein: 31, carbs: 0, fat: 4 },
  { keywords: ['鸡翅', '烤翅'], label: '鸡翅', calories: 190, protein: 19, carbs: 0, fat: 14 },
  { keywords: ['牛肉', '牛排', '煎牛排'], label: '牛肉', calories: 250, protein: 26, carbs: 0, fat: 15 },
  { keywords: ['猪肉', '猪瘦肉', '红烧肉'], label: '猪肉', calories: 395, protein: 14, carbs: 0, fat: 37 },
  { keywords: ['排骨', '糖醋排骨', '红烧排骨'], label: '排骨', calories: 278, protein: 18, carbs: 8, fat: 20 },
  { keywords: ['鱼肉', '鱼', '清蒸鱼', '煎鱼'], label: '鱼肉', calories: 200, protein: 22, carbs: 0, fat: 12 },
  { keywords: ['虾', '虾仁', '白灼虾'], label: '虾', calories: 100, protein: 24, carbs: 0, fat: 0.3 },
  { keywords: ['鸡蛋', '水煮蛋', '煎蛋', '荷包蛋'], label: '鸡蛋', calories: 70, protein: 6, carbs: 0.6, fat: 5 },
  // 主食
  { keywords: ['米饭', '白饭', '饭', '一碗饭'], label: '米饭', calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { keywords: ['面条', '面', '汤面', '拌面'], label: '面条', calories: 280, protein: 8, carbs: 55, fat: 1 },
  { keywords: ['炒饭', '蛋炒饭'], label: '炒饭', calories: 250, protein: 6, carbs: 38, fat: 8 },
  { keywords: ['盖饭', '盖浇饭', '咖喱饭'], label: '盖饭', calories: 320, protein: 12, carbs: 45, fat: 10 },
  { keywords: ['面包', '全麦面包', '吐司'], label: '面包', calories: 313, protein: 8, carbs: 58, fat: 3 },
  { keywords: ['馒头', '花卷'], label: '馒头', calories: 220, protein: 7, carbs: 45, fat: 1 },
  { keywords: ['包子'], label: '包子', calories: 230, protein: 8, carbs: 40, fat: 5 },
  { keywords: ['饺子', '水饺', '蒸饺'], label: '饺子', calories: 250, protein: 10, carbs: 35, fat: 8 },
  { keywords: ['粥', '白粥', '小米粥'], label: '粥', calories: 70, protein: 1.5, carbs: 15, fat: 0.2 },
  { keywords: ['燕麦', '麦片'], label: '燕麦', calories: 150, protein: 6, carbs: 26, fat: 3 },
  { keywords: ['玉米'], label: '玉米', calories: 110, protein: 4, carbs: 24, fat: 1.2 },
  { keywords: ['红薯', '地瓜', '烤红薯'], label: '红薯', calories: 130, protein: 2, carbs: 30, fat: 0.2 },
  { keywords: ['土豆', '马铃薯'], label: '土豆', calories: 90, protein: 2.5, carbs: 21, fat: 0.1 },
  { keywords: ['寿司', '饭团'], label: '寿司', calories: 150, protein: 5, carbs: 30, fat: 1 },
  // 西式快餐
  { keywords: ['汉堡', '汉堡包', '吉士堡'], label: '汉堡', calories: 295, protein: 17, carbs: 24, fat: 14 },
  { keywords: ['披萨', '比萨', 'pizza'], label: '披萨', calories: 266, protein: 11, carbs: 33, fat: 10 },
  { keywords: ['薯条', '炸薯条'], label: '薯条', calories: 312, protein: 3.4, carbs: 41, fat: 15 },
  { keywords: ['三明治'], label: '三明治', calories: 250, protein: 12, carbs: 30, fat: 9 },
  // 蔬菜/豆制品/奶制品
  { keywords: ['蔬菜', '青菜', '西兰花', '炒青菜'], label: '蔬菜', calories: 35, protein: 2, carbs: 7, fat: 0.2 },
  { keywords: ['沙拉', '沙辣', '蔬菜沙拉'], label: '沙拉', calories: 120, protein: 3, carbs: 10, fat: 8 },
  { keywords: ['豆腐', '麻婆豆腐'], label: '豆腐', calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { keywords: ['牛奶', '鲜奶'], label: '牛奶', calories: 54, protein: 3, carbs: 3.4, fat: 3.2 },
  { keywords: ['酸奶', '优格'], label: '酸奶', calories: 72, protein: 2.5, carbs: 9.3, fat: 2.7 },
  { keywords: ['豆浆'], label: '豆浆', calories: 30, protein: 3, carbs: 1.2, fat: 1.6 },
  // 水果
  { keywords: ['苹果'], label: '苹果', calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { keywords: ['香蕉'], label: '香蕉', calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { keywords: ['橙子', '橙'], label: '橙子', calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
  { keywords: ['坚果', '杏仁', '核桃'], label: '坚果', calories: 200, protein: 7, carbs: 7, fat: 18 },
];

// 根据食物名称大体估算营养（拆分关键词累加，无匹配时按常见一餐兜底）
const estimateNutrition = (name: string): { calories: number; protein: number; carbs: number; fat: number; matched: string[] } => {
  const result = { calories: 0, protein: 0, carbs: 0, fat: 0, matched: [] as string[] };
  const matchedLabels = new Set<string>();
  for (const food of FOOD_DB) {
    if (food.keywords.some(kw => name.includes(kw))) {
      result.calories += food.calories;
      result.protein += food.protein;
      result.carbs += food.carbs;
      result.fat += food.fat;
      matchedLabels.add(food.label);
    }
  }
  result.matched = Array.from(matchedLabels);

  // 份量调整
  let multiplier = 1;
  if (/大份|超大|双份|两份|加量|多吃/.test(name)) multiplier = 1.5;
  else if (/小份|半份|少量|少吃|几分之/.test(name)) multiplier = 0.6;
  else if (/一份|一盘|一碗|一个/.test(name)) multiplier = 1;

  if (multiplier !== 1) {
    result.calories = Math.round(result.calories * multiplier);
    result.protein = Math.round(result.protein * multiplier * 10) / 10;
    result.carbs = Math.round(result.carbs * multiplier * 10) / 10;
    result.fat = Math.round(result.fat * multiplier * 10) / 10;
  } else {
    // 整数化，去掉小数噪音
    result.protein = Math.round(result.protein * 10) / 10;
    result.carbs = Math.round(result.carbs * 10) / 10;
    result.fat = Math.round(result.fat * 10) / 10;
  }

  // 无任何匹配：按一份普通正餐兜底大体估算
  if (result.matched.length === 0) {
    result.calories = 350;
    result.protein = 15;
    result.carbs = 45;
    result.fat = 12;
    result.matched = ['按普通正餐估算'];
  }

  return result;
};

const MealPlan = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meals, setMeals] = useState<Meal[]>([]);
  const [, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  const [newMeal, setNewMeal] = useState({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    description: '',
  });
  // 智能营养估算提示
  const [estimateHint, setEstimateHint] = useState('');
  const [estimating, setEstimating] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPreferences, setAiPreferences] = useState('家常、容易准备、高蛋白');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [notice, setNotice] = useState('');

  // ===== 个人营养档案(按个人情况定制) =====
  const [profile, setProfile] = useState<NutritionProfile>(() => loadNutritionProfile());
  const [targets, setTargets] = useState<NutritionTargets>(() => calcNutritionTargets(loadNutritionProfile()));
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [draft, setDraft] = useState<NutritionProfile>(() => loadNutritionProfile());

  // 打开定制弹窗时同步草稿
  const openProfileModal = () => {
    setDraft({ ...profile });
    setShowProfileModal(true);
  };

  const saveProfile = async () => {
    saveNutritionProfile(draft);
    setProfile({ ...draft });
    setTargets(calcNutritionTargets(draft));
    setShowProfileModal(false);
    try { await nutritionApi.saveProfile(draft); } catch { /* 本地仍保留，联网后可再次保存 */ }
  };

  const isLoggedIn = !!getToken();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadMeals();
  }, [currentDate, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return;
    nutritionApi.getProfile().then(remote => {
      if (!remote) return;
      const synced = { ...loadNutritionProfile(), ...remote } as NutritionProfile;
      saveNutritionProfile(synced);
      setProfile(synced);
      setDraft(synced);
      setTargets(calcNutritionTargets(synced));
    }).catch(() => {});
  }, [isLoggedIn]);

  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const loadMeals = async () => {
    setLoading(true);
    try {
      const dateStr = dateKey(currentDate);
      const result = await mealsApi.getMeals(dateStr);
      setMeals(result);
    } catch (error) {
      console.error('加载饮食数据失败:', error);
      setMeals([]);
    }
    setLoading(false);
  };

  const mealTypes = [
    { id: 'breakfast', name: '早餐', icon: Coffee, color: 'from-orange-500 to-yellow-500' },
    { id: 'lunch', name: '午餐', icon: Beef, color: 'from-red-500 to-orange-500' },
    { id: 'dinner', name: '晚餐', icon: Salad, color: 'from-green-500 to-teal-500' },
    { id: 'snack', name: '加餐', icon: Apple, color: 'from-purple-500 to-pink-500' },
  ];

  const getMealsByType = (type: string) => {
    return meals.filter(m => m.meal_type === type);
  };

  const getTotalCalories = () => {
    return meals.filter(m => m.eaten !== false).reduce((sum, m) => sum + (m.calories || 0), 0);
  };

  const getTotalProtein = () => {
    return meals.filter(m => m.eaten !== false).reduce((sum, m) => sum + (m.protein || 0), 0);
  };

  const getTotalCarbs = () => {
    return meals.filter(m => m.eaten !== false).reduce((sum, m) => sum + (m.carbs || 0), 0);
  };

  const getTotalFat = () => {
    return meals.filter(m => m.eaten !== false).reduce((sum, m) => sum + (m.fat || 0), 0);
  };

  // 智能估算：根据食物名称大体推算卡路里/蛋白质/碳水/脂肪
  const handleEstimate = () => {
    if (!newMeal.name.trim()) {
      setEstimateHint('请先输入食物名称');
      return;
    }
    setEstimating(true);
    setTimeout(() => {
      const est = estimateNutrition(newMeal.name);
      setNewMeal(prev => ({
        ...prev,
        calories: est.calories,
        protein: est.protein,
        carbs: est.carbs,
        fat: est.fat,
      }));
      setEstimateHint(
        `已识别：${est.matched.join(' + ')} · 大体估算 ${est.calories} kcal / 蛋白 ${est.protein}g / 碳水 ${est.carbs}g / 脂肪 ${est.fat}g（可微调）`
      );
      setEstimating(false);
    }, 400);
  };

  const handleAddMeal = async (eaten = true) => {
    if (!newMeal.name) return;

    try {
      const dateStr = dateKey(currentDate);
      await mealsApi.addMeal({
        date: dateStr,
        mealType: selectedMealType,
        name: newMeal.name,
        calories: newMeal.calories,
        protein: newMeal.protein,
        carbs: newMeal.carbs,
        fat: newMeal.fat,
        description: newMeal.description,
        eaten,
      });
      await loadMeals();
      setShowAddModal(false);
      setNewMeal({
        name: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        description: '',
      });
      setEstimateHint('');
    } catch (error) {
      console.error('添加饮食失败:', error);
    }
  };

  const handleGenerateMealPlan = async () => {
    setAiGenerating(true);
    setNotice('');
    try {
      const result = await planGeneratorApi.meals({
        goal: GOAL_OPTIONS.find(item => item.id === profile.goal)?.label || '保持',
        calories: targets.calories,
        preferences: aiPreferences,
      }) as { meals: Array<any> };
      const date = dateKey(currentDate);
      await Promise.all(result.meals.map(meal => mealsApi.addMeal({ ...meal, date, eaten: false })));
      await loadMeals();
      setShowAIModal(false);
      setNotice('AI 餐单已加入当天计划，吃完后点“我吃了”即可计入摄入。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'AI 餐单生成失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    try {
      await mealsApi.deleteMeal(mealId);
      await loadMeals();
    } catch (error) {
      console.error('删除饮食失败:', error);
    }
  };

  const getEatenCount = () => meals.filter(m => m.eaten !== false).length;

  const handleToggleEaten = async (mealId: string, eaten: boolean) => {
    try {
      await mealsApi.markEaten(mealId, eaten);
      setMeals(prev => prev.map(m =>
        m.id === mealId ? { ...m, eaten, eatenAt: eaten ? new Date().toISOString() : null } : m
      ));
    } catch (error) {
      console.error('更新已吃状态失败:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const prevDay = () => {
    setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
  };

  const nextDay = () => {
    setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
  };

  // 目标按个人档案计算(性别/年龄/身高/体重/活动水平/目标)
  const targetCalories = targets.calories;
  const targetProtein = targets.protein;
  const targetCarbs = targets.carbs;
  const targetFat = targets.fat;

  const calorieProgress = Math.min((getTotalCalories() / targetCalories) * 100, 100);

  if (!isLoggedIn) return null;

  return (
    <div className="min-h-screen bg-dark-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-dark-900">饮食计划</h1>
            <p className="text-dark-500 mt-2">科学饮食，健康生活</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAIModal(true)} className="btn-tonal flex items-center gap-2 px-4 py-3"><Sparkles className="w-5 h-5" />AI 生成餐单</button>
            <button onClick={() => { setShowAddModal(true); setEstimateHint(''); }} className="btn-filled flex items-center gap-2 px-4 md:px-6 py-3"><Plus className="w-5 h-5" />添加饮食</button>
          </div>
        </div>

        {notice && <div className="mb-5 px-4 py-3 rounded-xl bg-primary-50 border border-primary-200 text-primary-800 text-sm">{notice}</div>}

        {/* Date Selector */}
        <div className="bg-white rounded-2xl p-6 border border-dark-300 mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={prevDay}
              className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 hover:bg-dark-200 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary-600" />
              <span className="text-xl font-semibold text-dark-900">{formatDate(currentDate)}</span>
            </div>
            <button
              onClick={nextDay}
              className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 hover:bg-dark-200 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ===== 个人营养目标(按个人情况定制) ===== */}
        <div className="bg-white rounded-2xl border border-dark-300 p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-dark-900">我的每日营养目标</h2>
                <p className="text-xs text-dark-500 mt-0.5">
                  已按你的情况定制：{profile.gender === 'male' ? '男' : '女'} · {profile.age}岁 · {profile.height}cm · {profile.weight}kg ·{' '}
                  {ACTIVITY_OPTIONS.find(a => a.id === profile.activity)?.label} · {GOAL_OPTIONS.find(g => g.id === profile.goal)?.label}
                </p>
              </div>
            </div>
            <button
              onClick={openProfileModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              定制我的目标
            </button>
          </div>

          {/* 代谢与建议摄入 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-4 rounded-2xl bg-dark-100">
              <div className="text-xs text-dark-500">基础代谢 BMR</div>
              <div className="text-xl font-bold text-dark-900 mt-1">{targets.bmr}<span className="text-xs text-dark-500 font-normal ml-1">kcal</span></div>
              <div className="text-[11px] text-dark-400 mt-1">躺着不动也要消耗</div>
            </div>
            <div className="p-4 rounded-2xl bg-dark-100">
              <div className="text-xs text-dark-500">每日总消耗 TDEE</div>
              <div className="text-xl font-bold text-dark-900 mt-1">{targets.tdee}<span className="text-xs text-dark-500 font-normal ml-1">kcal</span></div>
              <div className="text-[11px] text-dark-400 mt-1">含日常活动消耗</div>
            </div>
            <div className="p-4 rounded-2xl" style={{ background: 'linear-gradient(135deg,#1D54E8,#2F6BFF)' }}>
              <div className="text-xs text-white/70">建议每日摄入</div>
              <div className="text-2xl font-bold text-white mt-1">{targets.calories}<span className="text-xs text-white/70 font-normal ml-1">kcal</span></div>
              <div className="text-[11px] text-white/60 mt-1">{GOAL_OPTIONS.find(g => g.id === profile.goal)?.desc}</div>
            </div>
            <div className="p-4 rounded-2xl bg-primary-50 border border-primary-100">
              <div className="text-xs text-primary-600 flex items-center gap-1"><Droplets className="w-3 h-3" /> 饮水建议</div>
              <div className="text-xl font-bold text-dark-900 mt-1">{(targets.waterMl / 1000).toFixed(1)}<span className="text-xs text-dark-500 font-normal ml-1">L</span></div>
              <div className="text-[11px] text-dark-400 mt-1">约 {Math.ceil(targets.waterMl / 250)} 杯</div>
            </div>
          </div>

          {/* 三大营养素比例条 */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <div className="flex justify-between text-xs text-dark-600 mb-1.5">
                <span className="font-medium">蛋白质 {targets.protein}g</span>
                <span className="text-dark-400">≈{Math.round(targets.protein * 4 / targets.calories * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-red-100"><div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400" style={{ width: `${Math.min(targets.protein * 4 / targets.calories * 100, 100)}%` }} /></div>
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="flex justify-between text-xs text-dark-600 mb-1.5">
                <span className="font-medium">碳水 {targets.carbs}g</span>
                <span className="text-dark-400">≈{Math.round(targets.carbs * 4 / targets.calories * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-yellow-100"><div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400" style={{ width: `${Math.min(targets.carbs * 4 / targets.calories * 100, 100)}%` }} /></div>
            </div>
            <div className="flex-1 min-w-[220px]">
              <div className="flex justify-between text-xs text-dark-600 mb-1.5">
                <span className="font-medium">脂肪 {targets.fat}g</span>
                <span className="text-dark-400">≈{Math.round(targets.fat * 9 / targets.calories * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-green-100"><div className="h-full rounded-full bg-gradient-to-r from-green-500 to-teal-400" style={{ width: `${Math.min(targets.fat * 9 / targets.calories * 100, 100)}%` }} /></div>
            </div>
          </div>
        </div>

        {/* 已吃记录条:当天添加的饮食自动出现在这里 */}
        <div className="bg-gradient-to-r from-accent-50 to-primary-50 border border-accent-200 rounded-2xl p-5 mb-6 flex items-center gap-4 flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-accent-500 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="font-semibold text-dark-900 text-sm">今天已吃 {getEatenCount()} 项食物</div>
            <div className="text-xs text-dark-600 mt-0.5">
              {getEatenCount() === 0
                ? `添加饮食后会自动记录到已吃清单。你的每日目标是 ${targetCalories} kcal，加油！`
                : `已摄入 ${getTotalCalories()} kcal · 蛋白质 ${getTotalProtein()}g · 碳水 ${getTotalCarbs()}g · 脂肪 ${getTotalFat()}g`}
            </div>
            {getEatenCount() > 0 && (
              <div className="text-xs mt-1 font-medium">
                {getTotalCalories() < targetCalories ? (
                  <span className="text-primary-600">距离今日目标还差 {targetCalories - getTotalCalories()} kcal</span>
                ) : getTotalCalories() <= targetCalories * 1.1 ? (
                  <span className="text-accent-600">✓ 已达到今日热量目标</span>
                ) : (
                  <span className="text-vibe-orange">已超出目标 {getTotalCalories() - targetCalories} kcal，注意控制</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedMealType('breakfast');
              setShowAddModal(true);
              setEstimateHint('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-accent-300 text-accent-700 rounded-full text-sm font-medium hover:bg-accent-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            记一笔
          </button>
        </div>

        {/* Nutrition Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-dark-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-dark-500 text-sm">总热量</div>
                <div className="text-2xl font-bold text-dark-900">{getTotalCalories()}<span className="text-sm text-dark-500 ml-1">kcal</span></div>
              </div>
            </div>
            <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${calorieProgress}%` }}
              />
            </div>
            <div className="text-xs text-dark-500 mt-2">目标: {targetCalories} kcal ({calorieProgress.toFixed(0)}%)</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-dark-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Beef className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-dark-500 text-sm">蛋白质</div>
                <div className="text-2xl font-bold text-dark-900">{getTotalProtein()}<span className="text-sm text-dark-500 ml-1">g</span></div>
              </div>
            </div>
            <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((getTotalProtein() / targetProtein) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-dark-500 mt-2">目标: {targetProtein}g</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-dark-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-dark-500 text-sm">碳水</div>
                <div className="text-2xl font-bold text-dark-900">{getTotalCarbs()}<span className="text-sm text-dark-500 ml-1">g</span></div>
              </div>
            </div>
            <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((getTotalCarbs() / targetCarbs) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-dark-500 mt-2">目标: {targetCarbs}g</div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-dark-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-dark-500 text-sm">脂肪</div>
                <div className="text-2xl font-bold text-dark-900">{getTotalFat()}<span className="text-sm text-dark-500 ml-1">g</span></div>
              </div>
            </div>
            <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((getTotalFat() / targetFat) * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-dark-500 mt-2">目标: {targetFat}g</div>
          </div>
        </div>

        {/* Meal Sections */}
        <div className="space-y-6">
          {mealTypes.map((mealType) => {
            const typeMeals = getMealsByType(mealType.id);
            const typeCalories = typeMeals.reduce((sum, m) => sum + (m.calories || 0), 0);

            return (
              <div key={mealType.id} className="bg-white rounded-2xl border border-dark-300">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mealType.color} flex items-center justify-center`}>
                        <mealType.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-dark-900">{mealType.name}</h3>
                        <p className="text-sm text-dark-500">{typeCalories} kcal</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedMealType(mealType.id);
                        setShowAddModal(true);
                        setEstimateHint('');
                      }}
                      className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-dark-500 hover:text-primary-700 hover:bg-primary-50 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {typeMeals.length === 0 ? (
                    <div className="text-center py-8 text-dark-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>还没有添加{mealType.name}记录</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {typeMeals.map((meal) => (
                        <div
                          key={meal.id}
                          className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                            meal.eaten !== false ? 'bg-dark-100 hover:bg-dark-200' : 'bg-white border border-dashed border-dark-300 hover:bg-dark-100'
                          }`}
                        >
                          {meal.image && (
                            <img
                              src={meal.image}
                              alt={meal.name}
                              className="w-16 h-16 rounded-xl object-cover"
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-dark-900 flex items-center gap-2 flex-wrap">
                              {meal.name}
                              {meal.eaten !== false ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-50 text-accent-700 text-[11px] font-medium rounded-full border border-accent-200">
                                  ✓ 已吃
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-200 text-dark-500 text-[11px] font-medium rounded-full">
                                  计划中
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-dark-500 mt-1">
                              {meal.calories} kcal · 蛋白质 {meal.protein}g · 碳水 {meal.carbs}g · 脂肪 {meal.fat}g
                            </div>
                            {meal.description && (
                              <div className="text-xs text-dark-500 mt-1">{meal.description}</div>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => handleToggleEaten(meal.id, meal.eaten === false)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                meal.eaten !== false
                                  ? 'bg-dark-200 text-dark-600 hover:bg-dark-300'
                                  : 'bg-accent-50 text-accent-700 border border-accent-200 hover:bg-accent-100'
                              }`}
                              title={meal.eaten !== false ? '标记为未吃' : '标记为已吃'}
                            >
                              {meal.eaten !== false ? '未吃?' : '我吃了'}
                            </button>
                            <button
                              onClick={() => handleDeleteMeal(meal.id)}
                              className="w-8 h-8 rounded-lg bg-dark-200 flex items-center justify-center text-dark-500 hover:text-vibe-red transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 个人营养定制弹窗 ===== */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-dark-300 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-dark-900 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary-600" />
                定制我的营养目标
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 hover:bg-dark-200 transition-colors"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-dark-600 mb-5 leading-relaxed">
              填写你的身体情况与目标，系统会用 <b>Mifflin-St Jeor 公式</b> 算出你的基础代谢与每日营养目标。
            </p>

            {/* 性别 */}
            <div className="mb-4">
              <label className="text-sm text-dark-500 mb-2 block">性别</label>
              <div className="grid grid-cols-2 gap-2">
                {([['male', '男性', '♂'], ['female', '女性', '♀']] as const).map(([id, label, icon]) => (
                  <button
                    key={id}
                    onClick={() => setDraft({ ...draft, gender: id })}
                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                      draft.gender === id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-dark-300 text-dark-600 hover:border-primary-300'
                    }`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 年龄/身高/体重 */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-sm text-dark-500 mb-1.5 block">年龄(岁)</label>
                <input
                  type="number"
                  min={10}
                  max={90}
                  value={draft.age}
                  onChange={(e) => setDraft({ ...draft, age: Math.max(10, Math.min(90, Number(e.target.value) || 10)) })}
                  className="w-full px-3 py-2.5 bg-white border border-dark-300 rounded-xl text-dark-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-dark-500 mb-1.5 block">身高(cm)</label>
                <input
                  type="number"
                  min={120}
                  max={230}
                  value={draft.height}
                  onChange={(e) => setDraft({ ...draft, height: Math.max(120, Math.min(230, Number(e.target.value) || 120)) })}
                  className="w-full px-3 py-2.5 bg-white border border-dark-300 rounded-xl text-dark-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-dark-500 mb-1.5 block">体重(kg)</label>
                <input
                  type="number"
                  min={30}
                  max={250}
                  value={draft.weight}
                  onChange={(e) => setDraft({ ...draft, weight: Math.max(30, Math.min(250, Number(e.target.value) || 30)) })}
                  className="w-full px-3 py-2.5 bg-white border border-dark-300 rounded-xl text-dark-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 text-sm"
                />
              </div>
            </div>

            {/* 活动水平 */}
            <div className="mb-4">
              <label className="text-sm text-dark-500 mb-2 block">日常活动水平</label>
              <div className="space-y-2">
                {ACTIVITY_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDraft({ ...draft, activity: opt.id })}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                      draft.activity === opt.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-dark-300 hover:border-primary-300'
                    }`}
                  >
                    <div>
                      <div className={`text-sm font-medium ${draft.activity === opt.id ? 'text-primary-700' : 'text-dark-900'}`}>{opt.label}</div>
                      <div className="text-xs text-dark-500 mt-0.5">{opt.desc}</div>
                    </div>
                    <span className={`text-xs font-semibold ${draft.activity === opt.id ? 'text-primary-600' : 'text-dark-400'}`}>×{opt.factor}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 目标 */}
            <div className="mb-5">
              <label className="text-sm text-dark-500 mb-2 block">我的目标</label>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setDraft({ ...draft, goal: opt.id })}
                    title={opt.desc}
                    className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                      draft.goal === opt.id
                        ? 'border-accent-500 bg-accent-50 text-accent-700'
                        : 'border-dark-300 text-dark-600 hover:border-accent-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 实时预览 */}
            <div className="p-4 rounded-2xl bg-dark-100 mb-6">
              <div className="text-xs text-dark-500 mb-1.5">按当前选择预估</div>
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold text-dark-900">{calcNutritionTargets(draft).calories}<span className="text-xs text-dark-500 font-normal ml-1">kcal/天</span></div>
                <div className="text-sm text-dark-600">蛋白 {calcNutritionTargets(draft).protein}g · 碳水 {calcNutritionTargets(draft).carbs}g · 脂肪 {calcNutritionTargets(draft).fat}g</div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 py-3 bg-dark-100 text-dark-700 font-semibold rounded-full hover:bg-dark-200 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={saveProfile}
                className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-full hover:bg-primary-600 transition-colors text-sm"
              >
                保存并应用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Meal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-dark-300 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-dark-900">添加饮食记录</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-10 h-10 rounded-xl bg-dark-100 flex items-center justify-center text-dark-500 hover:text-dark-900 hover:bg-dark-200 transition-colors"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Meal Type Selection */}
              <div className="flex items-center gap-2">
                {mealTypes.map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => setSelectedMealType(mt.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                      selectedMealType === mt.id
                        ? `bg-gradient-to-br ${mt.color} text-white`
                        : 'bg-dark-100 text-dark-500 hover:text-dark-900'
                    }`}
                  >
                    <mt.icon className="w-4 h-4" />
                    {mt.name}
                  </button>
                ))}
              </div>

              {/* Meal Details */}
              <div>
                <label className="text-sm text-dark-500 mb-2">食物名称</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMeal.name}
                    onChange={(e) => {
                      setNewMeal({ ...newMeal, name: e.target.value });
                      setEstimateHint('');
                    }}
                    placeholder="例如：鸡腿饭、鸡胸肉沙拉..."
                    className="flex-1 px-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                  <button
                    onClick={handleEstimate}
                    disabled={estimating || !newMeal.name.trim()}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {estimating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    智能估算
                  </button>
                </div>
                {estimateHint && (
                  <div className="mt-2 p-3 bg-primary-50 border border-primary-200 rounded-xl flex items-start gap-2">
                    <Wand2 className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-primary-700 leading-relaxed">{estimateHint}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-dark-500 mb-2">热量 (kcal)</label>
                  <input
                    type="number"
                    value={newMeal.calories}
                    onChange={(e) => setNewMeal({ ...newMeal, calories: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                </div>
                <div>
                  <label className="text-sm text-dark-500 mb-2">蛋白质 (g)</label>
                  <input
                    type="number"
                    value={newMeal.protein}
                    onChange={(e) => setNewMeal({ ...newMeal, protein: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                </div>
                <div>
                  <label className="text-sm text-dark-500 mb-2">碳水 (g)</label>
                  <input
                    type="number"
                    value={newMeal.carbs}
                    onChange={(e) => setNewMeal({ ...newMeal, carbs: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                </div>
                <div>
                  <label className="text-sm text-dark-500 mb-2">脂肪 (g)</label>
                  <input
                    type="number"
                    value={newMeal.fat}
                    onChange={(e) => setNewMeal({ ...newMeal, fat: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-dark-500 mb-2">备注</label>
                <textarea
                  value={newMeal.description}
                  onChange={(e) => setNewMeal({ ...newMeal, description: e.target.value })}
                  placeholder="添加描述..."
                  rows={2}
                  className="w-full px-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleAddMeal(false)} disabled={!newMeal.name} className="py-4 bg-dark-100 text-dark-800 font-semibold rounded-xl disabled:opacity-50">加入计划</button>
                <button onClick={() => handleAddMeal(true)} disabled={!newMeal.name} className="py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl disabled:opacity-50">记录已吃</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAIModal && <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4"><div className="bg-white rounded-t-3xl md:rounded-3xl border border-dark-300 w-full max-w-lg p-6 pb-[calc(24px+env(safe-area-inset-bottom))]"><div className="flex justify-between items-start"><div><p className="text-xs font-bold text-primary-600">AI MEAL PLANNER</p><h3 className="font-display text-2xl text-dark-950 mt-1">生成当天餐单</h3><p className="text-sm text-dark-500 mt-1">按 {targets.calories} kcal 和你的目标生成，先作为计划保存。</p></div><button onClick={() => setShowAIModal(false)} className="w-10 h-10 rounded-full bg-dark-100">×</button></div><label className="block text-sm font-bold text-dark-700 mt-6">饮食偏好<textarea value={aiPreferences} onChange={event => setAiPreferences(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border-2 border-dark-300 p-3 font-normal outline-none focus:border-primary-500" placeholder="例如：不吃牛肉、预算友好、方便带饭" /></label><button onClick={handleGenerateMealPlan} disabled={aiGenerating} className="btn-accent w-full min-h-14 mt-5 disabled:opacity-50">{aiGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}{aiGenerating ? '正在生成…' : '生成并加入当天计划'}</button></div></div>}
    </div>
  );
};

export default MealPlan;
