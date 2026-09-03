/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import aiRoutes from './ai/routes.js';
import { registerWorkoutRoutes, type WorkoutTable } from './workoutRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fitzone-secret-key-2024';

// 数据存储：Upstash Redis(生产持久化) + 本地文件(开发兜底)
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ==================== Upstash Redis 持久化 ====================
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet(name: string): Promise<any[] | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const resp = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', name]),
    });
    const data: any = await resp.json();
    if (data && data.result) return JSON.parse(data.result);
    return null;
  } catch (e) {
    console.warn('[Redis] 读取失败', name, e);
    return null;
  }
}

async function redisSet(name: string, data: any[]): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  try {
    await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', name, JSON.stringify(data)]),
    });
  } catch (e) {
    console.warn('[Redis] 写入失败', name, e);
  }
}

// 串行写入队列,避免并发乱序覆盖
let redisWriteQueue: Promise<void> = Promise.resolve();
function persistToRedis(name: string, data: any[]) {
  redisWriteQueue = redisWriteQueue
    .then(() => redisSet(name, data))
    .catch(e => console.warn('[Redis] 队列写入失败', name, e));
}

// 简单文件存储(本地兜底)
const loadDB = (name: string): any[] => {
  const file = path.join(DATA_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return [];
  }
};

const saveDB = (name: string, data: any[]) => {
  // 写本地文件(开发时可读)
  try {
    const file = path.join(DATA_DIR, `${name}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch { /* ignore */ }
  // 异步写 Redis(生产持久化)
  persistToRedis(name, data);
};

// 初始化数据
let users = loadDB('users');
let verificationCodes = loadDB('verification_codes');
let friendships = loadDB('friendships');
let messages = loadDB('messages');
let posts = loadDB('posts');
let postLikes = loadDB('post_likes');
let postComments = loadDB('post_comments');
let workoutRecords = loadDB('workout_records');
let exercises = loadDB('exercises');
let workoutPlans = loadDB('workout_plans');
let personalRecords = loadDB('personal_records');
let checkins = loadDB('checkins');
let mealPlans = loadDB('meal_plans');
let nutritionProfiles = loadDB('nutrition_profiles');
let favorites = loadDB('favorites');

// 从 Redis 加载全部表(有配置时优先用远端数据,保证多实例/重启持久)
function applyRemoteTable(name: string, data: any[]) {
  switch (name) {
    case 'users': users = data; break;
    case 'verification_codes': verificationCodes = data; break;
    case 'friendships': friendships = data; break;
    case 'messages': messages = data; break;
    case 'posts': posts = data; break;
    case 'post_likes': postLikes = data; break;
    case 'post_comments': postComments = data; break;
    case 'workout_records': workoutRecords = data; break;
    case 'exercises': exercises = data; break;
    case 'workout_plans': workoutPlans = data; break;
    case 'personal_records': personalRecords = data; break;
    case 'checkins': checkins = data; break;
    case 'meal_plans': mealPlans = data; break;
    case 'nutrition_profiles': nutritionProfiles = data; break;
    case 'favorites': favorites = data; break;
  }
}

const DB_TABLES = [
  'users', 'verification_codes', 'friendships', 'messages', 'posts',
  'post_likes', 'post_comments', 'workout_records', 'exercises', 'workout_plans',
  'personal_records', 'checkins', 'meal_plans', 'nutrition_profiles', 'favorites',
];

async function loadAllFromRedis() {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return;
  for (const name of DB_TABLES) {
    try {
      const remote = await redisGet(name);
      if (Array.isArray(remote)) {
        applyRemoteTable(name, remote);
      }
    } catch (e) {
      console.warn('[Redis] 加载表失败', name, e);
    }
  }
  console.log('[Redis] 数据已从 Upstash 加载');
}

// 中间件
// 允许前端域名跨域访问（开发 + 生产环境）
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,  // Vercel 前端域名，部署时配置
  process.env.CORS_ORIGIN,   // 其他自定义域名
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // 允许同源请求（origin 为 undefined）和已配置的域名
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);  // 生产可改为 callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// ==================== 用户认证 API ====================

// 发送验证码
app.post('/api/auth/send-code', (req, res) => {
  const { phone, type } = req.body;

  if (!phone || phone.length !== 11) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }

  const code = Math.random().toString().slice(-6);
  const id = uuidv4();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  verificationCodes.push({
    id,
    phone,
    code,
    type: type || 'login',
    expiresAt,
    createdAt: new Date().toISOString()
  });
  saveDB('verification_codes', verificationCodes);

  console.log(`[短信发送] 手机号: ${phone}, 验证码: ${code}`);

  res.json({
    success: true,
    message: '验证码已发送',
    dev_code: code // 开发环境返回验证码
  });
});

// 手机号验证码登录/注册
app.post('/api/auth/login-phone', (req, res) => {
  const { phone, code } = req.body;

  if (!phone || phone.length !== 11) {
    return res.status(400).json({ error: '请输入正确的手机号' });
  }

  if (!code || code.length !== 6) {
    return res.status(400).json({ error: '请输入验证码' });
  }

  // 验证验证码
  const storedCode = verificationCodes.find(
    v => v.phone === phone && v.code === code && new Date(v.expiresAt) > new Date()
  );

  if (!storedCode) {
    return res.status(400).json({ error: '验证码错误或已过期' });
  }

  // 删除已使用的验证码
  verificationCodes = verificationCodes.filter(v => v.id !== storedCode.id);
  saveDB('verification_codes', verificationCodes);

  // 查找或创建用户
  let user = users.find(u => u.phone === phone);

  if (!user) {
    const userId = uuidv4();
    const nickname = `健身用户${phone.slice(-4)}`;
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${phone}`;

    user = {
      id: userId,
      phone,
      nickname,
      avatar,
      level: 1,
      experience: 0,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };

    users.push(user);
    saveDB('users', users);
  } else {
    user.lastLogin = new Date().toISOString();
    saveDB('users', users);
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
app.post('/api/auth/login-password', (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ error: '请输入手机号和密码' });
  }

  const user = users.find(u => u.phone === phone);

  if (!user || !user.password) {
    return res.status(400).json({ error: '用户不存在或未设置密码' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ error: '密码错误' });
  }

  user.lastLogin = new Date().toISOString();
  saveDB('users', users);

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

// 邮箱注册(一个邮箱一个账号)
app.post('/api/auth/register-email', (req, res) => {
  const { email, password, nickname } = req.body;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: '请输入正确的邮箱地址' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' });
  }

  const normalized = email.trim().toLowerCase();
  const existing = users.find(u => u.email === normalized);
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

  users.push(user);
  saveDB('users', users);

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

// 邮箱密码登录
app.post('/api/auth/login-email', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: '请输入邮箱和密码' });
  }

  const normalized = email.trim().toLowerCase();
  const user = users.find(u => u.email === normalized);

  if (!user || !user.password) {
    return res.status(400).json({ error: '该邮箱未注册，请先注册' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ error: '邮箱或密码错误' });
  }

  user.lastLogin = new Date().toISOString();
  saveDB('users', users);

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
app.post('/api/auth/set-password', authenticateToken, (req, res) => {
  const { password } = req.body;
  const userId = req.user.userId;

  if (!password || password.length < 6) {
    return res.status(400).json({ error: '密码长度至少6位' });
  }

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  user.password = bcrypt.hashSync(password, 10);
  saveDB('users', users);

  res.json({ success: true, message: '密码设置成功' });
});

// 获取当前用户信息
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json({
    id: user.id,
    phone: user.phone,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    bio: user.bio || '',
    level: user.level,
    experience: user.experience,
    createdAt: user.createdAt
  });
});

