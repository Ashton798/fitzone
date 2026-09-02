import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Lock, Eye, Bell, Smartphone, Key, User,
  Trash2, ChevronLeft, ChevronRight, Check, AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { getToken } from '@/lib/api';

const Privacy = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isLoggedIn = !!getToken();

  // 隐私设置
  const [settings, setSettings] = useState({
    profilePublic: true,        // 主页公开
    showWorkoutStats: true,     // 显示训练数据
    allowFriendRequests: true,  // 允许好友请求
    showOnlineStatus: true,     // 显示在线状态
    allowSearch: true,          // 允许搜索到我
    showLocation: false,        // 显示位置
  });

  // 通知设置
  const [notifSettings, setNotifSettings] = useState({
    systemNotif: true,
    likeNotif: true,
    commentNotif: true,
    followNotif: true,
    messageNotif: true,
    marketingNotif: false,
  });

  const togglePrivacy = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleNotif = (key: keyof typeof notifSettings) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      localStorage.removeItem('fitzone_token');
      localStorage.removeItem('fitzone_user');
      logout();
      navigate('/');
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('确定要注销账号吗？此操作不可恢复，所有数据将被永久删除！')) {
      if (confirm('再次确认：注销后无法找回账号和数据，确定继续吗？')) {
        localStorage.removeItem('fitzone_token');
        localStorage.removeItem('fitzone_user');
        logout();
        alert('账号已注销');
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen bg-dark-100 pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* 顶部标题栏 */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-dark-200 text-dark-500 hover:text-dark-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-dark-900">隐私与安全</h1>
          </div>
        </div>

        {/* 账号信息 */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-dark-500 mb-3 px-1">账号信息</h2>
          <div className="bg-white rounded-2xl border border-dark-300 overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-dark-200">
              <div className="w-14 h-14 rounded-full bg-primary-500 flex items-center justify-center">
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-dark-900">{user?.nickname || '未登录用户'}</p>
                <p className="text-sm text-dark-500">{user?.phone || '未绑定手机号'}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-dark-500" />
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 p-4 hover:bg-dark-100 transition-colors"
            >
              <User className="w-5 h-5 text-primary-600" />
              <span className="flex-1 text-left text-dark-900">编辑个人资料</span>
              <ChevronRight className="w-5 h-5 text-dark-500" />
            </button>
          </div>
        </section>

        {/* 账号安全 */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-dark-500 mb-3 px-1">账号安全</h2>
          <div className="bg-white rounded-2xl border border-dark-300 overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-dark-200">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-dark-900">手机号</p>
                <p className="text-xs text-dark-500">{user?.phone ? `已绑定 ${user.phone.slice(0,3)}****${user.phone.slice(-4)}` : '未绑定'}</p>
              </div>
              <span className="px-2.5 py-1 text-xs bg-accent-50 text-accent-700 rounded-full">已验证</span>
            </div>
            <div className="flex items-center gap-3 p-4 border-b border-dark-200">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-dark-900">登录密码</p>
                <p className="text-xs text-dark-500">建议定期更换密码</p>
              </div>
              <button className="px-3 py-1.5 text-sm text-primary-600 hover:text-primary-700 transition-colors">
                修改
              </button>
            </div>
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-vibe-purple/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-vibe-purple" />
              </div>
              <div className="flex-1">
                <p className="text-dark-900">登录设备管理</p>
                <p className="text-xs text-dark-500">当前设备 · 1 台设备已登录</p>
              </div>
              <ChevronRight className="w-5 h-5 text-dark-500" />
            </div>
          </div>
        </section>

        {/* 隐私设置 */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-dark-500 mb-3 px-1">隐私设置</h2>
          <div className="bg-white rounded-2xl border border-dark-300 overflow-hidden">
            <ToggleRow
              icon={Eye}
              iconColor="text-blue-400"
              bgColor="bg-blue-500/20"
              title="公开个人主页"
              desc="其他人可以查看你的主页和动态"
              value={settings.profilePublic}
              onChange={() => togglePrivacy('profilePublic')}
            />
            <ToggleRow
              icon={User}
              iconColor="text-green-400"
              bgColor="bg-green-500/20"
              title="允许好友请求"
              desc="其他人可以向你发送好友请求"
              value={settings.allowFriendRequests}
              onChange={() => togglePrivacy('allowFriendRequests')}
            />
            <ToggleRow
              icon={Bell}
              iconColor="text-yellow-400"
              bgColor="bg-yellow-500/20"
              title="显示在线状态"
              desc="好友可以看到你的在线状态"
              value={settings.showOnlineStatus}
              onChange={() => togglePrivacy('showOnlineStatus')}
            />
            <ToggleRow
              icon={Eye}
              iconColor="text-vibe-purple"
              bgColor="bg-vibe-purple/20"
              title="允许搜索到我"
              desc="其他人可以通过手机号搜索到你"
              value={settings.allowSearch}
              onChange={() => togglePrivacy('allowSearch')}
            />
            <ToggleRow
              icon={Eye}
              iconColor="text-pink-400"
              bgColor="bg-pink-500/20"
              title="显示训练数据"
              desc="在社区展示你的训练时长和打卡记录"
              value={settings.showWorkoutStats}
              onChange={() => togglePrivacy('showWorkoutStats')}
              last
            />
          </div>
        </section>

        {/* 通知设置 */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-dark-500 mb-3 px-1">通知设置</h2>
          <div className="bg-white rounded-2xl border border-dark-300 overflow-hidden">
            <ToggleRow
              icon={Bell}
              iconColor="text-primary-600"
              bgColor="bg-primary-500/20"
              title="系统通知"
              desc="账号安全、版本更新等重要通知"
              value={notifSettings.systemNotif}
              onChange={() => toggleNotif('systemNotif')}
            />
            <ToggleRow
              icon={Bell}
              iconColor="text-red-400"
              bgColor="bg-red-500/20"
              title="点赞提醒"
              desc="有人点赞你的动态时通知"
              value={notifSettings.likeNotif}
              onChange={() => toggleNotif('likeNotif')}
            />
            <ToggleRow
              icon={Bell}
              iconColor="text-blue-400"
              bgColor="bg-blue-500/20"
              title="评论提醒"
              desc="有人评论你的动态时通知"
              value={notifSettings.commentNotif}
              onChange={() => toggleNotif('commentNotif')}
            />
            <ToggleRow
              icon={Bell}
              iconColor="text-green-400"
              bgColor="bg-green-500/20"
              title="关注提醒"
              desc="有新粉丝关注你时通知"
              value={notifSettings.followNotif}
              onChange={() => toggleNotif('followNotif')}
            />
            <ToggleRow
              icon={Bell}
              iconColor="text-vibe-purple"
              bgColor="bg-vibe-purple/20"
              title="私信提醒"
              desc="收到新私信时通知"
              value={notifSettings.messageNotif}
              onChange={() => toggleNotif('messageNotif')}
            />
            <ToggleRow
              icon={Bell}
              iconColor="text-orange-400"
              bgColor="bg-orange-500/20"
              title="营销活动"
              desc="优惠活动、课程推荐等推送"
              value={notifSettings.marketingNotif}
              onChange={() => toggleNotif('marketingNotif')}
              last
            />
          </div>
        </section>

        {/* 数据管理 */}
        <section className="mb-6">
          <h2 className="text-sm font-semibold text-dark-500 mb-3 px-1">数据管理</h2>
          <div className="bg-white rounded-2xl border border-dark-300 overflow-hidden">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-dark-100 transition-colors border-b border-dark-200">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-dark-900">查看我的数据</p>
                <p className="text-xs text-dark-500">下载你的所有数据</p>
              </div>
              <ChevronRight className="w-5 h-5 text-dark-500" />
            </button>
            <button className="w-full flex items-center gap-3 p-4 hover:bg-dark-100 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-dark-900">清除缓存</p>
                <p className="text-xs text-dark-500">清理本地存储的数据</p>
              </div>
              <ChevronRight className="w-5 h-5 text-dark-500" />
            </button>
          </div>
        </section>

        {/* 危险操作区 */}
        {isLoggedIn && (
          <section className="mb-6">
            <h2 className="text-sm font-semibold text-dark-500 mb-3 px-1">账号操作</h2>
            <div className="bg-white rounded-2xl border border-dark-300 overflow-hidden">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 hover:bg-dark-100 transition-colors border-b border-dark-200"
              >
                <div className="w-10 h-10 rounded-xl bg-dark-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-dark-600" />
                </div>
                <span className="flex-1 text-left text-dark-900">退出登录</span>
                <ChevronRight className="w-5 h-5 text-dark-500" />
              </button>
              <button
                onClick={handleDeleteAccount}
                className="w-full flex items-center gap-3 p-4 hover:bg-red-500/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-vibe-red" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-vibe-red">注销账号</p>
                  <p className="text-xs text-dark-500">永久删除账号和所有数据</p>
                </div>
                <ChevronRight className="w-5 h-5 text-dark-500" />
              </button>
            </div>
          </section>
        )}

        {/* 底部说明 */}
        <div className="mt-8 p-4 bg-dark-100 rounded-xl border border-dark-300">
          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-dark-600 leading-relaxed">
              FitZone 重视你的隐私安全。我们严格遵循相关法律法规保护你的个人信息。
              你的训练数据仅用于提供更好的服务体验，绝不会未经授权分享给第三方。
              了解更多请阅读<a href="/help" className="text-primary-600 hover:text-primary-700"> 帮助中心</a>。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// 开关行组件
interface ToggleRowProps {
  icon: typeof Shield;
  iconColor: string;
  bgColor: string;
  title: string;
  desc: string;
  value: boolean;
  onChange: () => void;
  last?: boolean;
}

const ToggleRow = ({ icon: Icon, iconColor, bgColor, title, desc, value, onChange, last }: ToggleRowProps) => (
  <div className={`flex items-center gap-3 p-4 ${!last ? 'border-b border-dark-200' : ''}`}>
    <div className={`w-10 h-10 rounded-xl ${bgColor} flex items-center justify-center`}>
      <Icon className={`w-5 h-5 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-dark-900">{title}</p>
      <p className="text-xs text-dark-500">{desc}</p>
    </div>
    <button
      onClick={onChange}
      className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
        value ? 'bg-primary-500' : 'bg-dark-300'
      }`}
    >
      <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform flex items-center justify-center ${
        value ? 'translate-x-5' : 'translate-x-0'
      }`}>
        {value && <Check className="w-3 h-3 text-primary-500" />}
      </span>
    </button>
  </div>
);

export default Privacy;
