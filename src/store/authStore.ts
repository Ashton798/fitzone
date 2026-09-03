/* eslint-disable @typescript-eslint/no-explicit-any */
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

// 安全加载用户数据。头像可能是服务器保存的压缩 data URL。
const safeLoadUser = (): User | null => {
  try {
    const stored = localStorage.getItem('fitzone_user');
    if (!stored) return null;

    const user = JSON.parse(stored);
    let needFix = false;

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
  } catch {
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
      const safeUser = { ...userData, avatar: userData.avatar || DEFAULT_AVATAR };
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

      const updatedUser = { ...user, ...data };
      localStorage.setItem('fitzone_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    },
  };
});

// 安全获取头像URL的工具函数
export const getSafeAvatar = (avatar?: string): string => {
  if (!avatar) return DEFAULT_AVATAR;
  return avatar;
};