// 更新用户信息
app.put('/api/auth/me', authenticateToken, (req, res) => {
  const { nickname, avatar, bio } = req.body;
  const userId = req.user.userId;

  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  if (nickname) user.nickname = nickname;

  // 接受普通 URL 或前端压缩后的图片，保存到账号以便跨设备同步。
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
  saveDB('users', users);

  res.json({
    success: true,
    user: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      level: user.level,
      experience: user.experience
    }
  });
});

// ==================== 好友系统 API ====================

app.get('/api/friends', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const friends = friendships
    .filter(f => (f.userId === userId || f.friendId === userId) && f.status === 'accepted')
    .map(f => {
      const friendId = f.userId === userId ? f.friendId : f.userId;
      const friend = users.find(u => u.id === friendId);
      return friend ? {
        id: friend.id,
        nickname: friend.nickname,
        avatar: friend.avatar,
        level: friend.level
      } : null;
    })
    .filter(Boolean);

  res.json(friends);
});

app.get('/api/friends/pending', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const pending = friendships
    .filter(f => f.friendId === userId && f.status === 'pending')
    .map(f => {
      const requester = users.find(u => u.id === f.userId);
      return requester ? {
        id: requester.id,
        nickname: requester.nickname,
        avatar: requester.avatar,
        level: requester.level,
        request_id: f.id
      } : null;
    })
    .filter(Boolean);

  res.json(pending);
});

