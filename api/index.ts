/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================
// Vercel Serverless Function 入口
// 将 Express 应用导出为 Vercel Function,处理所有 /api/* 请求
// 注意:Vercel 函数是无状态短暂的,数据使用内存存储(每次冷启动重置)
// 适合 demo 演示。生产环境应接入数据库
// ============================================================

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import aiRoutes from '../lib/ai/routes.js';
import { registerWorkoutRoutes, type WorkoutTable } from '../server/workoutRoutes.js';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'fitzone-secret-key-2024';

// ==================== 内存数据库 ====================
// 注意: Vercel 免费版无持久存储,冷启动后数据重置。
// 需要长期保留用户数据时,请把本项目部署到 Render(render.yaml 已配置 1GB 持久磁盘)
interface DB {
  users: any[];
  verificationCodes: any[];
  friendships: any[];
  messages: any[];
  posts: any[];
  postLikes: any[];
  postComments: any[];
  workoutRecords: any[];
  exercises: any[];
  workoutPlans: any[];
  personalRecords: any[];
  mealPlans: any[];
  nutritionProfiles: any[];
  favorites: any[];
  checkins: any[];
}

// 使用 globalThis 避免模块重载时数据丢失
const globalForDb = globalThis as unknown as { __fitzoneDB?: DB };

function initDB(): DB {
  return {
    users: [
      {
        id: 'demo-user-1',
        phone: '13800138000',
        nickname: '健身达人',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
        bio: '坚持健身100天 💪',
        level: 5,
        experience: 1200,
        password: bcrypt.hashSync('123456', 10),
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      }
    ],
    verificationCodes: [],
    friendships: [],
    messages: [],
    posts: [
      {
        id: 'demo-post-1',
        userId: 'demo-user-1',
        content: '今天完成了一小时力量训练,感觉太棒了!💪 #健身打卡',
        images: [],
        tags: ['健身打卡'],
        likes: 42,
        comments: 0,
        shares: 3,
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'demo-post-2',
        userId: 'demo-user-1',
        content: '晨跑 5 公里完成！🌅 坚持晨跑一个月，精力明显更充沛了。有一起晨跑的吗？',
        images: [],
        tags: ['晨跑', '打卡'],
        likes: 28,
        comments: 0,
        shares: 2,
        createdAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'demo-post-3',
        userId: 'demo-user-1',
        content: '睡前阴瑜伽 30 分钟，拉伸完睡得特别香。久坐党强烈推荐！🧘',
        images: [],
        tags: ['瑜伽', '放松'],
        likes: 19,
        comments: 0,
        shares: 1,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
      }
    ],
    postLikes: [],
    postComments: [],
    workoutRecords: [],
    exercises: [],
    workoutPlans: [],
    personalRecords: [],
    mealPlans: [],
    nutritionProfiles: [],
    favorites: [],
    checkins: []
  };
}

if (!globalForDb.__fitzoneDB) {
  globalForDb.__fitzoneDB = initDB();
}

const db = globalForDb.__fitzoneDB!;
db.nutritionProfiles ||= [];

// ==================== 中间件 ====================
app.use(cors({
  origin: true,  // 允许所有来源(同域部署,无需 CORS 限制)
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ==================== JWT 认证中间件 ====================
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: '登录已过期,请重新登录' });
  }
}

// ==================== 用户认证 API ====================

// 发送验证码
app.post('/api/auth/send-code', (req: any, res: any) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 11) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }
  const code = Math.random().toString().slice(-6);
  db.verificationCodes.push({
    id: uuidv4(),
    phone,
    code,
    type: 'login',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  });
  console.log(`[验证码] ${phone}: ${code}`);
  res.json({ success: true, message: '验证码已发送', dev_code: code });
});

