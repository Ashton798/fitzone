/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================
// FitZone 真实后端 API 客户端
// 所有数据存服务器(data/*.json),支持邮箱注册/登录、社区真实发帖等
// 部署: 通过 VITE_API_BASE_URL 指定后端地址(如 https://xxx.onrender.com/api)
// 开发: 默认同源 /api(本地由 vite proxy 转发到 3001)
// ============================================================

const BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && (window as any).__FITZONE_API__) ||
  '/api';

// 存储token
export const setToken = (token: string) => {
  localStorage.setItem('fitzone_token', token);
};

export const getToken = () => {
  return localStorage.getItem('fitzone_token');
};

export const clearToken = () => {
  localStorage.removeItem('fitzone_token');
};

const authHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...authHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };
  const resp = await fetch(BASE + path, { ...options, headers });
  if (!resp.ok) {
    let msg = `请求失败 (${resp.status})`;
    try {
      const data = await resp.json();
      if (data?.error) msg = data.error;
    } catch { /* ignore */ }
    const err: any = new Error(msg);
    err.status = resp.status;
    throw err;
  }
  return resp.json();
}

const getCurrentUserId = (): string | null => {
  try {
    const user = localStorage.getItem('fitzone_user');
    return user ? (JSON.parse(user).id || null) : null;
  } catch {
    return null;
  }
};

// ==================== 本地字段适配 ====================
// 后端帖子字段: userId/createdAt → 前端展示字段 user_id/created_at
const adaptPost = (p: any) => ({
  ...p,
  user_id: p.userId || p.user_id,
  created_at: p.createdAt || p.created_at,
  isCheckIn: (p.content || '').includes('#打卡') || (p.tags || []).includes('健身打卡'),
});

