export interface User {
  id: string;
  nickname: string;
  avatar: string;
  phone?: string;
  email?: string;
  loginType?: 'wechat' | 'qq' | 'phone' | 'email';
  bio: string;
  level?: number;
  experience?: number;
  followers: number;
  following: number;
  createdAt: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  bvid?: string; // B站视频BV号，用于iframe嵌入播放真实讲解视频
  duration: string;
  category: string;
  movement?: string; // 动作名称（如：深蹲、卧推、自由泳），实现 品类→动作→视频 三级分类
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  views: number;
  likes: number;
  author: string;
  authorAvatar: string;
  tags: string[];
  isLiked?: boolean;
  isFavorited?: boolean;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  images: string[];
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  createdAt: string;
  isLiked: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  videoCount: number;
  movements?: string[]; // 该品类下的动作列表，用于二级筛选
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  streaming?: boolean;
  // 附件(整合后的全能对话使用)
  images?: string[];      // 图片预览 URL(用户发送的图片)
  videoName?: string;     // 视频文件名(用户发送的视频)
  mode?: string;          // real / mock / fallback
}

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export const difficultyLabels: Record<Difficulty, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};