// 手机号验证码登录/注册
app.post('/api/auth/login-phone', (req: any, res: any) => {
  const { phone, code } = req.body;
  if (!phone || phone.length !== 11) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }
  if (!code || code.length !== 6) {
    return res.status(400).json({ error: '请输入验证码' });
  }
  const stored = db.verificationCodes.find(
    v => v.phone === phone && v.code === code && new Date(v.expiresAt) > new Date()
  );
  if (!stored) {
    return res.status(400).json({ error: '验证码错误或已过期' });
  }
  db.verificationCodes = db.verificationCodes.filter(v => v.id !== stored.id);

  let user = db.users.find(u => u.phone === phone);
  if (!user) {
    user = {
      id: uuidv4(),
      phone,
      nickname: `健身用户${phone.slice(-4)}`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`,
      level: 1,
      experience: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.lastLogin = new Date().toISOString();
  }

  const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      level: user.level,
      experience: user.experience
    }
  });
});

// 手机号密码登录
app.post('/api/auth/login-password', (req: any, res: any) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ error: '请输入手机号和密码' });
  }
  const user = db.users.find(u => u.phone === phone);
  if (!user || !user.password) {
    return res.status(400).json({ error: '用户不存在或未设置密码' });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: '密码错误' });
  }
  user.lastLogin = new Date().toISOString();
  const token = jwt.sign({ userId: user.id, phone: user.phone }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      level: user.level,
      experience: user.experience
    }
  });
});

// ==================== 邮箱注册 / 登录(真实账号) ====================

app.post('/api/auth/register-email', (req: any, res: any) => {
  const { email, password, nickname } = req.body;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: '请输入正确的邮箱地址' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' });
  }

  const normalized = email.trim().toLowerCase();
  const existing = db.users.find(u => u.email === normalized);
  if (existing) {
    return res.status(400).json({ error: '该邮箱已注册，请直接登录' });
  }

  const userId = uuidv4();
  const user = {
    id: userId,
    email: normalized,
    password: bcrypt.hashSync(password, 10),
    nickname: (nickname || '').trim() || 'FitZone 用户',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(normalized)}`,
    bio: '',
    level: 1,
    experience: 0,
    loginType: 'email',
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  db.users.push(user);

  const token = jwt.sign({ userId, email: normalized }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      level: user.level,
      experience: user.experience,
      loginType: 'email'
    }
  });
});

app.post('/api/auth/login-email', (req: any, res: any) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: '请输入邮箱和密码' });
  }
  const normalized = email.trim().toLowerCase();
  const user = db.users.find(u => u.email === normalized);
  if (!user || !user.password) {
    return res.status(400).json({ error: '该邮箱未注册，请先注册' });
  }
  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ error: '邮箱或密码错误' });
  }
  user.lastLogin = new Date().toISOString();
  const token = jwt.sign({ userId: user.id, email: normalized }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio || '',
      level: user.level,
      experience: user.experience,
      loginType: 'email'
    }
  });
});

// 设置密码
app.post('/api/auth/set-password', authenticateToken, (req: any, res: any) => {
  const { password } = req.body;
  if (!password || password.length < 6) {
    return res.status(400).json({ error: '密码长度至少6位' });
  }
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  user.password = bcrypt.hashSync(password, 10);
  res.json({ success: true, message: '密码设置成功' });
});

// 获取当前用户
app.get('/api/auth/me', authenticateToken, (req: any, res: any) => {
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({
    id: user.id, phone: user.phone, email: user.email, nickname: user.nickname,
    avatar: user.avatar, bio: user.bio || '', level: user.level,
    experience: user.experience, createdAt: user.createdAt
  });
});

// 更新用户信息
app.put('/api/auth/me', authenticateToken, (req: any, res: any) => {
  const { nickname, avatar, bio } = req.body;
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  if (nickname) user.nickname = nickname;
  if (avatar) {
    const isImageData = typeof avatar === 'string' && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(avatar);
    const isRemoteImage = typeof avatar === 'string' && /^https?:\/\//i.test(avatar);
    if (isImageData && avatar.length <= 750_000) {
      user.avatar = avatar;
    } else if (isRemoteImage && avatar.length <= 2_000) {
      user.avatar = avatar;
    } else {
      return res.status(400).json({ error: '头像格式不支持或图片过大' });
    }
  }
  if (bio !== undefined) user.bio = bio;

  res.json({
    success: true,
    user: {
      id: user.id, phone: user.phone, nickname: user.nickname,
      avatar: user.avatar, bio: user.bio, level: user.level,
      experience: user.experience
    }
  });
});

