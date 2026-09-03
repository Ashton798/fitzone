import { useMemo, useState } from 'react';
import { Check, Dumbbell, Plus, Search, X } from 'lucide-react';
import type { Exercise } from '@/types';

const CATEGORY_ORDER = ['全部', '胸', '背', '肩', '腿', '臀', '二头', '三头', '核心', '全身', '有氧', '自定义'] as const;
const DISPLAY_GROUPS = CATEGORY_ORDER.filter((category) => category !== '全部' && category !== '自定义');

interface ExerciseLibraryPickerProps {
  exercises: Exercise[];
  selectedIds?: string[];
  onSelect: (exercise: Exercise) => void | Promise<void>;
  onClose: () => void;
  onCreateCustom?: () => void;
}

export default function ExerciseLibraryPicker({ exercises, selectedIds = [], onSelect, onClose, onCreateCustom }: ExerciseLibraryPickerProps) {
  const [category, setCategory] = useState<(typeof CATEGORY_ORDER)[number]>('全部');
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');

  const matches = useMemo(
    () =>
      exercises.filter((exercise) => {
        const categoryMatches = Boolean(normalizedQuery) || category === '全部' || (category === '自定义' ? exercise.isCustom : exercise.muscleGroup === category);
        const queryMatches = !normalizedQuery || `${exercise.name} ${exercise.muscleGroup}`.toLocaleLowerCase('zh-CN').includes(normalizedQuery);
        return categoryMatches && queryMatches;
      }),
    [category, exercises, normalizedQuery],
  );

  const groups = useMemo(() => {
    if (category !== '全部' || normalizedQuery) {
      return [{ name: normalizedQuery ? '搜索结果' : category, items: matches }];
    }

    const builtIn = DISPLAY_GROUPS.map((name) => ({
      name,
      items: matches.filter((exercise) => !exercise.isCustom && exercise.muscleGroup === name),
    })).filter((group) => group.items.length > 0);
    const custom = matches.filter((exercise) => exercise.isCustom);
    return custom.length ? [...builtIn, { name: '自定义', items: custom }] : builtIn;
  }, [category, matches, normalizedQuery]);

  return (
    <div className="fixed inset-0 z-[80] bg-dark-950/60 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose} role="presentation">
      <section aria-label="动作库" onClick={(event) => event.stopPropagation()} className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-[28px] border-2 border-dark-950 bg-white md:max-w-3xl md:rounded-3xl">
        <header className="border-b border-dark-200 px-4 pb-3 pt-4 md:px-6 md:pt-5">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-dark-950 md:text-2xl">选择动作</h2>
              <p className="mt-0.5 text-xs text-dark-500">共 {exercises.length} 个动作 · 按部位查找</p>
            </div>
            <button aria-label="关闭动作库" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-dark-100 active:scale-95">
              <X className="h-5 w-5" />
            </button>
          </div>

          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-dark-200 bg-dark-50 px-3 focus-within:border-dark-950">
            <Search className="h-5 w-5 shrink-0 text-dark-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索动作，例如：划船、深蹲" className="min-w-0 flex-1 bg-transparent text-base text-dark-950 outline-none placeholder:text-dark-400" autoFocus={false} />
            {query && (
              <button aria-label="清除搜索" onClick={() => setQuery('')} className="p-1 text-dark-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:-mx-6 md:px-6">
            {CATEGORY_ORDER.map((item) => {
              const count = item === '全部' ? exercises.length : exercises.filter((exercise) => (item === '自定义' ? exercise.isCustom : exercise.muscleGroup === item)).length;
              if (item === '自定义' && count === 0) return null;
              return (
                <button key={item} onClick={() => setCategory(item)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${category === item ? 'border-dark-950 bg-dark-950 text-white' : 'border-dark-200 bg-white text-dark-700'}`}>
                  {item} <span className={category === item ? 'text-white/60' : 'text-dark-400'}>{count}</span>
                </button>
              );
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 md:px-5">
          {matches.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center text-center">
              <Search className="mb-3 h-8 w-8 text-dark-300" />
              <p className="font-semibold text-dark-800">没有找到这个动作</p>
              <p className="mt-1 text-sm text-dark-500">换个关键词，或创建自定义动作</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.name} className="mb-5 last:mb-1">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <h3 className="text-sm font-bold text-dark-900">{group.name}</h3>
                  <span className="text-xs text-dark-400">{group.items.length} 个</span>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {group.items.map((exercise) => {
                    const isSelected = selected.has(exercise.id);
                    return (
                      <button key={exercise.id} disabled={isSelected} onClick={() => onSelect(exercise)} className="group flex min-h-[64px] items-center gap-3 rounded-xl border border-transparent bg-dark-100 px-3 text-left transition-colors hover:border-primary-200 hover:bg-primary-50 disabled:opacity-45">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isSelected ? 'bg-primary-100 text-primary-700' : 'bg-white text-primary-500'}`}>{isSelected ? <Check className="h-4 w-4" /> : <Dumbbell className="h-4 w-4" />}</span>
                        <span className="min-w-0">
                          <strong className="block text-sm leading-tight text-dark-900">{exercise.name}</strong>
                          <small className="mt-1 block text-dark-500">{isSelected ? '已添加' : exercise.muscleGroup}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {onCreateCustom && (
          <footer className="border-t border-dark-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5">
            <button onClick={onCreateCustom} className="btn-tonal min-h-12 w-full">
              <Plus className="h-4 w-4" />
              创建自定义动作
            </button>
          </footer>
        )}
      </section>
    </div>
  );
}
