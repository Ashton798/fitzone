import { Link, useLocation } from 'react-router-dom';
import { Home, Play, Bot, User, Dumbbell } from 'lucide-react';

/** 手机版底部标签栏（<768px 显示）：App 式主导航 */
const MobileTabBar = () => {
  const { pathname } = useLocation();

  const tabs = [
    { to: '/', label: '首页', icon: Home },
    { to: '/workout', label: '训练', icon: Dumbbell },
    { to: '/ai-coach', label: 'AI', icon: Bot },
    { to: '/videos', label: '视频', icon: Play },
    { to: '/profile', label: '我的', icon: User },
  ];

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur-lg border-t border-dark-200 shadow-[0_-4px_20px_rgba(10,26,47,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around h-[60px] max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.to);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 active:scale-95 transition-transform"
            >
              <span
                className={`flex items-center justify-center w-11 h-6 rounded-full transition-colors ${
                  active ? 'bg-primary-500/12' : ''
                }`}
              >
                <tab.icon
                  className={`w-[22px] h-[22px] transition-colors ${
                    active ? 'text-primary-500' : 'text-dark-400'
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              <span
                className={`text-[10px] leading-none font-medium transition-colors ${
                  active ? 'text-primary-600 font-bold' : 'text-dark-400'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileTabBar;