// ==================== 社区帖子 API ====================
app.get('/api/posts', (req: any, res: any) => {
  const { tab, userId } = req.query;
  let filtered = [...db.posts];
  if (tab === 'following' && userId) {
    const friendIds = db.friendships.filter(f => f.userId === userId && f.status === 'accepted').map(f => f.friendId);
    filtered = filtered.filter(p => friendIds.includes(p.userId));
  } else if (tab === 'hot') {
    filtered.sort((a, b) => b.likes - a.likes);
  } else {
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const result = filtered.slice(0, 50).map(p => {
    const author = db.users.find(u => u.id === p.userId);
    return {
      ...p,
      nickname: author?.nickname || '用户',
      avatar: author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
    };
  });
  res.json(result);
});

app.post('/api/posts', authenticateToken, (req: any, res: any) => {
  const { content, images, tags } = req.body;
  if (!content) return res.status(400).json({ error: '内容不能为空' });
  const newPost = {
    id: uuidv4(), userId: req.user.userId, content,
    images: images || [], tags: tags || [],
    likes: 0, comments: 0, shares: 0,
    createdAt: new Date().toISOString()
  };
  db.posts.push(newPost);
  const user = db.users.find(u => u.id === req.user.userId);
  res.json({ ...newPost, nickname: user?.nickname, avatar: user?.avatar });
});

app.post('/api/posts/:postId/like', authenticateToken, (req: any, res: any) => {
  const postId = req.params.postId;
  const userId = req.user.userId;
  const existing = db.postLikes.find(l => l.postId === postId && l.userId === userId);
  const post = db.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (existing) {
    db.postLikes = db.postLikes.filter(l => l.id !== existing.id);
    post.likes--;
    res.json({ success: true, liked: false });
  } else {
    db.postLikes.push({ id: uuidv4(), postId, userId, createdAt: new Date().toISOString() });
    post.likes++;
    res.json({ success: true, liked: true });
  }
});

app.get('/api/posts/:postId/comments', (req: any, res: any) => {
  const comments = db.postComments
    .filter(c => c.postId === req.params.postId)
    .map(c => {
      const author = db.users.find(u => u.id === c.userId);
      return { ...c, nickname: author?.nickname, avatar: author?.avatar };
    });
  res.json(comments);
});

app.post('/api/posts/:postId/comments', authenticateToken, (req: any, res: any) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '内容不能为空' });
  const newComment = {
    id: uuidv4(), postId: req.params.postId, userId: req.user.userId,
    content, likes: 0, createdAt: new Date().toISOString()
  };
  db.postComments.push(newComment);
  const post = db.posts.find(p => p.id === req.params.postId);
  if (post) post.comments++;
  const user = db.users.find(u => u.id === req.user.userId);
  res.json({ ...newComment, nickname: user?.nickname, avatar: user?.avatar });
});

// ==================== 训练追踪 API ====================
registerWorkoutRoutes(app, authenticateToken, {
  get: (table: WorkoutTable) => {
    if (table === 'exercises') return db.exercises;
    if (table === 'workout_plans') return db.workoutPlans;
    if (table === 'personal_records') return db.personalRecords;
    return db.workoutRecords;
  },
  set: (table: WorkoutTable, rows: any[]) => {
    if (table === 'exercises') db.exercises = rows;
    else if (table === 'workout_plans') db.workoutPlans = rows;
    else if (table === 'personal_records') db.personalRecords = rows;
    else db.workoutRecords = rows;
  },
});

// ==================== 收藏 API ====================
app.get('/api/favorites', authenticateToken, (req: any, res: any) => {
  const userFavs = db.favorites.filter(f => f.userId === req.user.userId).map(f => f.videoId);
  res.json(userFavs);
});

app.post('/api/favorites', authenticateToken, (req: any, res: any) => {
  const { videoId } = req.body;
  const existing = db.favorites.find(f => f.userId === req.user.userId && f.videoId === videoId);
  if (existing) {
    db.favorites = db.favorites.filter(f => f.id !== existing.id);
    res.json({ success: true, favorite: false });
  } else {
    db.favorites.push({ id: uuidv4(), userId: req.user.userId, videoId, createdAt: new Date().toISOString() });
    res.json({ success: true, favorite: true });
  }
});

// ==================== 饮食计划 API ====================
app.get('/api/nutrition/profile', authenticateToken, (req: any, res: any) => {
  res.json(db.nutritionProfiles.find(row => row.userId === req.user.userId) || null);
});

app.put('/api/nutrition/profile', authenticateToken, (req: any, res: any) => {
  const allowedGenders = ['male', 'female'];
  const allowedActivities = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
  const allowedGoals = ['lose', 'maintain', 'gain'];
  const profile = {
    userId: req.user.userId,
    gender: allowedGenders.includes(req.body.gender) ? req.body.gender : 'male',
    age: Math.min(90, Math.max(10, Number(req.body.age) || 25)),
    height: Math.min(230, Math.max(120, Number(req.body.height) || 172)),
    weight: Math.min(250, Math.max(30, Number(req.body.weight) || 65)),
    activity: allowedActivities.includes(req.body.activity) ? req.body.activity : 'light',
    goal: allowedGoals.includes(req.body.goal) ? req.body.goal : 'maintain',
    updatedAt: new Date().toISOString(),
  };
  const index = db.nutritionProfiles.findIndex(row => row.userId === req.user.userId);
  if (index < 0) db.nutritionProfiles.push(profile); else db.nutritionProfiles[index] = profile;
  res.json(profile);
});

