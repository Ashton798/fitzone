import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Dumbbell, Phone, Lock, Eye, EyeOff, ArrowRight, Mail,
  AlertCircle, CheckCircle, AtSign, User as UserIcon
} from 'lucide-react';
import { authApi, setToken } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const Login = () => {
  const navigate = useNavigate();
  const { login: loginStore } = useAuthStore();
  const [isRegister, setIsRegister] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  // 邮箱
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  // 手机
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

  // 统一处理登录成功(存 token + 用户)
  const handleLoginSuccess = (result: any) => {
    if (result?.token) setToken(result.token);
    const userData = result?.user || result;
    const safeUser = {
      ...userData,
      avatar: (userData.avatar && !userData.avatar.startsWith('data:')) ? userData.avatar : DEFAULT_AVATAR,
    };
    localStorage.setItem('fitzone_user', JSON.stringify(safeUser));
    loginStore(safeUser);
    setSuccess('登录成功！');
    setTimeout(() => navigate('/'), 600);
  };

  // ============ 邮箱注册 / 登录(真实账号) ============
  const handleEmailSubmit = async () => {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) {
      setError('请输入正确的邮箱地址');
      return;
    }
    if (!password || password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const result = await authApi.registerWithEmail(email.trim(), password, nickname.trim() || undefined);
        if (result.success) handleLoginSuccess(result);
        else setError(result.error || '注册失败');
      } else {
        const result = await authApi.loginWithEmail(email.trim(), password);
        if (result.success) handleLoginSuccess(result);
        else setError(result.error || '登录失败');
      }
    } catch (err: any) {
      setError(err.message || (isRegister ? '注册失败' : '登录失败'));
    }
    setLoading(false);
  };

  // ============ 手机验证码 ============
  const sendCode = async () => {
    if (!phone || phone.length !== 11) {
      setError('请输入正确的11位手机号');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await authApi.sendCode(phone);
      if (result.success) {
        setCodeSent(true);
        setSuccess('验证码已发送！' + (result.dev_code ? ` 验证码: ${result.dev_code}` : ''));
        setCode('');
        setCountdown(60);
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) { clearInterval(timer); setCodeSent(false); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || '发送验证码失败');
    }
    setLoading(false);
  };

  const handlePhoneLogin = async () => {
    if (!phone || phone.length !== 11) { setError('请输入正确的11位手机号'); return; }
    if (!code || code.length !== 6) { setError('请输入6位验证码'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await authApi.loginWithPhone(phone, code);
      if (result.success) handleLoginSuccess(result);
      else setError(result.error || '登录失败');
    } catch (err: any) {
      setError(err.message || '登录失败');
    }
    setLoading(false);
  };

  // ============ 手机号密码登录 ============
  const handlePasswordLogin = async () => {
    if (!phone || phone.length !== 11) { setError('请输入正确的11位手机号'); return; }
    if (!password) { setError('请输入密码'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await authApi.loginWithPassword(phone, password);
      if (result.success) handleLoginSuccess(result);
      else setError(result.error || '登录失败');
    } catch (err: any) {
      setError(err.message || '登录失败');
    }
    setLoading(false);
  };

  const switchMethod = (m: 'email' | 'phone') => {
    setLoginMethod(m);
    setError('');
    setSuccess('');
  };

  const toggleRegister = () => {
    setIsRegister(!isRegister);
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-dark-100 flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <span className="text-3xl font-bold font-display text-dark-900">FitZone</span>
        </Link>

        <div className="bg-white rounded-3xl p-8 border border-dark-300 shadow-elevation-3">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-dark-900 mb-2">
              {isRegister ? '创建账号' : '欢迎回来'}
            </h2>
            <p className="text-dark-500">
              {isRegister ? '注册一个专属账号，记录你的每一次进步' : '登录你的账号继续训练'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-vibe-red/10 border border-vibe-red/30 rounded-xl flex items-center gap-2 text-vibe-red">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-accent-50 border border-accent-200 rounded-xl flex items-center gap-2 text-accent-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          {/* 方式切换:邮箱 / 手机 */}
          <div className="flex items-center gap-2 mb-6 bg-dark-100 rounded-xl p-1">
            <button
              onClick={() => switchMethod('email')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'email' ? 'bg-primary-500 text-white' : 'text-dark-500 hover:text-dark-900'
              }`}
            >
              邮箱登录
            </button>
            <button
              onClick={() => switchMethod('phone')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                loginMethod === 'phone' ? 'bg-primary-500 text-white' : 'text-dark-500 hover:text-dark-900'
              }`}
            >
              手机号登录
            </button>
          </div>

          {/* ============ 邮箱注册/登录 ============ */}
          {loginMethod === 'email' && (
            <div className="space-y-4">
              {isRegister && (
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => { setNickname(e.target.value); setError(''); }}
                    placeholder="昵称(可选)"
                    className="w-full pl-12 pr-4 py-4 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all"
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="请输入邮箱，例如 you@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder={isRegister ? '设置密码(至少 6 位)' : '请输入密码'}
                  className="w-full pl-12 pr-12 py-4 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                onClick={handleEmailSubmit}
                disabled={!email || !password || loading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? '请稍候...' : (isRegister ? '注册并登录' : '登录')}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>

              {!isRegister && (
                <div className="rounded-xl bg-dark-100 p-3 text-xs text-dark-600 flex items-start gap-2">
                  <AtSign className="w-4 h-4 shrink-0 text-primary-500 mt-0.5" />
                  <span>每个邮箱只能注册一个账号，注册后你的动态、打卡、饮食记录都会保存在账号里，换设备也能找到。</span>
                </div>
              )}
            </div>
          )}

          {/* ============ 手机验证码登录 ============ */}
          {loginMethod === 'phone' && (
            <div className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 11)); setError(''); }}
                  placeholder="请输入手机号"
                  className="w-full pl-12 pr-4 py-4 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  placeholder="请输入验证码"
                  className="w-full pl-12 pr-28 py-4 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all"
                />
                <button
                  onClick={sendCode}
                  disabled={!phone || phone.length !== 11 || countdown > 0 || loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:text-dark-400 disabled:cursor-not-allowed transition-colors"
                >
                  {countdown > 0 ? `${countdown}s后重发` : '获取验证码'}
                </button>
              </div>
              <button
                onClick={handlePhoneLogin}
                disabled={!phone || !code || loading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? '登录中...' : '验证码登录'}
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>

              {/* 手机号密码登录(折叠) */}
              <div className="rounded-xl border border-dark-300 p-4">
                <p className="text-xs text-dark-500 mb-3 font-medium">或用密码登录</p>
                <div className="relative mb-3">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="密码"
                    className="w-full pl-4 pr-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 text-sm transition-all"
                  />
                </div>
                <button
                  onClick={handlePasswordLogin}
                  disabled={!phone || !password || loading}
                  className="w-full py-3 bg-dark-900 text-white font-medium rounded-xl hover:bg-dark-800 transition-all disabled:opacity-40 text-sm"
                >
                  密码登录
                </button>
              </div>
            </div>
          )}

          <div className="mt-7 pt-5 border-t border-dark-200 text-center">
            <span className="text-dark-500 text-sm">
              {isRegister ? '已有账号？' : '还没有账号？'}
            </span>
            <button
              onClick={toggleRegister}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium ml-1"
            >
              {isRegister ? '立即登录' : '立即注册'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-dark-500 mt-6">
          登录即表示同意
          <a href="#" className="text-dark-600 hover:text-primary-600 mx-1">《用户协议》</a>
          和
          <a href="#" className="text-dark-600 hover:text-primary-600 mx-1">《隐私政策》</a>
        </p>

        <Link
          to="/"
          className="flex items-center justify-center gap-2 mt-8 text-dark-500 hover:text-dark-900 transition-colors text-sm"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          返回首页
        </Link>
      </div>
    </div>
  );
};

export default Login;