app.post('/api/friends/request', authenticateToken, (req, res) => {
  const { friendId } = req.body;
  const userId = req.user.userId;

  if (userId === friendId) {
    return res.status(400).json({ error: '不能添加自己为好友' });
  }

  const existing = friendships.find(
    f => (f.userId === userId && f.friendId === friendId) ||
         (f.userId === friendId && f.friendId === userId)
  );

  if (existing) {
    if (existing.status === 'accepted') {
      return res.status(400).json({ error: '已经是好友了' });
    }
    return res.status(400).json({ error: '已有待处理的好友请求' });
  }

  const friendUser = users.find(u => u.id === friendId);
  if (!friendUser) {
    return res.status(404).json({ error: '用户不存在' });
  }

  friendships.push({
    id: uuidv4(),
    userId,
    friendId,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  saveDB('friendships', friendships);

  res.json({ success: true, message: '好友请求已发送' });
});

app.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { requestId } = req.body;
  const userId = req.user.userId;

  const request = friendships.find(f => f.id === requestId && f.friendId === userId && f.status === 'pending');

  if (!request) {
    return res.status(404).json({ error: '好友请求不存在' });
  }

  request.status = 'accepted';
  friendships.push({
    id: uuidv4(),
    userId: userId,
    friendId: request.userId,
    status: 'accepted',
    createdAt: new Date().toISOString()
  });
  saveDB('friendships', friendships);

  res.json({ success: true, message: '好友请求已接受' });
});

app.post('/api/friends/reject', authenticateToken, (req, res) => {
  const { requestId } = req.body;
  const userId = req.user.userId;

  friendships = friendships.filter(f => !(f.id === requestId && f.friendId === userId && f.status === 'pending'));
  saveDB('friendships', friendships);

  res.json({ success: true, message: '好友请求已拒绝' });
});

app.delete('/api/friends/:friendId', authenticateToken, (req, res) => {
  const friendId = req.params.friendId;
  const userId = req.user.userId;

  friendships = friendships.filter(
    f => !(f.userId === userId && f.friendId === friendId) &&
         !(f.userId === friendId && f.friendId === userId)
  );
  saveDB('friendships', friendships);

  res.json({ success: true, message: '好友已删除' });
});

app.get('/api/users/search', authenticateToken, (req, res) => {
  const { q } = req.query;
  const userId = req.user.userId;

  if (!q || String(q).trim() === '') return res.json([]);

  const keyword = String(q).trim();

  // 已是好友的id集合
  const friendIds = new Set(
    friendships
      .filter(f => f.status === 'accepted' && (f.userId === userId || f.friendId === userId))
      .map(f => (f.userId === userId ? f.friendId : f.userId))
  );

  // 已发送待处理请求的id集合
  const pendingIds = new Set(
    friendships
      .filter(f => f.status === 'pending' && f.userId === userId)
      .map(f => f.friendId)
  );

  const results = users
    .filter(u => u.id !== userId && (
      u.nickname?.toLowerCase().includes(keyword.toLowerCase()) ||
      u.phone?.includes(keyword) ||
      u.id?.toLowerCase().includes(keyword.toLowerCase())
    ))
    .slice(0, 20)
    .map(u => {
      const phoneMasked = u.phone ? `${u.phone.slice(0, 3)}****${u.phone.slice(-4)}` : '';
      return {
        id: u.id,
        nickname: u.nickname,
        avatar: u.avatar,
        level: u.level || 1,
        bio: u.bio || '',
        phone: phoneMasked,
        isFriend: friendIds.has(u.id),
        isPending: pendingIds.has(u.id),
      };
    });

  res.json(results);
});