app.get('/api/meals', authenticateToken, (req: any, res: any) => {
  let userMeals = db.mealPlans.filter(m => m.userId === req.user.userId);
  if (req.query.date) userMeals = userMeals.filter(m => m.date === req.query.date);
  res.json(userMeals.slice(-30));
});

app.post('/api/meals', authenticateToken, (req: any, res: any) => {
  const { date, mealType, name, calories, protein, carbs, fat, description, image } = req.body;
  if (!date || !mealType || !name) return res.status(400).json({ error: '缺少必要字段' });
  const newMeal = {
    id: uuidv4(), userId: req.user.userId, date, mealType, name,
    calories, protein, carbs, fat, description, image,
    eaten: req.body.eaten !== undefined ? !!req.body.eaten : true,
    eatenAt: req.body.eaten === false ? null : new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  db.mealPlans.push(newMeal);
  res.json(newMeal);
});

// 标记已吃 / 取消已吃
app.put('/api/meals/:mealId/eaten', authenticateToken, (req: any, res: any) => {
  const meal = db.mealPlans.find(m => m.id === req.params.mealId && m.userId === req.user.userId);
  if (!meal) return res.status(404).json({ error: '记录不存在' });
  meal.eaten = !!req.body.eaten;
  meal.eatenAt = req.body.eaten ? new Date().toISOString() : null;
  res.json({ success: true, meal });
});

app.delete('/api/meals/:mealId', authenticateToken, (req: any, res: any) => {
  db.mealPlans = db.mealPlans.filter(m => !(m.id === req.params.mealId && m.userId === req.user.userId));
  res.json({ success: true });
});

// ==================== 训练打卡(日历) API ====================
app.get('/api/checkins', authenticateToken, (req: any, res: any) => {
  const list = db.checkins.filter(c => c.userId === req.user.userId);
  res.json(list);
});

app.post('/api/checkins', authenticateToken, (req: any, res: any) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: '缺少日期' });
  const existing = db.checkins.find(c => c.userId === req.user.userId && c.date === date);
  if (existing) {
    db.checkins = db.checkins.filter(c => c.id !== existing.id);
    return res.json({ success: true, checked: false, date });
  }
  db.checkins.push({ id: uuidv4(), userId: req.user.userId, date, createdAt: new Date().toISOString() });
  const user = db.users.find(u => u.id === req.user.userId);
  if (user) {
    user.experience = (user.experience || 0) + 10;
  }
  res.json({ success: true, checked: true, date });
});

// ==================== 好友系统 API ====================
app.get('/api/friends', authenticateToken, (req: any, res: any) => {
  const friends = db.friendships
    .filter(f => (f.userId === req.user.userId || f.friendId === req.user.userId) && f.status === 'accepted')
    .map(f => {
      const friendId = f.userId === req.user.userId ? f.friendId : f.userId;
      const friend = db.users.find(u => u.id === friendId);
      return friend ? { id: friend.id, nickname: friend.nickname, avatar: friend.avatar, level: friend.level } : null;
    })
    .filter(Boolean);
  res.json(friends);
});

app.get('/api/friends/pending', authenticateToken, (req: any, res: any) => {
  const pending = db.friendships
    .filter(f => f.friendId === req.user.userId && f.status === 'pending')
    .map(f => {
      const requester = db.users.find(u => u.id === f.userId);
      return requester ? { id: requester.id, nickname: requester.nickname, avatar: requester.avatar, level: requester.level, request_id: f.id } : null;
    })
    .filter(Boolean);
  res.json(pending);
});

app.post('/api/friends/request', authenticateToken, (req: any, res: any) => {
  const { friendId } = req.body;
  if (req.user.userId === friendId) return res.status(400).json({ error: '不能添加自己为好友' });
  const existing = db.friendships.find(
    f => (f.userId === req.user.userId && f.friendId === friendId) ||
         (f.userId === friendId && f.friendId === req.user.userId)
  );
  if (existing) {
    if (existing.status === 'accepted') return res.status(400).json({ error: '已经是好友了' });
    return res.status(400).json({ error: '已有待处理的好友请求' });
  }
  db.friendships.push({
    id: uuidv4(), userId: req.user.userId, friendId,
    status: 'pending', createdAt: new Date().toISOString()
  });
  res.json({ success: true, message: '好友请求已发送' });
});

