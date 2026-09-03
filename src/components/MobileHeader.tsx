import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, X, Bell, MessageSquare } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { useAuthStore } from '@/store/authStore';
import { getToken } from '@/lib/api';

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

/** 手机版顶部栏（<768px 显示）：紧凑品牌 + 搜索 / 消息 / 我的 */
const MobileHeader = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isLoggedIn = !!getToken();

  const safeAvatar = () => {
    const a = user?.avatar;
    if (!a || a.startsWith('data:')) return DEFAULT_AVATAR;
    return a;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/videos?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      setSearchOpen(false);
    }
  };

  // 隐私/帮助等页面也保留顶栏
  return (
    <header className="sticky top-0 z-40 bg-[#0A1A2F]/95 backdrop-blur-md border-b border-white/10" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between h-14 px-3 gap-1">
        <Link to="/" className="flex items-center gap-2 shrink-0" onClick={() => setSearchOpen(false)}>
          <BrandMark className="w-8 h-8 !w-8 !h-8" />
          <span className="font-display text-white text-lg tracking-wide leading-none">
            Fit<span className="text-accent-400">Zone</span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="搜索"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 active:bg-white/15 transition-colors"
          >
            {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          {isLoggedIn ? (
            <>
              <Link
                to="/chat"
                aria-label="私信"
                className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 active:bg-white/15 transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
              </Link>
              <Link
                to="/notifications"
                aria-label="通知"
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-white/80 active:bg-white/15 transition-colors"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-400 rounded-full pulse-dot" />
              </Link>
              <Link
                to="/profile"
                aria-label="个人中心"
                className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-accent-400/70 shrink-0"
              >
                <img src={safeAvatar()} alt="我的" className="w-full h-full object-cover" />
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center h-9 px-4 ml-0.5 rounded-full bg-accent-400 text-[#0A1A2F] font-bold text-sm active:scale-95 transition-transform shrink-0"
            >
              登录
            </Link>
          )}
        </div>
      </div>

      {/* 展开搜索 */}
      {searchOpen && (
        <form onSubmit={submit} className="px-3 pb-3 animate-slide-down">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索课程 / 动作"
              className="w-full h-10 pl-10 pr-4 rounded-full text-sm bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:bg-white/15 focus:border-accent-400 transition-all"
            />
          </div>
        </form>
      )}
    </header>
  );
};

export default MobileHeader;