// ==================== 私信聊天 API ====================

app.get('/api/messages/conversations', authenticateToken, (req, res) => {
  const userId = req.user.userId;

  const userMessages = messages.filter(m => m.senderId === userId || m.receiverId === userId);
  const conversationsMap = new Map();

  userMessages.forEach(m => {
    const otherUserId = m.senderId === userId ? m.receiverId : m.senderId;
    if (!conversationsMap.has(otherUserId)) {
      const otherUser = users.find(u => u.id === otherUserId);
      const unreadCount = messages.filter(
        msg => msg.receiverId === userId && msg.senderId === otherUserId && !msg.readAt
      ).length;
      conversationsMap.set(otherUserId, {
        user_id: otherUserId,
        nickname: otherUser?.nickname,
        avatar: otherUser?.avatar,
        last_message: m.content,
        last_message_time: m.createdAt,
        unread_count: unreadCount
      });
    }
  });

  res.json(Array.from(conversationsMap.values()));
});

app.get('/api/messages/:userId', authenticateToken, (req, res) => {
  const otherUserId = req.params.userId;
  const userId = req.user.userId;

  const chatMessages = messages
    .filter(m => (m.senderId === userId && m.receiverId === otherUserId) ||
                 (m.senderId === otherUserId && m.receiverId === userId))
    .slice(-100);

  // 标记已读
  messages.forEach(m => {
    if (m.receiverId === userId && m.senderId === otherUserId && !m.readAt) {
      m.readAt = new Date().toISOString();
    }
  });
  saveDB('messages', messages);

  res.json(chatMessages);
});

app.post('/api/messages', authenticateToken, (req, res) => {
  const { receiverId, content } = req.body;
  const userId = req.user.userId;

  if (!receiverId || !content) {
    return res.status(400).json({ error: '接收者和内容不能为空' });
  }

  const newMessage = {
    id: uuidv4(),
    senderId: userId,
    receiverId,
    content,
    createdAt: new Date().toISOString()
  };

  messages.push(newMessage);
  saveDB('messages', messages);

  res.json(newMessage);
});

// ==================== 社区帖子 API ====================

app.get('/api/posts', (req, res) => {
  const { tab, userId } = req.query;

  let filteredPosts = posts;

  if (tab === 'following' && userId) {
    const userFriends = friendships.filter(f => f.userId === userId && f.status === 'accepted').map(f => f.friendId);
    filteredPosts = posts.filter(p => userFriends.includes(p.userId));
  } else if (tab === 'hot') {
    filteredPosts = posts.sort((a, b) => b.likes - a.likes);
  } else {
    filteredPosts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const result = filteredPosts.slice(0, 50).map(p => {
    const author = users.find(u => u.id === p.userId);
    return {
      ...p,
      nickname: author?.nickname || '用户',
      avatar: author?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
    };
  });

  res.json(result);
});

app.post('/api/posts', authenticateToken, (req, res) => {
  const { content, images, tags } = req.body;
  const userId = req.user.userId;

  if (!content) {
    return res.status(400).json({ error: '内容不能为空' });
  }

  const newPost = {
    id: uuidv4(),
    userId,
    content,
    images: images || [],
    tags: tags || [],
    likes: 0,
    comments: 0,
    shares: 0,
    createdAt: new Date().toISOString()
  };

  posts.push(newPost);
  saveDB('posts', posts);

  const user = users.find(u => u.id === userId);
  res.json({
    ...newPost,
    nickname: user?.nickname,
    avatar: user?.avatar
  });
});

app.post('/api/posts/:postId/like', authenticateToken, (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.userId;

  const existing = postLikes.find(l => l.postId === postId && l.userId === userId);
  const post = posts.find(p => p.id === postId);

  if (!post) {
    return res.status(404).json({ error: '帖子不存在' });
  }

  if (existing) {
    postLikes = postLikes.filter(l => l.id !== existing.id);
    post.likes--;
    res.json({ success: true, liked: false });
  } else {
    postLikes.push({ id: uuidv4(), postId, userId, createdAt: new Date().toISOString() });
    post.likes++;
    res.json({ success: true, liked: true });
  }

  saveDB('post_likes', postLikes);
  saveDB('posts', posts);
});

app.get('/api/posts/:postId/comments', (req, res) => {
  const postId = req.params.postId;
  const comments = postComments
    .filter(c => c.postId === postId)
    .map(c => {
      const author = users.find(u => u.id === c.userId);
      return {
        ...c,
        nickname: author?.nickname,
        avatar: author?.avatar
      };
    });

  res.json(comments);
});

app.post('/api/posts/:postId/comments', authenticateToken, (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.userId;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: '内容不能为空' });
  }

  const newComment = {
    id: uuidv4(),
    postId,
    userId,
    content,
    likes: 0,
    createdAt: new Date().toISOString()
  };

  postComments.push(newComment);

  const post = posts.find(p => p.id === postId);
  if (post) post.comments++;

  saveDB('post_comments', postComments);
  saveDB('posts', posts);

  const user = users.find(u => u.id === userId);
  res.json({
    ...newComment,
    nickname: user?.nickname,
    avatar: user?.avatar
  });
});

