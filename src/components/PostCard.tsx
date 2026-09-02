import { useState } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { Post } from '@/types';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  const { toggleLikePost } = useAppStore();
  const { isLoggedIn } = useAuthStore();
  const navigate = useNavigate();
  const [showAllImages, setShowAllImages] = useState(false);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const formatCount = (count: number) => {
    if (count >= 10000) {
      return (count / 10000).toFixed(1) + ' 万';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  const handleLike = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    toggleLikePost(post.id);
  };

  const displayedImages = showAllImages ? post.images : post.images.slice(0, 3);
  const remainingCount = post.images.length - 3;

  return (
    <div className="bg-white rounded-2xl border border-dark-300 overflow-hidden hover:shadow-elevation-1 transition-shadow">
      <div className="p-5">
        {/* 头部 - 用户信息 */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <img
              src={post.userAvatar}
              alt={post.userName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full ring-2 ring-dark-300"
            />
            <div>
              <h4 className="font-semibold text-dark-900 text-sm">{post.userName}</h4>
              <p className="text-xs text-dark-500">{formatTime(post.createdAt)}</p>
            </div>
          </div>
          <button
            className="p-1.5 rounded-full hover:bg-dark-200 text-dark-500 hover:text-dark-700 transition-colors"
            aria-label="更多"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* 正文 */}
        <p className="text-dark-800 text-sm mb-3 whitespace-pre-wrap leading-relaxed">
          {post.content}
        </p>

        {/* 图片网格 */}
        {post.images.length > 0 && (
          <div className={`grid gap-1.5 mb-3 ${
            post.images.length === 1 ? 'grid-cols-1' :
            post.images.length === 2 ? 'grid-cols-2' :
            'grid-cols-3'
          }`}>
            {displayedImages.map((img, index) => (
              <div
                key={index}
                className={`relative rounded-lg overflow-hidden cursor-pointer bg-dark-200 ${
                  post.images.length === 1 ? 'aspect-video' : 'aspect-square'
                }`}
                onClick={() => setShowAllImages(!showAllImages)}
              >
                <img
                  src={img}
                  alt={`图片${index + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {!showAllImages && index === 2 && remainingCount > 0 && (
                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                    <span className="text-lg font-semibold text-white">+{remainingCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 标签 */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {post.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2.5 py-1 text-xs bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 cursor-pointer transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 底部交互栏 */}
      <div className="px-5 py-3 border-t border-dark-200 flex items-center gap-6">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            post.isLiked
              ? 'text-vibe-red'
              : 'text-dark-500 hover:text-vibe-red'
          }`}
        >
          <Heart className={`w-[18px] h-[18px] ${post.isLiked ? 'fill-current' : ''}`} />
          <span>{formatCount(post.likes)}</span>
        </button>
        <button className="flex items-center gap-2 text-dark-500 hover:text-primary-600 transition-colors">
          <MessageCircle className="w-[18px] h-[18px]" />
          <span className="text-sm font-medium">{formatCount(post.comments)}</span>
        </button>
        <button className="flex items-center gap-2 text-dark-500 hover:text-accent-600 transition-colors ml-auto">
          <Share2 className="w-[18px] h-[18px]" />
          <span className="text-sm font-medium">{formatCount(post.shares)}</span>
        </button>
      </div>
    </div>
  );
};

export default PostCard;
