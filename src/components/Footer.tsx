import { Link } from 'react-router-dom';
import { Mail, Phone, MessageCircle, MapPin, Zap } from 'lucide-react';
import BrandMark from '@/components/BrandMark';

const Footer = () => {
  return (
    <footer className="bg-[#0A1A2F] pt-16 pb-8 relative overflow-hidden">
      {/* 顶部斜切色带 */}
      <div className="h-2 bg-gradient-to-r from-accent-400 via-primary-500 to-accent-400" />
      <div className="absolute -top-20 right-10 opacity-10 rotate-12 float-slow">
        <div className="w-28 h-28 rounded-full bg-accent-400" style={{ boxShadow: 'inset 0 0 0 8px rgba(255,255,255,0.3)' }} />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* 品牌区 */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <BrandMark className="transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110" />
              <span className="text-xl font-display text-white tracking-wide">
                Fit<span className="text-accent-400">Zone</span>
              </span>
            </Link>
            <p className="text-primary-200/70 text-sm mb-5 leading-relaxed max-w-xs">
              科学健身平台。AI 教练、专业课程、活跃社区，让每个人都能找到属于自己的训练节奏。
            </p>
            <div className="flex gap-2">
              <a href="#" aria-label="微信" className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:bg-accent-400 hover:text-[#0A1A2F] hover:border-accent-400 transition-all">
                <MessageCircle className="w-4 h-4" />
              </a>
              <a href="#" aria-label="邮箱" className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:bg-accent-400 hover:text-[#0A1A2F] hover:border-accent-400 transition-all">
                <Mail className="w-4 h-4" />
              </a>
              <a href="#" aria-label="电话" className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white/70 hover:bg-accent-400 hover:text-[#0A1A2F] hover:border-accent-400 transition-all">
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* 探索 */}
          <div>
            <h4 className="font-display text-white text-base mb-5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-400" />
              探索
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  首页
                </Link>
              </li>
              <li>
                <Link to="/videos" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  视频课程
                </Link>
              </li>
              <li>
                <Link to="/ai-coach" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  AI 教练
                </Link>
              </li>
              <li>
                <Link to="/meal-plan" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  饮食计划
                </Link>
              </li>
            </ul>
          </div>

          {/* 社区 */}
          <div>
            <h4 className="font-display text-white text-base mb-5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-400" />
              社区
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/community" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  社区广场
                </Link>
              </li>
              <li>
                <Link to="/notifications" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  消息通知
                </Link>
              </li>
              <li>
                <Link to="/chat" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  私信聊天
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  个人中心
                </Link>
              </li>
            </ul>
          </div>

          {/* 支持 */}
          <div>
            <h4 className="font-display text-white text-base mb-5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-400" />
              支持
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/help" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  帮助中心
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-primary-200/70 hover:text-accent-400 transition-colors text-sm">
                  隐私政策
                </Link>
              </li>
              <li className="flex items-center gap-2 text-primary-200/70 text-sm pt-1">
                <Phone className="w-3.5 h-3.5 text-accent-400" />
                185-6016-7655
              </li>
              <li className="flex items-center gap-2 text-primary-200/40 text-xs">
                <MapPin className="w-3.5 h-3.5" />
                工作时间 9:00 - 18:00
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-primary-200/40 text-xs">
            © 2024 FitZone · 让健身更科学
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-primary-200/40 hover:text-accent-400 text-xs transition-colors">
              用户协议
            </Link>
            <Link to="/privacy" className="text-primary-200/40 hover:text-accent-400 text-xs transition-colors">
              隐私政策
            </Link>
            <Link to="/help" className="text-primary-200/40 hover:text-accent-400 text-xs transition-colors">
              帮助中心
            </Link>
            <span className="text-primary-200/30 text-xs">京 ICP 备 2024 XXXXXX 号</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