// ==================== 训练打卡(日历) API ====================
// 每个用户每天最多一条打卡记录,用于日历着色与连续天数统计

app.get('/api/checkins', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const userCheckins = checkins.filter(c => c.userId === userId);
  res.json(userCheckins);
});

// 打卡 / 取消打卡(同一日期)
app.post('/api/checkins', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ error: '缺少日期' });
  }

  const existing = checkins.find(c => c.userId === userId && c.date === date);
  if (existing) {
    checkins = checkins.filter(c => c.id !== existing.id);
    saveDB('checkins', checkins);
    return res.json({ success: true, checked: false, date });
  }

  checkins.push({
    id: uuidv4(),
    userId,
    date,
    createdAt: new Date().toISOString()
  });
  saveDB('checkins', checkins);

  // 打卡增加经验
  const user = users.find(u => u.id === userId);
  if (user) {
    user.experience = (user.experience || 0) + 10;
    saveDB('users', users);
  }

  res.json({ success: true, checked: true, date });
});

// ==================== 饮食计划 API ====================

app.get('/api/nutrition/profile', authenticateToken, (req, res) => {
  const profile = nutritionProfiles.find(row => row.userId === req.user.userId);
  res.json(profile || null);
});

app.put('/api/nutrition/profile', authenticateToken, (req, res) => {
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
  const index = nutritionProfiles.findIndex(row => row.userId === req.user.userId);
  if (index < 0) nutritionProfiles.push(profile); else nutritionProfiles[index] = profile;
  saveDB('nutrition_profiles', nutritionProfiles);
  res.json(profile);
});

app.get('/api/meals', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { date } = req.query;

  let userMeals = mealPlans.filter(m => m.userId === userId);
  if (date) userMeals = userMeals.filter(m => m.date === date);

  res.json(userMeals.slice(-30));
});

app.post('/api/meals', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { date, mealType, name, calories, protein, carbs, fat, description, image } = req.body;

  if (!date || !mealType || !name) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const newMeal = {
    id: uuidv4(),
    userId,
    date,
    mealType,
    name,
    calories,
    protein,
    carbs,
    fat,
    description,
    image,
    eaten: req.body.eaten !== undefined ? !!req.body.eaten : true,
    eatenAt: req.body.eaten === false ? null : new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  mealPlans.push(newMeal);
  saveDB('meal_plans', mealPlans);

  res.json(newMeal);
});

// 标记已吃 / 取消已吃
app.put('/api/meals/:mealId/eaten', authenticateToken, (req, res) => {
  const mealId = req.params.mealId;
  const userId = req.user.userId;
  const { eaten } = req.body;

  const meal = mealPlans.find(m => m.id === mealId && m.userId === userId);
  if (!meal) {
    return res.status(404).json({ error: '记录不存在' });
  }

  meal.eaten = !!eaten;
  meal.eatenAt = eaten ? new Date().toISOString() : null;
  saveDB('meal_plans', mealPlans);

  res.json({ success: true, meal });
});

