import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, Component, ReactNode } from 'react';
import Home from "@/pages/Home";
import Videos from "@/pages/Videos";
import VideoDetail from "@/pages/VideoDetail";
import AICoach from "@/pages/AICoach";
import Community from "@/pages/Community";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import MealPlan from "@/pages/MealPlan";
import Chat from "@/pages/Chat";
import Notifications from "@/pages/Notifications";
import Privacy from "@/pages/Privacy";
import Help from "@/pages/Help";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

// ==================== 全局错误边界 ====================
// 防止任何子组件渲染异常导致整个应用白屏
class GlobalErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary] 捕获到渲染异常:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-orange-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">页面出了点小问题</h2>
            <p className="text-gray-600 text-sm mb-5">
              页面遇到了一个渲染错误，但你的数据没有丢失。点击下方按钮重试即可。
            </p>
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // 应用启动时安全检查：清理base64头像等可能导致白屏的数据
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('fitzone_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        let needFix = false;
        // 检查头像是否是base64
        if (user.avatar && (typeof user.avatar === 'string') && user.avatar.startsWith('data:')) {
          user.avatar = DEFAULT_AVATAR;
          needFix = true;
        }
        // 检查头像是否为空
        if (!user.avatar) {
          user.avatar = DEFAULT_AVATAR;
          needFix = true;
        }
        if (needFix) {
          localStorage.setItem('fitzone_user', JSON.stringify(user));
        }
      }
    } catch (e) {
      // 如果localStorage数据损坏，清除它
      localStorage.removeItem('fitzone_user');
    }
  }, []);

  return (
    <GlobalErrorBoundary>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/video/:id" element={<VideoDetail />} />
              <Route path="/ai-coach" element={<AICoach />} />
              <Route path="/community" element={<Community />} />
              <Route path="/login" element={<Login />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/meal-plan" element={<MealPlan />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:userId" element={<Chat />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/help" element={<Help />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </GlobalErrorBoundary>
  );
}