app.post('/api/friends/accept', authenticateToken, (req: any, res: any) => {
  const request = db.friendships.find(f => f.id === req.body.requestId && f.friendId === req.user.userId && f.status === 'pending');
  if (!request) return res.status(404).json({ error: '好友请求不存在' });
  request.status = 'accepted';
  db.friendships.push({
    id: uuidv4(), userId: req.user.userId, friendId: request.userId,
    status: 'accepted', createdAt: new Date().toISOString()
  });
  res.json({ success: true, message: '好友请求已接受' });
});

app.post('/api/friends/reject', authenticateToken, (req: any, res: any) => {
  db.friendships = db.friendships.filter(f => !(f.id === req.body.requestId && f.friendId === req.user.userId && f.status === 'pending'));
  res.json({ success: true, message: '好友请求已拒绝' });
});

app.delete('/api/friends/:friendId', authenticateToken, (req: any, res: any) => {
  db.friendships = db.friendships.filter(
    f => !((f.userId === req.user.userId && f.friendId === req.params.friendId) ||
           (f.userId === req.params.friendId && f.friendId === req.user.userId))
  );
  res.json({ success: true, message: '好友已删除' });
});

app.get('/api/users/search', authenticateToken, (req: any, res: any) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json([]);
  const userId = req.user.userId;
  const friendIds = new Set(
    db.friendships.filter(f => f.status === 'accepted' && (f.userId === userId || f.friendId === userId))
      .map(f => (f.userId === userId ? f.friendId : f.userId))
  );
  const pendingIds = new Set(db.friendships.filter(f => f.status === 'pending' && f.userId === userId).map(f => f.friendId));
  const results = db.users
    .filter(u => u.id !== userId && (
      u.nickname?.toLowerCase().includes(q.toLowerCase()) ||
      u.phone?.includes(q) ||
      u.id?.toLowerCase().includes(q.toLowerCase())
    ))
    .slice(0, 20)
    .map(u => ({
      id: u.id, nickname: u.nickname, avatar: u.avatar, level: u.level || 1,
      bio: u.bio || '', phone: u.phone ? `${u.phone.slice(0, 3)}****${u.phone.slice(-4)}` : '',
      isFriend: friendIds.has(u.id), isPending: pendingIds.has(u.id),
    }));
  res.json(results);
});

// ==================== 私信聊天 API ====================
app.get('/api/messages/conversations', authenticateToken, (req: any, res: any) => {
  const userId = req.user.userId;
  const userMessages = db.messages.filter(m => m.senderId === userId || m.receiverId === userId);
  const conversationsMap = new Map();
  userMessages.forEach(m => {
    const otherUserId = m.senderId === userId ? m.receiverId : m.senderId;
    if (!conversationsMap.has(otherUserId)) {
      const otherUser = db.users.find(u => u.id === otherUserId);
      const unreadCount = db.messages.filter(
        msg => msg.receiverId === userId && msg.senderId === otherUserId && !msg.readAt
      ).length;
      conversationsMap.set(otherUserId, {
        user_id: otherUserId, nickname: otherUser?.nickname, avatar: otherUser?.avatar,
        last_message: m.content, last_message_time: m.createdAt, unread_count: unreadCount
      });
    }
  });
  res.json(Array.from(conversationsMap.values()));
});

app.get('/api/messages/:otherUserId', authenticateToken, (req: any, res: any) => {
  const otherUserId = req.params.otherUserId;
  const userId = req.user.userId;
  const chatMessages = db.messages
    .filter(m => (m.senderId === userId && m.receiverId === otherUserId) ||
                 (m.senderId === otherUserId && m.receiverId === userId))
    .slice(-100);
  db.messages.forEach(m => {
    if (m.receiverId === userId && m.senderId === otherUserId && !m.readAt) {
      m.readAt = new Date().toISOString();
    }
  });
  res.json(chatMessages);
});

app.post('/api/messages', authenticateToken, (req: any, res: any) => {
  const { receiverId, content } = req.body;
  if (!receiverId || !content) return res.status(400).json({ error: '接收者和内容不能为空' });
  const newMessage = {
    id: uuidv4(), senderId: req.user.userId, receiverId,
    content, createdAt: new Date().toISOString()
  };
  db.messages.push(newMessage);
  res.json(newMessage);
});

// ==================== 健康检查 ====================
app.get('/api/health', (req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AI 模块路由 ====================
app.use('/api/ai', aiRoutes);

// ==================== Vercel Serverless 导出 ====================
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Function 把所有 /api/* 请求转发到这里
  // 让 Express 处理
  return app(req as any, res as any);
}
