import { useEffect, useMemo, useState } from 'react';
import { checkinsApi } from '@/lib/api';
import { Flame, ChevronLeft, ChevronRight, Check } from 'lucide-react';

// ============================================================
// 训练打卡日历：点某天打卡，日期颜色变化(橙=已打卡/今天描边)
// 数据存后端,账号登录后跨设备可查
// ============================================================
const CheckinCalendar = () => {
  const [checkins, setCheckins] = useState<string[]>([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() }; // m: 0-11
  });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    checkinsApi
      .getCheckins()
      .then(list => setCheckins(list))
      .catch(e => console.warn('加载打卡失败:', e))
      .finally(() => setLoading(false));
  }, []);

  // 连续打卡天数(从今天往回数)
  const streak = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 400; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (checkins.includes(s)) count++;
      else if (i > 0) break;
    }
    return count;
  }, [checkins]);

  const isChecked = (s: string) => checkins.includes(s);

  const toggle = async (s: string) => {
    if (toggling) return;
    setToggling(s);
    try {
      const res = await checkinsApi.toggleCheckin(s);
      setCheckins(prev => res.checked ? [...prev, s] : prev.filter(x => x !== s));
    } catch (e: any) {
      alert(e.message || '操作失败，请先登录');
    }
    setToggling(null);
  };

  // 当月格子
  const cells = useMemo(() => {
    const first = new Date(month.y, month.m, 1);
    const startPad = first.getDay(); // 0=周日
    const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
    const list: (string | null)[] = [];
    for (let i = 0; i < startPad; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      list.push(`${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return list;
  }, [month]);

  const monthLabel = `${month.y} 年 ${month.m + 1} 月`;
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  const goPrev = () => setMonth(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const goNext = () => setMonth(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));

  return (
    <div className="bg-white rounded-2xl border border-dark-300 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FCE8E6' }}>
            <Flame className="w-5 h-5" style={{ color: '#EA4335' }} />
          </div>
          <div>
            <h3 className="font-bold font-display text-dark-900">训练打卡日历</h3>
            <p className="text-xs text-dark-500 mt-0.5">点一下日期完成打卡，颜色会变化哦</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-50 text-accent-700 rounded-full font-semibold border border-accent-200">
            <Flame className="w-4 h-4" />
            连续 {streak} 天
          </span>
          {todayStr && isChecked(todayStr) && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full font-medium border border-primary-200 text-xs">
              <Check className="w-3.5 h-3.5" />
              今日已打卡
            </span>
          )}
        </div>
      </div>

      {/* 月份切换 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goPrev}
          className="w-8 h-8 rounded-full hover:bg-dark-200 flex items-center justify-center text-dark-600 transition-colors"
          aria-label="上个月"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-dark-900">{monthLabel}</span>
        <button
          onClick={goNext}
          className="w-8 h-8 rounded-full hover:bg-dark-200 flex items-center justify-center text-dark-600 transition-colors"
          aria-label="下个月"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((w, i) => (
          <div key={i} className="text-center text-xs text-dark-500 py-1">
            {w}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />;
          const checked = isChecked(date);
          const isToday = date === todayStr;
          const isFuture = date > todayStr;
          return (
            <button
              key={date}
              disabled={isFuture || !!toggling}
              onClick={() => toggle(date)}
              title={date + (checked ? ' · 已打卡' : ' · 点击打卡')}
              className={[
                'aspect-square rounded-xl text-sm font-medium transition-all flex items-center justify-center relative',
                isFuture
                  ? 'text-dark-300 cursor-not-allowed'
                  : checked
                    ? 'text-white shadow-sm active:scale-90'
                    : 'text-dark-700 hover:bg-dark-200 active:scale-90',
                isToday && !checked ? 'ring-2 ring-primary-500 ring-offset-1' : '',
              ].join(' ')}
              style={checked ? { background: 'linear-gradient(135deg, #FF9A3D 0%, #EA4335 100%)' } : undefined}
            >
              {Number(date.slice(-2))}
              {checked && <Flame className="absolute -top-1 -right-1 w-3.5 h-3.5 text-accent-600 drop-shadow" />}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-center text-xs text-dark-500 mt-3">正在加载打卡记录…</p>}

      {/* 图例 */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-dark-200 text-xs text-dark-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded" style={{ background: 'linear-gradient(135deg, #FF9A3D 0%, #EA4335 100%)' }} />
          已打卡
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-white border-2 border-primary-500" />
          今天
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded bg-dark-200 border border-dark-300" />
          未打卡
        </span>
      </div>
    </div>
  );
};

export default CheckinCalendar;
