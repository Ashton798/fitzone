import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, ChevronRight, LogOut, Dumbbell, Flame, Target,
  Bell, Shield, HelpCircle, UserCircle, Camera,
  Save, X, Upload,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import { getToken } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import CheckinCalendar from '@/components/CheckinCalendar';

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

// 背景纯色选项：白色 / 黑色
type BgMode = 'white' | 'black';
const BG_OPTIONS: { mode: BgMode; label: string }[] = [
  { mode: 'white', label: '白色' },
  { mode: 'black', label: '黑色' },
];
const DEFAULT_BG: BgMode = 'white';

const LOCAL_AVATAR_KEY = 'fitzone_local_avatar';
const LOCAL_BG_KEY = 'fitzone_local_background';

// 把上传的图片文件压缩到合理大小（最大 400px，JPEG 0.85）
const compressImage = (file: File, maxSize = 400): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas 不可用'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const Profile = () => {
  const navigate = useNavigate();
  const { updateUser: updateStoreUser, user: storeUser } = useAuthStore();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // 本地头像 / 背景色（独立于后端）
  const [localAvatar, setLocalAvatar] = useState<string>('');
  const [background, setBackground] = useState<BgMode>(DEFAULT_BG);

  const [editForm, setEditForm] = useState({
    nickname: '',
    avatar: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);

  // 编辑弹窗内的临时背景色选择
  const [editBackground, setEditBackground] = useState<BgMode>(DEFAULT_BG);
  const [editLocalAvatar, setEditLocalAvatar] = useState<string>('');

  const editAvatarFileRef = useRef<HTMLInputElement>(null);
  const isLoggedIn = !!getToken();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    loadUser();
    // 加载本地头像和背景色
    setLocalAvatar(localStorage.getItem(LOCAL_AVATAR_KEY) || '');
    const savedBg = localStorage.getItem(LOCAL_BG_KEY) as BgMode | null;
    setBackground(savedBg === 'black' ? 'black' : 'white');
    setEditBackground(savedBg === 'black' ? 'black' : 'white');
  }, [isLoggedIn]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const userData = await authApi.getCurrentUser();
      if (userData.avatar && userData.avatar.startsWith('data:')) {
        userData.avatar = DEFAULT_AVATAR;
      }
      if (!userData.avatar) {
        userData.avatar = DEFAULT_AVATAR;
      }
      setUser(userData);
      setEditForm({
        nickname: userData.nickname || '',
        avatar: userData.avatar || DEFAULT_AVATAR,
        bio: userData.bio || '',
      });
      updateStoreUser(userData);
    } catch (error) {
      console.error('加载用户信息失败:', error);
      if (storeUser) {
        setUser(storeUser);
        setEditForm({
          nickname: storeUser.nickname || '',
          avatar: storeUser.avatar || DEFAULT_AVATAR,
          bio: (storeUser as any).bio || '',
        });
      }
    }
    setLoading(false);
  };

  // 实际显示的头像：本地头像 > 后端头像
  const displayAvatar = localAvatar || user?.avatar || DEFAULT_AVATAR;
  const editDisplayAvatar = editLocalAvatar || editForm.avatar;

  const handleSave = async () => {
    if (!editForm.nickname.trim()) {
      alert('昵称不能为空');
      return;
    }

    // 头像：有本地上传则存 localStorage；否则用默认头像
    if (editLocalAvatar) {
      localStorage.setItem(LOCAL_AVATAR_KEY, editLocalAvatar);
      setLocalAvatar(editLocalAvatar);
    } else {
      let safeAvatar = editForm.avatar;
      if (safeAvatar && safeAvatar.startsWith('data:')) {
        safeAvatar = DEFAULT_AVATAR;
      }
      if (!safeAvatar) safeAvatar = DEFAULT_AVATAR;
      editForm.avatar = safeAvatar;
      // 清除之前的本地头像
      localStorage.removeItem(LOCAL_AVATAR_KEY);
      setLocalAvatar('');
    }

    // 背景色：存 localStorage
    localStorage.setItem(LOCAL_BG_KEY, editBackground);
    setBackground(editBackground);

    setSaving(true);
    try {
      const result = await authApi.updateUser({
        nickname: editForm.nickname,
        avatar: editForm.avatar,
        bio: editForm.bio,
      });
      if (result.success) {
        const updatedUser = {
          ...result.user,
          avatar: result.user.avatar || DEFAULT_AVATAR,
        };
        setUser(updatedUser);
        updateStoreUser(updatedUser);
        setEditing(false);
      }
    } catch (error) {
      console.error('保存失败:', error);
      // 即使后端失败，本地头像和背景图也已保存
      setEditing(false);
    }
    setSaving(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('fitzone_token');
    localStorage.removeItem('fitzone_user');
    navigate('/');
    window.location.reload();
  };

  // 头像上传处理（编辑弹窗内）
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    try {
      const compressed = await compressImage(file);
      setEditLocalAvatar(compressed);
      // 同时清空预设选择（本地上传优先）
      setEditForm({ ...editForm, avatar: '' });
    } catch (err) {
      alert('图片处理失败，请重试');
    }
    e.target.value = '';
  };

  // 直接在主页切换背景色（不打开编辑弹窗）
  const handleQuickBgToggle = () => {
    const next: BgMode = background === 'white' ? 'black' : 'white';
    localStorage.setItem(LOCAL_BG_KEY, next);
    setBackground(next);
  };

  const menuItems = [
    { icon: UserCircle, label: '个人资料', desc: '修改头像、背景色、昵称', onClick: () => setEditing(true) },
    { icon: Bell, label: '消息通知', desc: '推送与提醒设置', onClick: () => navigate('/notifications') },
    { icon: Shield, label: '隐私安全', desc: '账号安全设置', onClick: () => navigate('/privacy') },
    { icon: HelpCircle, label: '帮助中心', desc: '常见问题解答', onClick: () => navigate('/help') },
  ];

  if (!isLoggedIn) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <div className="animate-pulse text-dark-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-100">
      {/* ============ 编辑资料弹窗 ============ */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-elevation-5">
            {/* 弹窗头 */}
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-dark-200 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold font-display text-dark-900">编辑资料</h3>
              <button
                onClick={() => setEditing(false)}
                className="w-9 h-9 rounded-full hover:bg-dark-200 flex items-center justify-center text-dark-500 hover:text-dark-800 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 背景色选择 */}
              <div>
                <label className="text-xs font-semibold text-dark-700 uppercase tracking-wider mb-2 block">
                  个人主页背景色
                </label>
                <div
                  className="relative h-28 rounded-2xl overflow-hidden mb-3 border border-dark-200"
                  style={{ background: editBackground === 'black' ? '#000000' : '#FFFFFF' }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-medium ${editBackground === 'black' ? 'text-white/70' : 'text-dark-400'}`}>
                      {editBackground === 'black' ? '黑色背景' : '白色背景'}
                    </span>
                  </div>
                </div>
                {/* 颜色选择 */}
                <div className="flex gap-2">
                  {BG_OPTIONS.map(opt => (
                    <button
                      key={opt.mode}
                      onClick={() => setEditBackground(opt.mode)}
                      className={`flex-1 h-12 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                        editBackground === opt.mode
                          ? 'border-primary-500 ring-2 ring-primary-500/20'
                          : 'border-dark-300 hover:border-dark-400'
                      }`}
                      style={{ background: opt.mode === 'black' ? '#000000' : '#FFFFFF' }}
                    >
                      <span className={opt.mode === 'black' ? 'text-white' : 'text-dark-800'}>
                        {opt.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 头像选择 */}
              <div>
                <label className="text-xs font-semibold text-dark-700 uppercase tracking-wider mb-2 block">
                  头像
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={editDisplayAvatar}
                      alt="当前头像"
                      className="w-20 h-20 rounded-full object-cover ring-4 ring-dark-200 bg-white"
                    />
                    <button
                      onClick={() => editAvatarFileRef.current?.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-elevation-2 hover:bg-primary-600 transition-colors"
                      aria-label="上传头像"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => editAvatarFileRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      上传自定义头像
                    </button>
                    <p className="text-xs text-dark-500 mt-2">
                      支持 JPG/PNG，将自动压缩处理；未上传时使用默认头像
                    </p>
                  </div>
                </div>
                <input
                  ref={editAvatarFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* 昵称 */}
              <div>
                <label className="text-xs font-semibold text-dark-700 uppercase tracking-wider mb-2 block">
                  昵称
                </label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  placeholder="设置你的昵称"
                  maxLength={20}
                  className="w-full px-4 py-3 bg-dark-100 border border-dark-300 rounded-xl text-dark-900 placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 transition-all"
                />
                <div className="text-xs text-dark-500 mt-1 text-right">{editForm.nickname.length}/20</div>
              </div>

              {/* 个性签名 */}
              <div>
                <label className="text-xs font-semibold text-dark-700 uppercase tracking-wider mb-2 block">
                  个性签名
                </label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="介绍一下自己吧..."
                  rows={3}
                  maxLength={100}
                  className="w-full px-4 py-3 bg-dark-100 border border-dark-300 rounded-xl text-dark-900 placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 transition-all resize-none"
                />
                <div className="text-xs text-dark-500 mt-1 text-right">{editForm.bio.length}/100</div>
              </div>
            </div>

            {/* 弹窗底 */}
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-dark-200 flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-3 bg-dark-100 text-dark-700 font-semibold rounded-full hover:bg-dark-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.nickname.trim()}
                className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-full hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    保存中
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    保存修改
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 顶部封面 + 头像 ============ */}
      <div className="relative">
        {/* 背景色 */}
        <div
          className="h-56 md:h-64 w-full relative overflow-hidden transition-colors"
          style={{ background: background === 'black' ? '#000000' : '#FFFFFF' }}
        >
          {/* 切换背景色按钮 */}
          <button
            onClick={handleQuickBgToggle}
            className={`absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-2 backdrop-blur-sm rounded-full text-xs font-medium transition-colors ${
              background === 'black'
                ? 'bg-white/15 text-white hover:bg-white/25'
                : 'bg-black/10 text-dark-700 hover:bg-black/20'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            切换背景色
          </button>
        </div>

        <div className="container mx-auto px-4">
          <div className="relative -mt-20 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              {/* 头像 */}
              <div className="relative">
                <img
                  src={displayAvatar}
                  alt="头像"
                  className="w-32 h-32 rounded-3xl border-4 border-white object-cover shadow-elevation-3 bg-white"
                />
                <button
                  onClick={() => setEditing(true)}
                  className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center shadow-elevation-2 hover:bg-primary-600 transition-colors"
                  aria-label="更换头像"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* 用户信息 */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold font-display text-dark-900">
                    {user?.nickname || '健身达人'}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 bg-accent-50 text-accent-700 text-xs font-semibold rounded-full border border-accent-200">
                    Lv.{user?.level || 1}
                  </span>
                </div>
                {user?.bio && (
                  <p className="text-dark-600 mt-1.5 max-w-md text-sm">{user.bio}</p>
                )}
                <p className="text-dark-500 text-xs mt-2">
                  {user?.email
                    ? `邮箱 ${user.email}`
                    : user?.phone
                      ? `手机号 ${user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}`
                      : '账号信息未完善'}
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pb-2">
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-dark-800 rounded-full text-sm font-semibold border border-dark-300 hover:bg-dark-100 hover:shadow-card transition-all"
                >
                  <User className="w-4 h-4" />
                  编辑资料
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-vibe-red rounded-full text-sm font-semibold border border-dark-300 hover:bg-vibe-red/8 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  退出
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ 内容区 ============ */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧 - 菜单 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-dark-300 overflow-hidden">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 p-4 hover:bg-dark-100 transition-colors border-b border-dark-200 last:border-b-0 text-left"
                >
                  <div className="w-10 h-10 bg-dark-100 rounded-xl flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-dark-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-dark-900 font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-dark-500 truncate">{item.desc}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-dark-400" />
                </button>
              ))}
            </div>
          </div>

          {/* 右侧 - 资料卡 + 快捷入口 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 个人资料卡 */}
            <div className="bg-white rounded-2xl border border-dark-300 p-6">
              <h3 className="font-bold font-display text-dark-900 mb-5">个人资料</h3>
              <div className="space-y-3">
                {/* 头像行 */}
                <div className="flex items-center gap-4 p-4 bg-dark-100 rounded-xl">
                  <img
                    src={displayAvatar}
                    alt="头像"
                    className="w-16 h-16 rounded-full ring-2 ring-dark-300 object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-dark-900 font-semibold">{user?.nickname}</div>
                    <div className="text-xs text-dark-500 mt-1">
                      {user?.phone ? `手机 ${user.phone}` : '未绑定手机'}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors"
                  >
                    修改
                  </button>
                </div>

                {/* 背景色行 */}
                <div className="flex items-center gap-4 p-4 bg-dark-100 rounded-xl">
                  <div
                    className="w-16 h-16 rounded-xl ring-2 ring-dark-300 shrink-0 border border-dark-200"
                    style={{ background: background === 'black' ? '#000000' : '#FFFFFF' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-dark-900 font-semibold text-sm">主页背景色</div>
                    <div className="text-xs text-dark-500 mt-1">
                      {background === 'black' ? '黑色' : '白色'}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors"
                  >
                    更换
                  </button>
                </div>

                {/* 签名 */}
                <div className="p-4 bg-dark-100 rounded-xl">
                  <div className="text-xs text-dark-500 mb-1">个性签名</div>
                  <div className="text-dark-800 text-sm">{user?.bio || '还没有设置个性签名'}</div>
                </div>

                {/* 等级 */}
                <div className="p-4 bg-dark-100 rounded-xl">
                  <div className="text-xs text-dark-500 mb-2">用户等级</div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 bg-accent-50 text-accent-700 rounded-full text-xs font-semibold border border-accent-200">
                      Lv.{user?.level || 1}
                    </span>
                    <span className="text-dark-600 text-sm">
                      经验值 {user?.experience || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 训练打卡日历(打卡日期颜色变化) */}
            <CheckinCalendar />

            {/* 快捷入口 */}
            <div className="bg-white rounded-2xl border border-dark-300 p-6">
              <h3 className="font-bold font-display text-dark-900 mb-5">快捷入口</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/community"
                  className="flex items-center gap-3 p-4 bg-dark-100 rounded-xl hover:bg-dark-200 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FCE8E6' }}>
                    <Flame className="w-5 h-5" style={{ color: '#EA4335' }} />
                  </div>
                  <div>
                    <div className="text-dark-900 font-medium text-sm">健身打卡</div>
                    <div className="text-xs text-dark-500">续火花</div>
                  </div>
                </Link>
                <Link
                  to="/chat"
                  className="flex items-center gap-3 p-4 bg-dark-100 rounded-xl hover:bg-dark-200 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E8F0FE' }}>
                    <Dumbbell className="w-5 h-5" style={{ color: '#1A73E8' }} />
                  </div>
                  <div>
                    <div className="text-dark-900 font-medium text-sm">私信聊天</div>
                    <div className="text-xs text-dark-500">和朋友互动</div>
                  </div>
                </Link>
                <Link
                  to="/meal-plan"
                  className="flex items-center gap-3 p-4 bg-dark-100 rounded-xl hover:bg-dark-200 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E6F4EA' }}>
                    <Target className="w-5 h-5" style={{ color: '#34A853' }} />
                  </div>
                  <div>
                    <div className="text-dark-900 font-medium text-sm">饮食计划</div>
                    <div className="text-xs text-dark-500">科学饮食</div>
                  </div>
                </Link>
                <Link
                  to="/ai-coach"
                  className="flex items-center gap-3 p-4 bg-dark-100 rounded-xl hover:bg-dark-200 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F3E8FD' }}>
                    <User className="w-5 h-5" style={{ color: '#A142F4' }} />
                  </div>
                  <div>
                    <div className="text-dark-900 font-medium text-sm">AI 教练</div>
                    <div className="text-xs text-dark-500">智能指导</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
