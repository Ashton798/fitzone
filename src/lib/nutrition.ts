// ============================================================
// 个人营养目标计算(基于 Mifflin-St Jeor 公式)
// 按性别/年龄/身高/体重/活动水平/目标 计算每日热量与三大营养素
// ============================================================

export type Gender = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type DietGoal = 'lose' | 'maintain' | 'gain';

export interface NutritionProfile {
  gender: Gender;
  age: number;        // 岁
  height: number;     // cm
  weight: number;     // kg
  activity: ActivityLevel;
  goal: DietGoal;
  updatedAt?: string;
}

export interface NutritionTargets {
  bmr: number;        // 基础代谢
  tdee: number;       // 每日总消耗
  calories: number;   // 建议摄入
  protein: number;    // g
  carbs: number;      // g
  fat: number;        // g
  waterMl: number;    // 饮水建议
}

export const ACTIVITY_OPTIONS: { id: ActivityLevel; label: string; factor: number; desc: string }[] = [
  { id: 'sedentary', label: '久坐少动', factor: 1.2, desc: '办公室工作，几乎不运动' },
  { id: 'light', label: '轻度活动', factor: 1.375, desc: '每周运动 1-3 天' },
  { id: 'moderate', label: '中度活动', factor: 1.55, desc: '每周运动 3-5 天' },
  { id: 'active', label: '高度活动', factor: 1.725, desc: '每周运动 6-7 天' },
  { id: 'very_active', label: '极高活动', factor: 1.9, desc: '体力工作 + 高强度训练' },
];

export const GOAL_OPTIONS: { id: DietGoal; label: string; desc: string }[] = [
  { id: 'lose', label: '减脂', desc: '热量缺口，高蛋白保肌肉' },
  { id: 'maintain', label: '保持', desc: '维持体重与体脂' },
  { id: 'gain', label: '增肌', desc: '热量盈余，充足碳水蛋白' },
];

const DEFAULT_PROFILE: NutritionProfile = {
  gender: 'male',
  age: 25,
  height: 172,
  weight: 65,
  activity: 'light',
  goal: 'maintain',
};

const STORAGE_KEY = 'fitzone_nutrition_profile';

export function loadNutritionProfile(): NutritionProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveNutritionProfile(profile: NutritionProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
}

export function calcNutritionTargets(p: NutritionProfile): NutritionTargets {
  const w = p.weight;
  const h = p.height;
  const a = p.age;

  // Mifflin-St Jeor 基础代谢
  const bmr = p.gender === 'male'
    ? 10 * w + 6.25 * h - 5 * a + 5
    : 10 * w + 6.25 * h - 5 * a - 161;

  const factor = ACTIVITY_OPTIONS.find(x => x.id === p.activity)?.factor || 1.375;
  const tdee = Math.round(bmr * factor);

  // 目标热量
  let calories: number;
  if (p.goal === 'lose') calories = Math.round(tdee * 0.8);          // -20%
  else if (p.goal === 'gain') calories = Math.round(tdee * 1.12);    // +12%
  else calories = tdee;

  // 蛋白质(g/kg 体重)
  const proteinPerKg = p.goal === 'lose' ? 2.0 : p.goal === 'gain' ? 1.8 : 1.6;
  const protein = Math.round(w * proteinPerKg);

  // 脂肪: 25% 热量
  const fatCal = calories * 0.25;
  const fat = Math.round(fatCal / 9);

  // 碳水: 剩余热量
  const carbCal = calories - protein * 4 - fatCal;
  const carbs = Math.round(Math.max(0, carbCal) / 4);

  // 饮水: 体重 × 35ml
  const waterMl = Math.round(w * 35);

  return { bmr: Math.round(bmr), tdee, calories, protein, carbs, fat, waterMl };
}

export { DEFAULT_PROFILE, STORAGE_KEY };
