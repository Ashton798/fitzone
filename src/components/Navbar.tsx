import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, X, User, LogOut, Home, Play, Bot, Users, Utensils, MessageSquare, Bell, Dumbbell } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { useAuthStore } from '@/store/authStore';
import { getToken } from '@/lib/api';

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isReallyLoggedIn = !!getToken();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getSafeAvatar = () => {
    const avatar = user?.avatar;
    if (!avatar) return DEFAULT_AVATAR;
    if (avatar.startsWith('data:')) return DEFAULT_AVATAR;
    return avatar;
  };

  const navLinks = [
    { path: '/', label: '首页', icon: Home },
    { path: '/workout', label: '训练', icon: Dumbbell },
    { path: '/videos', label: '视频教学', icon: Play },
    { path: '/ai-coach', label: 'AI 教练', icon: Bot },
    { path: '/community', label: '社区', icon: Users },
    { path: '/meal-plan', label: '饮食计划', icon: Utensils },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/videos?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fitzone_token');
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#0A1A2F]/95 backdrop-blur-md shadow-lg shadow-black/20 border-b border-white/10'
          : 'bg-[#0A1A2F]/60 backdrop-blur-sm border-b border-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <BrandMark className="transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
            <span className="text-xl font-display text-white tracking-wide">
              Fit<span className="text-accent-400">Zone</span>
            </span>
            <span className="hidden sm:inline-block font-anton text-[10px] text-primary-300 tracking-widest mt-1.5 border border-white/20 rounded px-1.5 py-0.5">
              TRAIN HARD
            </span>
          </Link>

          {/* 主导航 */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-full text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <link.icon className={`w-4 h-4 ${active ? 'text-accent-400' : ''}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2">
            {/* 搜索 */}
            <form onSubmit={handleSearch} className="hidden lg:flex items-center">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索课程"
                  className="w-52 pl-10 pr-4 py-2 rounded-full text-sm bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:bg-white/15 focus:border-accent-400 focus:ring-4 focus:ring-accent-400/15 transition-all"
                />
              </div>
            </form>

            {isReallyLoggedIn ? (
              <div className="hidden md:flex items-center gap-1">
                <Link
                  to="/notifications"
                  className="relative p-2.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  title="消息通知"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2 w-2 h-2 bg-accent-400 rounded-full pulse-dot" />
                </Link>
                <Link
                  to="/chat"
                  className="p-2.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  title="私信"
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 ml-1 pl-1 pr-3 py-1 rounded-full hover:bg-white/10 transition-colors"
                >
                  <img
                    src={getSafeAvatar()}
                    alt={user?.nickname || '用户'}
                    className="w-8 h-8 rounded-full ring-2 ring-accent-400/70"
                  />
                  <span className="text-sm font-medium text-white max-w-[100px] truncate">
                    {user?.nickname || '用户'}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2.5 rounded-full hover:bg-white/10 text-white/70 hover:text-accent-300 transition-colors"
                  title="退出登录"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center gap-2 px-5 py-2 rounded-full text-sm font-display tracking-wide bg-accent-400 text-[#0A1A2F] hover:bg-accent-300 hover:shadow-lg hover:shadow-accent-400/30 transition-all border-2 border-[#0A1A2F]"
              >
                <User className="w-4 h-4" />
                登录
              </Link>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2.5 rounded-full hover:bg-white/10 text-white transition-colors"
              aria-label="菜单"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* 移动端菜单 */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#0A1A2F] border-t border-white/10 animate-slide-down">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索课程"
                  className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/10 border border-white/15 text-white placeholder-white/40 focus:outline-none focus:bg-white/15 focus:border-accent-400 transition-all"
                />
              </div>
            </form>

            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                    active
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-white/75 hover:bg-white/10'
                  }`}
                >
                  <link.icon className={`w-5 h-5 ${active ? 'text-accent-400' : 'text-white/50'}`} />
                  {link.label}
                </Link>
              );
            })}

            <div className="pt-3 mt-2 border-t border-white/10">
              {isReallyLoggedIn ? (
                <>
                  <Link
                    to="/notifications"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white/75 transition-colors"
                  >
                    <Bell className="w-5 h-5 text-white/50" />
                    <span>消息通知</span>
                  </Link>
                  <Link
                    to="/chat"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white/75 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5 text-white/50" />
                    <span>私信</span>
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 text-white/75 transition-colors"
                  >
                    <img
                      src={getSafeAvatar()}
                      alt={user?.nickname || '用户'}
                      className="w-9 h-9 rounded-full ring-2 ring-accent-400/70"
                    />
                    <div>
                      <div className="font-medium text-white">{user?.nickname || '用户'}</div>
                      <div className="text-xs text-white/50">个人中心</div>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-accent-300 hover:bg-white/10 transition-colors mt-1"
                  >
                    <LogOut className="w-5 h-5" />
                    退出登录
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-full bg-accent-400 text-[#0A1A2F] font-display tracking-wide hover:bg-accent-300 transition-colors"
                >
                  <User className="w-5 h-5" />
                  登录 / 注册
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