// ==================== 认证 API ====================
export const authApi = {
  // 发送手机验证码
  sendCode: async (phone: string, type: 'login' | 'register' = 'login') => {
    const data = await request('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone, type }),
    });
    return data;
  },

  // 手机号验证码登录
  loginWithPhone: async (phone: string, code: string) => {
    return request('/auth/login-phone', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    });
  },

  // 手机号密码登录
  loginWithPassword: async (phone: string, password: string) => {
    return request('/auth/login-password', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
  },

  // ============ 邮箱注册 / 登录(真实账号) ============
  registerWithEmail: async (email: string, password: string, nickname?: string) => {
    return request('/auth/register-email', {
      method: 'POST',
      body: JSON.stringify({ email, password, nickname }),
    });
  },

  loginWithEmail: async (email: string, password: string) => {
    return request('/auth/login-email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // 获取当前用户信息(登录后账号记录)
  getCurrentUser: async () => {
    const user = await request('/auth/me', { method: 'GET' });
    return {
      id: user.id,
      phone: user.phone,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio || '',
      level: user.level,
      experience: user.experience,
    };
  },

  // 更新用户信息
  updateUser: async (data: { nickname?: string; avatar?: string; bio?: string }) => {
    return request('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // 登出
  logout: () => {
    clearToken();
  },
};

// ==================== 好友 API ====================
export const friendsApi = {
  getFriends: async () => {
    const list = await request<any[]>('/friends', { method: 'GET' });
    return list.map(u => ({ id: u.id, nickname: u.nickname, avatar: u.avatar, level: u.level, bio: u.bio }));
  },

  getPendingRequests: async () => {
    const list = await request<any[]>('/friends/pending', { method: 'GET' });
    return list;
  },

  sendFriendRequest: async (friendId: string) => {
    return request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ friendId }),
    });
  },

  acceptFriendRequest: async (requestId: string) => {
    return request('/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    });
  },

  rejectFriendRequest: async (requestId: string) => {
    return request('/friends/reject', {
      method: 'POST',
      body: JSON.stringify({ requestId }),
    });
  },

  removeFriend: async (friendId: string) => {
    return request(`/friends/${friendId}`, { method: 'DELETE' });
  },

  searchUsers: async (query: string) => {
    return request(`/users/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
  },
};

// ==================== 消息 API ====================
export const messagesApi = {
  getConversations: async () => {
    const list = await request<any[]>('/messages/conversations', { method: 'GET' });
    return list;
  },

  getMessages: async (otherUserId: string) => {
    const list = await request<any[]>(`/messages/${otherUserId}`, { method: 'GET' });
    return list;
  },

  sendMessage: async (receiverId: string, content: string) => {
    return request('/messages', {
      method: 'POST',
      body: JSON.stringify({ receiverId, content }),
    });
  },
};

// ==================== 社区帖子 API ====================
export const postsApi = {
  // 获取帖子(tab: hot/new/following)。游客可浏览
  getPosts: async (tab: 'hot' | 'new' | 'following' = 'new', userId?: string) => {
    const params = new URLSearchParams({ tab });
    if (userId) params.set('userId', userId);
    const list = await request<any[]>(`/posts?${params.toString()}`, { method: 'GET' });
    return list.map(adaptPost);
  },

  // 发布帖子(必须真实登录)
  createPost: async (content: string, images: string[] = [], tags: string[] = []) => {
    const post = await request('/posts', {
      method: 'POST',
      body: JSON.stringify({ content, images, tags }),
    });
    return adaptPost(post);
  },

  likePost: async (postId: string) => {
    return request(`/posts/${postId}/like`, { method: 'POST' });
  },

  getComments: async (postId: string) => {
    const list = await request<any[]>(`/posts/${postId}/comments`, { method: 'GET' });
    return list.map((c: any) => ({
      ...c,
      createdAt: c.createdAt || c.created_at,
      nickname: c.nickname || '匿名',
      avatar: c.avatar || '',
    }));
  },

  createComment: async (postId: string, content: string) => {
    return request(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

// ==================== 饮食计划 API ====================
export const mealsApi = {
  // 获取某天饮食(date: YYYY-MM-DD)
  getMeals: async (date?: string) => {
    const params = date ? `?date=${date}` : '';
    const list = await request<any[]>(`/meals${params}`, { method: 'GET' });
    return list.map((m: any) => ({
      id: m.id,
      date: m.date,
      meal_type: m.mealType || m.meal_type,
      name: m.name,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      description: m.description || '',
      image: m.image || '',
      eaten: m.eaten !== false, // 默认已吃
      eatenAt: m.eatenAt,
      createdAt: m.createdAt,
    }));
  },

  // 添加已吃记录或未来餐食计划。
  addMeal: async (data: any) => {
    const meal = await request('/meals', {
      method: 'POST',
      body: JSON.stringify({ ...data, eaten: data.eaten !== false }),
    });
    return meal;
  },

  // 标记已吃 / 取消
  markEaten: async (mealId: string, eaten: boolean) => {
    return request(`/meals/${mealId}/eaten`, {
      method: 'PUT',
      body: JSON.stringify({ eaten }),
    });
  },

  deleteMeal: async (mealId: string) => {
    return request(`/meals/${mealId}`, { method: 'DELETE' });
  },
};

export const nutritionApi = {
  getProfile: async () => request('/nutrition/profile', { method: 'GET' }),
  saveProfile: async (data: any) => request('/nutrition/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// ==================== 训练打卡(日历) API ====================
export const checkinsApi = {
  // 我的所有打卡日期
  getCheckins: async (): Promise<string[]> => {
    const list = await request<any[]>('/checkins', { method: 'GET' });
    return list.map((c: any) => c.date);
  },

  // 打卡/取消
  toggleCheckin: async (date: string) => {
    return request('/checkins', {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  },
};

// ==================== 训练记录 API ====================
export const workoutsApi = {
  getWorkouts: async (limit?: number, status?: 'in_progress' | 'completed') => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (status) params.set('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    const list = await request<any[]>(`/workouts${query}`, { method: 'GET' });
    return list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getWorkout: async (id: string) => request(`/workouts/${id}`, { method: 'GET' }),

  getActiveWorkout: async () => request('/workouts/active', { method: 'GET' }),

  startWorkout: async (data: { name: string; planId?: string; date?: string }) => {
    return request('/workouts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  saveWorkout: async (id: string, data: any) => request(`/workouts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  completeWorkout: async (id: string, data: any) => request(`/workouts/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  deleteWorkout: async (id: string) => request(`/workouts/${id}`, { method: 'DELETE' }),

  getLastPerformance: async (exerciseId: string) =>
    request(`/workouts/last-exercise/${encodeURIComponent(exerciseId)}`, { method: 'GET' }),

  getStats: async (range: '30d' | '3m' | '6m' | 'all' = '30d') =>
    request(`/workouts/stats?range=${range}`, { method: 'GET' }),

  getAIContext: async (days = 30) => request(`/workouts/ai-context?days=${days}`, { method: 'GET' }),
};

export const exercisesApi = {
  getExercises: async () => request('/exercises', { method: 'GET' }),
  createExercise: async (data: { name: string; muscleGroup: string }) => request('/exercises', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

export const workoutPlansApi = {
  getPlans: async () => request('/workout-plans', { method: 'GET' }),
  createPlan: async (data: any) => request('/workout-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePlan: async (id: string, data: any) => request(`/workout-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePlan: async (id: string) => request(`/workout-plans/${id}`, { method: 'DELETE' }),
};

export const planGeneratorApi = {
  workout: async (data: { goal: string; level: string; equipment: string; days: number }) => request('/ai/generate/workout-plan', {
    method: 'POST', body: JSON.stringify(data),
  }),
  meals: async (data: { goal: string; calories: number; preferences: string }) => request('/ai/generate/meal-plan', {
    method: 'POST', body: JSON.stringify(data),
  }),
};

// ==================== 收藏 API ====================
export const favoritesApi = {
  getFavorites: async () => {
    const list = await request<any[]>('/favorites', { method: 'GET' });
    return list;
  },

  toggleFavorite: async (videoId: string) => {
    return request('/favorites', {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    });
  },
};

// 供旧代码兼容
export { getCurrentUserId };