app.delete('/api/meals/:mealId', authenticateToken, (req, res) => {
  const mealId = req.params.mealId;
  const userId = req.user.userId;

  mealPlans = mealPlans.filter(m => !(m.id === mealId && m.userId === userId));
  saveDB('meal_plans', mealPlans);

  res.json({ success: true });
});

// ==================== 训练追踪 API ====================
registerWorkoutRoutes(app, authenticateToken, {
  get: (table: WorkoutTable) => {
    if (table === 'exercises') return exercises;
    if (table === 'workout_plans') return workoutPlans;
    if (table === 'personal_records') return personalRecords;
    return workoutRecords;
  },
  set: (table: WorkoutTable, rows: any[]) => {
    if (table === 'exercises') exercises = rows;
    else if (table === 'workout_plans') workoutPlans = rows;
    else if (table === 'personal_records') personalRecords = rows;
    else workoutRecords = rows;
    saveDB(table, rows);
  },
});

// ==================== 收藏 API ====================

app.get('/api/favorites', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const userFavorites = favorites.filter(f => f.userId === userId).map(f => f.videoId);
  res.json(userFavorites);
});

app.post('/api/favorites', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const { videoId } = req.body;

  const existing = favorites.find(f => f.userId === userId && f.videoId === videoId);

  if (existing) {
    favorites = favorites.filter(f => f.id !== existing.id);
    res.json({ success: true, favorite: false });
  } else {
    favorites.push({ id: uuidv4(), userId, videoId, createdAt: new Date().toISOString() });
    res.json({ success: true, favorite: true });
  }

  saveDB('favorites', favorites);
});

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
    return res.status(403).json({ error: '登录已过期，请重新登录' });
  }
}

// 健康检查接口（供 Docker / 负载均衡器探活）
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== AI 模块路由 ====================
// 文字对话 / 图片分析 / 视频分析 / 语音 ASR/TTS
// 未配置 API Key 时自动走 mock 实现
app.use('/api/ai', aiRoutes);

