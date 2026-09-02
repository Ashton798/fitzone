import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  login: (userData: any) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix';

// 安全加载用户数据 - 自动修复base64头像等问题
const safeLoadUser = (): User | null => {
  try {
    const stored = localStorage.getItem('fitzone_user');
    if (!stored) return null;

    const user = JSON.parse(stored);
    let needFix = false;

    // 修复base64头像
    if (user.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('data:')) {
      user.avatar = DEFAULT_AVATAR;
      needFix = true;
    }

    // 修复空头像
    if (!user.avatar) {
      user.avatar = DEFAULT_AVATAR;
      needFix = true;
    }

    // 修复空昵称
    if (!user.nickname) {
      user.nickname = '健身达人';
      needFix = true;
    }

    if (needFix) {
      localStorage.setItem('fitzone_user', JSON.stringify(user));
    }

    return user as User;
  } catch (e) {
    // 数据损坏，直接清除
    localStorage.removeItem('fitzone_user');
    localStorage.removeItem('fitzone_token');
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => {
  const initialUser = safeLoadUser();

  return {
    user: initialUser,
    isLoggedIn: !!initialUser && !!localStorage.getItem('fitzone_token'),

    login: (userData: any) => {
      const safeUser = {
        ...userData,
        avatar: (userData.avatar && !userData.avatar.startsWith('data:'))
          ? userData.avatar
          : DEFAULT_AVATAR,
      };
      localStorage.setItem('fitzone_user', JSON.stringify(safeUser));
      set({ user: safeUser, isLoggedIn: true });
    },

    logout: () => {
      localStorage.removeItem('fitzone_user');
      localStorage.removeItem('fitzone_token');
      set({ user: null, isLoggedIn: false });
    },

    updateUser: (data) => {
      const { user } = get();
      if (!user) return;

      const updatedData = { ...data };

      // 安全处理头像
      if (updatedData.avatar) {
        if (typeof updatedData.avatar === 'string' && updatedData.avatar.startsWith('data:')) {
          updatedData.avatar = DEFAULT_AVATAR;
        }
      }

      const updatedUser = { ...user, ...updatedData };
      localStorage.setItem('fitzone_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    },
  };
});

// 安全获取头像URL的工具函数
export const getSafeAvatar = (avatar?: string): string => {
  if (!avatar) return DEFAULT_AVATAR;
  if (typeof avatar === 'string' && avatar.startsWith('data:')) return DEFAULT_AVATAR;
  return avatar;
};