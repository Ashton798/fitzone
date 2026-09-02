import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Category } from '@/types';
import { LucideIcon } from 'lucide-react';

interface CategoryCardProps {
  category: Category;
}

// 每个分类对应一个运动风撞色（深色块 + 亮色点缀）
const categoryTints: Record<string, { bg: string; fg: string }> = {
  strength:  { bg: '#FFC93C', fg: '#0A1A2F' },   // 柠檬黄
  cardio:    { bg: '#FF6B4D', fg: '#FFFFFF' },   // 活力橙红
  yoga:      { bg: '#2FD673', fg: '#0A1A2F' },   // 荧光绿
  hiit:      { bg: '#FF4D4D', fg: '#FFFFFF' },   // 燃脂红
  stretch:   { bg: '#58A6FF', fg: '#0A1A2F' },   // 天空蓝
  pilates:   { bg: '#9D6BFF', fg: '#FFFFFF' },   // 紫
  dance:     { bg: '#FF6B9D', fg: '#FFFFFF' },   // 粉
  boxing:    { bg: '#FF9A3C', fg: '#0A1A2F' },   // 橙
  running:   { bg: '#2F6BFF', fg: '#FFFFFF' },   // 电光蓝
  cycling:   { bg: '#2EC4B6', fg: '#0A1A2F' },   // 青绿
  swimming:  { bg: '#4FC3F7', fg: '#0A1A2F' },   // 水蓝
  jumprope:  { bg: '#FFC93C', fg: '#0A1A2F' },   // 黄
  climbing:  { bg: '#B8860B', fg: '#FFFFFF' },   // 岩壁棕
  hiking:    { bg: '#7CB342', fg: '#0A1A2F' },   // 草绿
  core:      { bg: '#9D6BFF', fg: '#FFFFFF' },   // 紫
  mobility:  { bg: '#26A69A', fg: '#FFFFFF' },   // 青
};

const CategoryCard = ({ category }: CategoryCardProps) => {
  const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[category.icon] || Icons.Activity;
  const tint = categoryTints[category.id] || categoryTints.strength;

  return (
    <Link
      to={`/videos?category=${category.id}`}
      className="group surface-card card-hover overflow-hidden block"
    >
      {/* 顶部色带 */}
      <div
        className="h-2.5 w-full transition-all duration-300 group-hover:h-3"
        style={{ backgroundColor: tint.bg }}
      />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* 图标块 */}
          <div
            className="w-13 h-13 min-w-[52px] w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:rotate-[-8deg] group-hover:scale-110 border-2 border-[#0A1A2F] shadow-[3px_3px_0_rgba(10,26,47,0.9)]"
            style={{ backgroundColor: tint.bg, color: tint.fg }}
          >
            <IconComponent className="w-6 h-6" strokeWidth={2.2} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-display text-lg text-[#0A1A2F] mb-1 truncate">
              {category.name}
            </h3>
            <p className="text-xs text-dark-500 leading-relaxed line-clamp-2">
              {category.description}
            </p>
          </div>
        </div>

        {/* 动作标签 */}
        {category.movements && category.movements.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {category.movements.slice(0, 3).map((m) => (
              <span
                key={m}
                className="text-[10px] px-2 py-0.5 rounded bg-dark-100 border border-dark-200 text-dark-600 transition-colors group-hover:bg-primary-50 group-hover:border-primary-200 group-hover:text-primary-600"
              >
                {m}
              </span>
            ))}
            {category.movements.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-dark-100 text-dark-400">
                +{category.movements.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 pt-3 border-t-2 border-dashed border-dark-200 flex items-center justify-between">
          <span className="font-anton text-sm text-[#0A1A2F] tracking-wide">
            {category.videoCount} <span className="text-[10px] text-dark-500 font-body">CLASSES</span>
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-primary-600 group-hover:gap-2.5 transition-all">
            去训练
            <Icons.ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
