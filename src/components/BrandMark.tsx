// ============================================================
// FitZone 原创品牌标识
// 深蓝渐变底 + 手绘感粗体 Z(Zone)闪电标,配合贴纸语言
// 替代通用 lucide 图标,避免"AI 模板感"
// ============================================================
const BrandMark = ({ className = '' }: { className?: string }) => {
  return (
    <div
      className={`w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 flex items-center justify-center border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_3px_10px_rgba(10,26,47,0.35)] relative overflow-hidden ${className}`}
    >
      {/* 左上角光斑 */}
      <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white/15 blur-[3px] pointer-events-none" />
      <svg viewBox="0 0 24 24" className="w-[21px] h-[21px] relative" fill="none" aria-hidden="true">
        {/* 粗圆角 Z - 手写能量感(顶横/斜线/底横) */}
        <path
          d="M5 6.5H19L5 17.5H19"
          stroke="white"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 柠檬黄能量点 */}
        <circle cx="17.4" cy="3.6" r="1.25" fill="#FFC93C" />
      </svg>
    </div>
  );
};

export default BrandMark;