// ==================== 种子数据(仅首次启动) ====================
// 社区需要一些内容才像真实产品;发帖接口仍要求登录(真实用户才能发帖)
function seedDatabase() {
  // 种子用户(演示/历史内容,非可登录账号)
  const seedUsers = [
    { nickname: '帕梅拉教练', bio: '专业健身教练，每天带练', seed: 'pamela' },
    { nickname: '晨跑爱好者', bio: '每天5公里，永不停歇', seed: 'runner' },
    { nickname: '瑜伽小仙女', bio: '瑜伽让我更柔软', seed: 'yoga' },
    { nickname: '增肌阿强', bio: '增肌减脂一起搞', seed: 'muscle' },
    { nickname: '拉伸放松师', bio: '运动后必拉伸', seed: 'stretch' },
    { nickname: '普拉提教练', bio: '核心力量训练', seed: 'pilates' },
  ];

  if (users.length === 0) {
    seedUsers.forEach((s, i) => {
      const uid = 'seed-u' + (i + 1);
      users.push({
        id: uid,
        nickname: s.nickname,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.seed}`,
        bio: s.bio,
        level: 5 + i,
        experience: 1000 + i * 500,
        seedOnly: true,
        createdAt: new Date(Date.now() - 86400000 * (i + 3)).toISOString()
      });
    });
    saveDB('users', users);
  }

  if (posts.length === 0) {
    const daysAgo = (d: number) => new Date(Date.now() - 86400000 * d).toISOString();
    const seedPosts = [
      { u: 'seed-u1', d: 0, c: '今日份 20 分钟全身训练完成！💪 深蹲、俯卧撑、平板支撑，每个动作 45 秒休息 15 秒，循环 4 组。跟着练起来～', t: ['健身打卡', '全身训练'] },
      { u: 'seed-u2', d: 0, c: '清晨 6 点，5 公里完成！🌅 坚持晨跑一个月，精力明显更充沛了。有一起晨跑的吗？', t: ['晨跑', '打卡'] },
      { u: 'seed-u3', d: 1, c: '🧘 睡前阴瑜伽 30 分钟，拉伸完睡得特别香。久坐党强烈推荐！', t: ['瑜伽', '放松'] },
      { u: 'seed-u4', d: 1, c: '增肌第 60 天！卧推终于突破 80kg 🏋️ 记录一下：今天推拉腿分化·推日。', t: ['增肌', '卧推'] },
      { u: 'seed-u1', d: 2, c: '减脂期怎么吃？分享我的三餐：早餐燕麦+鸡蛋，午餐鸡胸糙米，晚餐鱼+蔬菜。七分吃三分练！', t: ['饮食', '减脂'] },
      { u: 'seed-u5', d: 2, c: '跑完步一定要拉伸！给大家演示 3 个腿部拉伸动作，每个 30 秒，防止肌肉酸痛～', t: ['拉伸', '跑步'] },
      { u: 'seed-u6', d: 3, c: '普拉提核心训练打卡第 5 天，明显感觉核心稳了，深蹲也更有力！', t: ['普拉提', '核心'] },
      { u: 'seed-u2', d: 3, c: '周末长距离 10km 完成！配速 6\'20\'，虽然慢但坚持下来了 🏃', t: ['跑步', '周末'] },
      { u: 'seed-u3', d: 4, c: '新手问：瑜伽和普拉提有什么区别？评论区聊聊～', t: ['瑜伽', '问答'] },
      { u: 'seed-u4', d: 4, c: '增肌期饮食：每天 3000 大卡，蛋白 160g。附今日增肌餐🍗', t: ['增肌', '饮食'] },
      { u: 'seed-u1', d: 5, c: 'HIIT 燃脂 20 分钟打卡！波比跳太酸爽了，坚持就是胜利 🔥', t: ['HIIT', '燃脂'] },
      { u: 'seed-u5', d: 6, c: '分享一个缓解久坐腰痛的拉伸，上班族一定要试试！', t: ['拉伸', '久坐'] },
      { u: 'seed-u6', d: 7, c: '普拉提瘦腿跟练第 3 天，大腿内侧有感觉了 ✨', t: ['普拉提', '瘦腿'] },
      { u: 'seed-u3', d: 8, c: '晨间流瑜伽 30 分钟，唤醒身体一整天 ☀️', t: ['瑜伽', '晨练'] },
      { u: 'seed-u2', d: 9, c: '夜跑 5km 打卡，今天的风很舒服～', t: ['跑步', '夜跑'] },
    ];

    seedPosts.forEach((p, i) => {
      const likes = Math.floor(Math.random() * 180) + 8;
      posts.push({
        id: 'seed-post-' + (i + 1),
        userId: p.u,
        content: p.c,
        images: [],
        tags: p.t,
        likes,
        comments: Math.floor(Math.random() * 15),
        shares: Math.floor(Math.random() * 8),
        createdAt: daysAgo(p.d)
      });
      // 部分种子用户点过赞,避免 isLiked 干扰
    });
    saveDB('posts', posts);
  }
}

// 启动：先加载 Redis 持久化数据,空库时才 seed,然后监听
async function start() {
  await loadAllFromRedis();
  seedDatabase();

  app.listen(PORT, () => {
    console.log(`FitZone 后端服务已启动: http://localhost:${PORT}`);
    console.log('API端点:');
    console.log('  - 认证: /api/auth/*');
    console.log('  - 好友: /api/friends/*');
    console.log('  - 消息: /api/messages/*');
    console.log('  - 帖子: /api/posts/*');
    console.log('  - 饮食: /api/meals/*');
    console.log('  - 训练: /api/workouts/*');
    console.log('  - AI:  /api/ai/* (chat / analyze / voice)');
    console.log('');
    console.log('AI 配置状态:');
    console.log(`  - DeepSeek 文字对话: ${process.env.DEEPSEEK_API_KEY ? '✓ 已配置' : '✗ 未配置（走 mock）'}`);
    console.log(`  - 豆包视觉模型:     ${process.env.DOUBAO_ARK_API_KEY ? '✓ 已配置' : '✗ 未配置（走 mock）'}`);
    console.log(`  - 豆包语音服务:     ${process.env.VOLC_APPID ? '✓ 已配置' : '✗ 未配置（走 mock）'}`);
    console.log(`  - Redis 持久化:     ${UPSTASH_URL ? '✓ 已配置' : '✗ 未配置（数据仅存本地文件）'}`);
  });
}

start();
