import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, UserPlus, Send, Flame,
  TrendingUp, Users, Sparkles, X, Check,
  MoreHorizontal, MessageSquare, Dumbbell, Star,
  Search, Loader2, UserCheck, Clock3, PenLine
} from 'lucide-react';
import { postsApi, friendsApi } from '@/lib/api';
import { getToken } from '@/lib/api';

interface Post {
  id: string;
  user_id: string;
  nickname: string;
  avatar: string;
  content: string;
  images: string[];
  likes: number;
  comments: number;
  shares: number;
  tags: string[];
  created_at: string;
  isLiked?: boolean;
  isCheckIn?: boolean;
}

interface Friend {
  id: string;
  nickname: string;
  avatar: string;
  level: number;
  streak?: number;
}

const Community = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'friends' | 'checkin'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState<string[]>([]);
  const [sendingPost, setSendingPost] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [streak, setStreak] = useState(0);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hotSearchKeywords = ['健身教练', '帕梅拉', '晨跑', '瑜伽', '减脂', '增肌'];

  const isLoggedIn = !!getToken();

  // 未登录游客也可浏览帖子(像 X);朋友圈/打卡需登录
  useEffect(() => {
    if (activeTab === 'friends' || activeTab === 'checkin') {
      if (!isLoggedIn) {
        navigate('/login');
        return;
      }
    }
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const postsResult = await postsApi.getPosts('new');
      setPosts(postsResult);

      if (isLoggedIn) {
        const friendsResult = await friendsApi.getFriends();
        setFriends(friendsResult);

        const today = new Date().toISOString().split('T')[0];
        const todayPost = postsResult.find((p: any) =>
          p.content.includes('#打卡') && p.created_at.startsWith(today)
        );
        setCheckedInToday(!!todayPost);

        const checkInPosts = postsResult.filter((p: any) => p.content.includes('#打卡'));
        let currentStreak = 0;
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const hasCheckIn = checkInPosts.some((p: any) => p.created_at.startsWith(dateStr));
          if (hasCheckIn) currentStreak++;
          else if (i > 0) break;
        }
        setStreak(currentStreak);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    }
    setLoading(false);
  };

  // 未登录提示登录
  const requireLogin = (): boolean => {
    if (!isLoggedIn) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleLikePost = async (postId: string) => {
    if (!requireLogin()) return;
    try {
      const result = await postsApi.likePost(postId);
      setPosts(posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes: result.liked ? p.likes + 1 : Math.max(0, p.likes - 1),
            isLiked: result.liked,
          };
        }
        return p;
      }));
    } catch (error) {
      console.error('点赞失败:', error);
    }
  };

  const handleAddFriend = async (userId: string) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    try {
      await friendsApi.sendFriendRequest(userId);
      setSearchResults(prev => prev.map(u =>
        u.id === userId ? { ...u, isPending: true } : u
      ));
    } catch (error: any) {
      alert(error.message || '发送好友请求失败');
    }
  };

  const handleSendMessage = (userId: string) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    navigate(`/chat/${userId}`);
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    if (!requireLogin()) return;
    setSendingPost(true);
    try {
      const newPost = await postsApi.createPost(newPostContent.trim(), [], newPostTags);
      setPosts([newPost, ...posts]);
      setShowPostModal(false);
      setNewPostContent('');
      setNewPostTags([]);
    } catch (error: any) {
      console.error('发布帖子失败:', error);
      alert('发布失败：' + (error?.message || '未知错误，请重新登录后重试'));
    }
    setSendingPost(false);
  };

  const handleCheckIn = async () => {
    if (!requireLogin()) return;
    if (checkedInToday) return;

    setSendingPost(true);
    try {
      const checkInContent = `#健身打卡 今日训练完成！\n\n${new Date().toLocaleDateString('zh-CN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
      await postsApi.createPost(checkInContent, [], ['健身打卡']);
      setCheckedInToday(true);
      setStreak(prev => prev + 1);
      setShowPostModal(false);
      setNewPostContent('');
      setNewPostTags([]);
    } catch (error) {
      console.error('打卡失败:', error);
    }
    setSendingPost(false);
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await friendsApi.searchUsers(value.trim());
        setSearchResults(results);
      } catch (error) {
        console.error('搜索用户失败:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
        setHasSearched(true);
      }
    }, 300);
  };

  const handleQuickSearch = (keyword: string) => {
    handleSearchInput(keyword);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60 / 1000)}分钟前`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 60 / 60 / 1000)}小时前`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / 24 / 60 / 60 / 1000)}天前`;
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const formatCount = (count: number) => {
    if (count >= 10000) return (count / 10000).toFixed(1) + '万';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  const hotTags = ['健身打卡', '减脂日记', '增肌计划', '瑜伽生活', 'HIIT训练', '跑步'];

  if (activeTab === 'friends' || activeTab === 'checkin') {
    if (!isLoggedIn) return null;
  }

  return (
    <div className="min-h-screen bg-dark-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="h-display text-3xl md:text-4xl text-dark-900">健身社区</h1>
            <p className="text-dark-600 mt-1.5 text-sm">和健身伙伴一起交流进步</p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white font-semibold rounded-full text-sm hover:bg-primary-600 hover:shadow-card-hover transition-all"
          >
            <Star className="w-4 h-4" />
            编辑资料
          </button>
        </div>

        {/* Tab Navigation - Google 风格胶囊 */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { id: 'feed' as const, label: '广场', icon: Sparkles },
            { id: 'friends' as const, label: `好友${friends.length > 0 ? ` (${friends.length})` : ''}`, icon: Users },
            { id: 'checkin' as const, label: `打卡续火花${streak > 0 ? ` 🔥${streak}` : ''}`, icon: Flame },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all shrink-0 ${
                  active
                    ? 'bg-primary-500 text-white shadow-card'
                    : 'bg-white text-dark-600 border border-dark-300 hover:bg-dark-200'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ============ Feed Tab ============ */}
        {activeTab === 'feed' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Feed */}
            <div className="lg:col-span-2 space-y-4">
              {/* Post Button(游客只读,登录才能发布 —— 像 X) */}
              <div className="bg-white rounded-2xl border border-dark-300 p-4">
                <div className="flex gap-3">
                  {isLoggedIn ? (
                    <img
                      src={(() => { try { const u = JSON.parse(localStorage.getItem('fitzone_user') || '{}'); return u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=me'; } catch { return 'https://api.dicebear.com/7.x/avataaars/svg?seed=me'; } })()}
                      alt="Avatar"
                      className="w-11 h-11 rounded-full ring-2 ring-dark-300 object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-dark-200 flex items-center justify-center">
                      <PenLine className="w-5 h-5 text-dark-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <button
                      onClick={() => {
                        if (requireLogin()) setShowPostModal(true);
                      }}
                      className="w-full text-left px-4 py-3 bg-dark-100 rounded-xl text-dark-500 hover:bg-dark-200 transition-colors text-sm"
                    >
                      {isLoggedIn ? '分享你的健身心得...' : '登录后即可发布动态、参与社区互动'}
                    </button>
                    {!isLoggedIn ? (
                      <div className="mt-3">
                        <button
                          onClick={() => navigate('/login')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-primary-500 text-white hover:bg-primary-600 transition-all"
                        >
                          <UserPlus className="w-4 h-4" />
                          登录 / 注册
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleCheckIn}
                          disabled={checkedInToday}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            checkedInToday
                              ? 'bg-accent-50 text-accent-700 cursor-not-allowed'
                              : 'bg-white text-accent-700 border border-accent-200 hover:bg-accent-50'
                          }`}
                        >
                          <Flame className="w-4 h-4" />
                          {checkedInToday ? '今日已打卡' : '打卡'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Posts */}
              {loading ? (
                <div className="bg-white rounded-2xl border border-dark-300 p-8 text-center">
                  <div className="animate-pulse text-dark-500">加载中...</div>
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dark-300 p-10 text-center">
                  <Sparkles className="w-14 h-14 mx-auto mb-3 text-dark-400" />
                  <p className="text-dark-600">暂无动态，快来发布第一条吧</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl border border-dark-300 hover:shadow-card-hover transition-shadow"
                  >
                    <div className="p-5 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={post.avatar}
                            alt={post.nickname}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-dark-300"
                          />
                          <div>
                            <div className="font-semibold text-dark-900 text-sm">{post.nickname}</div>
                            <div className="text-xs text-dark-500">{formatTime(post.created_at)}</div>
                          </div>
                        </div>
                        <button className="p-1.5 rounded-full hover:bg-dark-200 text-dark-500 hover:text-dark-700 transition-colors">
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="mt-3.5 text-dark-800 leading-relaxed whitespace-pre-wrap text-sm">
                        {post.content}
                      </div>

                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {post.tags.map((tag, index) => (
                            <span key={index} className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="px-5 py-3 border-t border-dark-200 flex items-center gap-1">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          post.isLiked
                            ? 'text-vibe-red bg-vibe-red/8'
                            : 'text-dark-600 hover:text-vibe-red hover:bg-vibe-red/8'
                        }`}
                      >
                        <Heart className={`w-[18px] h-[18px] ${post.isLiked ? 'fill-current' : ''}`} />
                        <span>{formatCount(post.likes)}</span>
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-dark-600 hover:text-primary-600 hover:bg-primary-50 text-sm font-medium transition-colors">
                        <MessageCircle className="w-[18px] h-[18px]" />
                        <span>{formatCount(post.comments)}</span>
                      </button>
                      <button
                        onClick={() => handleSendMessage(post.user_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-dark-600 hover:text-primary-600 hover:bg-primary-50 text-sm font-medium transition-colors"
                      >
                        <MessageSquare className="w-[18px] h-[18px]" />
                        <span className="hidden sm:inline">私信</span>
                      </button>
                      <button
                        onClick={() => handleAddFriend(post.user_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-dark-600 hover:text-accent-600 hover:bg-accent-50 text-sm font-medium transition-colors ml-auto"
                      >
                        <UserPlus className="w-[18px] h-[18px]" />
                        <span className="hidden sm:inline">加好友</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl border border-dark-300 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-vibe-orange" />
                  <h3 className="font-semibold text-dark-900 text-sm">热门话题</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hotTags.map((tag, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setNewPostTags([...newPostTags, tag]);
                        setShowPostModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-dark-100 text-dark-700 rounded-full text-xs hover:bg-primary-50 hover:text-primary-700 transition-colors font-medium"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 活跃用户榜 */}
              <div className="bg-white rounded-2xl border border-dark-300 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-primary-600" />
                  <h3 className="font-semibold text-dark-900 text-sm">活跃健身达人</h3>
                </div>
                <p className="text-xs text-dark-500">社区正在持续完善中，敬请期待更多精彩内容。</p>
              </div>
            </div>
          </div>
        )}

        {/* ============ Friends Tab ============ */}
        {activeTab === 'friends' && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-2xl border border-dark-300">
              <div className="p-5 border-b border-dark-200 flex items-center justify-between">
                <h3 className="text-lg font-bold font-display text-dark-900">我的好友 ({friends.length})</h3>
                <button
                  onClick={() => setShowAddFriendModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-100 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  添加好友
                </button>
              </div>
              <div className="p-4">
                {friends.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-3">
                      <Users className="w-8 h-8 text-dark-400" />
                    </div>
                    <p className="text-dark-600 mb-3 text-sm">还没有好友，快去广场添加吧</p>
                    <button
                      onClick={() => setActiveTab('feed')}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      去广场看看 →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center gap-3 p-3 bg-dark-100 rounded-xl">
                        <img
                          src={friend.avatar}
                          alt={friend.nickname}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-200"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-dark-900 truncate">{friend.nickname}</div>
                          <div className="text-xs text-dark-500">Lv.{friend.level}</div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleSendMessage(friend.id)}
                            className="w-9 h-9 rounded-full bg-white border border-dark-300 flex items-center justify-center text-dark-500 hover:text-primary-600 hover:border-primary-300 transition-colors"
                            aria-label="私信"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/chat/${friend.id}`)}
                            className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 hover:bg-primary-100 transition-colors"
                            aria-label="对话"
                          >
                            <Dumbbell className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============ Check-in Tab ============ */}
        {activeTab === 'checkin' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl border border-dark-300 p-8 text-center">
              {/* Streak Display */}
              <div className="mb-6">
                <div className="relative w-44 h-44 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, #FCE8E6 0%, transparent 70%)' }} />
                  <div
                    className="absolute inset-4 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EA4335 0%, #FBBC04 100%)' }}
                  >
                    <div className="text-center">
                      <div className="metric-value text-5xl text-white">{streak}</div>
                      <div className="text-sm text-white/90 mt-1">连续打卡天数</div>
                    </div>
                  </div>
                  <Flame className="absolute -top-2 -right-2 w-10 h-10 text-vibe-orange animate-float" />
                </div>
                <h2 className="text-xl font-bold font-display text-dark-900 mb-1.5">
                  {checkedInToday ? '今日已打卡' : '今日还没打卡'}
                </h2>
                <p className="text-dark-600 text-sm">
                  {checkedInToday
                    ? '太棒了！继续保持，明天再来续火花'
                    : '点击下方按钮完成今日打卡，续上你的火花'}
                </p>
              </div>

              {/* Check-in Button */}
              {!checkedInToday ? (
                <button
                  onClick={handleCheckIn}
                  disabled={sendingPost}
                  className="w-full py-4 text-white font-bold text-lg rounded-2xl transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #EA4335 0%, #FBBC04 100%)' }}
                >
                  {sendingPost ? '打卡中...' : '立即打卡续火花'}
                </button>
              ) : (
                <div className="w-full py-4 bg-accent-50 border border-accent-200 text-accent-700 font-bold text-lg rounded-2xl flex items-center justify-center gap-2.5">
                  <Check className="w-6 h-6" />
                  已完成今日打卡
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="p-3.5 bg-dark-100 rounded-xl">
                  <div className="metric-value text-2xl text-dark-900">{streak}</div>
                  <div className="text-xs text-dark-500 mt-0.5">连续天数</div>
                </div>
                <div className="p-3.5 bg-dark-100 rounded-xl">
                  <div className="metric-value text-2xl text-dark-900">{Math.floor(streak * 50)}</div>
                  <div className="text-xs text-dark-500 mt-0.5">累计卡路里</div>
                </div>
                <div className="p-3.5 bg-dark-100 rounded-xl">
                  <div className="metric-value text-2xl text-dark-900">{Math.floor(streak * 30)}</div>
                  <div className="text-xs text-dark-500 mt-0.5">训练分钟</div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-6 p-3.5 bg-primary-50 rounded-xl border border-primary-100">
                <p className="text-primary-700 text-xs leading-relaxed">
                  每日打卡可续火花，连续打卡天数越多，徽章越酷炫哦
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============ Post Modal ============ */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-elevation-5">
            <div className="px-6 py-4 border-b border-dark-200 flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-dark-900">发布动态</h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="w-9 h-9 rounded-full hover:bg-dark-200 flex items-center justify-center text-dark-500 hover:text-dark-800 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="分享你的健身心得..."
                rows={5}
                autoFocus
                className="w-full px-4 py-3 bg-dark-100 border border-dark-300 rounded-xl text-dark-900 placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 transition-all resize-none text-sm"
              />

              <div className="flex flex-wrap gap-1.5 mt-4">
                {hotTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (newPostTags.includes(tag)) {
                        setNewPostTags(newPostTags.filter(t => t !== tag));
                      } else {
                        setNewPostTags([...newPostTags, tag]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      newPostTags.includes(tag)
                        ? 'bg-primary-50 text-primary-700 border-primary-300'
                        : 'bg-white text-dark-600 border-dark-300 hover:border-primary-300 hover:text-primary-600'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-dark-200 flex gap-3">
              <button
                onClick={() => setShowPostModal(false)}
                className="flex-1 py-3 bg-dark-100 text-dark-700 font-semibold rounded-full hover:bg-dark-200 transition-colors text-sm"
              >
                取消
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPostContent.trim() || sendingPost}
                className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-full hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {sendingPost ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    发布中
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    发布
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Add Friend Modal ============ */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-elevation-5">
            <div className="px-6 py-4 border-b border-dark-200 flex items-center justify-between">
              <h3 className="text-lg font-bold font-display text-dark-900">添加好友</h3>
              <button
                onClick={() => {
                  setShowAddFriendModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                  setHasSearched(false);
                }}
                className="w-9 h-9 rounded-full hover:bg-dark-200 flex items-center justify-center text-dark-500 hover:text-dark-800 transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 搜索框 */}
            <div className="p-6 pb-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  placeholder="搜索昵称 / 手机号 / 用户 ID"
                  className="w-full pl-11 pr-11 py-3 bg-dark-100 border border-dark-300 rounded-full text-dark-900 placeholder-dark-500 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/15 transition-all text-sm"
                />
                {searching && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-500 animate-spin" />
                )}
                {!searching && searchQuery && (
                  <button
                    onClick={() => handleSearchInput('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-dark-300 flex items-center justify-center text-dark-700 hover:bg-dark-400"
                    aria-label="清除"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 内容区 */}
            <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
              {!searchQuery.trim() ? (
                // 热搜推荐
                <div className="py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-vibe-orange" />
                    <h4 className="text-sm font-semibold text-dark-900">热门搜索</h4>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {hotSearchKeywords.map((keyword, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickSearch(keyword)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-100 hover:bg-primary-50 text-dark-700 hover:text-primary-700 rounded-full text-xs font-medium transition-colors"
                      >
                        {index < 3 && <span className="text-xs text-vibe-orange font-bold">{index + 1}</span>}
                        {keyword}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 p-3.5 bg-primary-50 rounded-xl border border-primary-100">
                    <p className="text-xs text-dark-700 leading-relaxed">
                      输入对方的<strong className="text-primary-700">昵称</strong>、
                      <strong className="text-primary-700">手机号</strong>或
                      <strong className="text-primary-700">用户 ID</strong>即可搜索添加好友
                    </p>
                  </div>
                </div>
              ) : searching ? (
                <div className="text-center text-dark-500 py-12">
                  <Loader2 className="w-9 h-9 mx-auto mb-3 animate-spin text-primary-500" />
                  <p className="text-sm">搜索中...</p>
                </div>
              ) : hasSearched && searchResults.length === 0 ? (
                <div className="text-center text-dark-500 py-12">
                  <div className="w-14 h-14 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-7 h-7 text-dark-400" />
                  </div>
                  <p className="mb-1 text-dark-700">未找到相关用户</p>
                  <p className="text-xs text-dark-500">试试其他关键词或检查账号是否正确</p>
                </div>
              ) : (
                // 搜索结果列表
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 bg-dark-100 rounded-xl hover:bg-dark-200 transition-colors"
                    >
                      <img
                        src={user.avatar}
                        alt={user.nickname}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-dark-300 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-dark-900 truncate">{user.nickname}</span>
                          <span className="px-1.5 py-0.5 text-xs bg-vibe-purple/10 text-vibe-purple rounded font-medium">
                            Lv.{user.level || 1}
                          </span>
                        </div>
                        {user.phone && (
                          <div className="text-xs text-dark-500 mt-0.5">
                            账号 {user.phone}
                          </div>
                        )}
                        {user.bio && (
                          <div className="text-xs text-dark-500 mt-0.5 truncate">{user.bio}</div>
                        )}
                      </div>

                      {user.isFriend ? (
                        <button
                          onClick={() => handleSendMessage(user.id)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-accent-50 text-accent-700 rounded-full text-sm font-medium hover:bg-accent-100 transition-colors"
                        >
                          <UserCheck className="w-4 h-4" />
                          已是好友
                        </button>
                      ) : user.isPending ? (
                        <button
                          disabled
                          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-dark-200 text-dark-500 rounded-full text-sm font-medium cursor-not-allowed"
                        >
                          <Clock3 className="w-4 h-4" />
                          待通过
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddFriend(user.id)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-full text-sm font-medium hover:bg-primary-600 transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                          加好友
                        </button>
                      )}
                    </div>
                  ))}

                  {searchResults.length > 0 && (
                    <p className="text-center text-xs text-dark-500 pt-2">
                      共找到 {searchResults.length} 位用户
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;
