import { Link } from 'react-router-dom';
import { Play, Clock, Eye, Heart } from 'lucide-react';
import { Video, difficultyLabels } from '@/types';
import { useAppStore } from '@/store/appStore';

interface VideoCardProps {
  video: Video;
  showAuthor?: boolean;
}

const difficultyStyles: Record<string, { bg: string; fg: string; label: string }> = {
  beginner:     { bg: '#E6F4EA', fg: '#188038', label: '入门' },
  intermediate: { bg: '#FEF7E0', fg: '#B06000', label: '进阶' },
  advanced:     { bg: '#FCE8E6', fg: '#C5221F', label: '高级' },
};

const VideoCard = ({ video, showAuthor = true }: VideoCardProps) => {
  const { isFavorite, toggleFavorite } = useAppStore();
  const favorited = isFavorite(video.id);

  const formatViews = (views: number) => {
    if (views >= 10000) {
      return (views / 10000).toFixed(1) + ' 万';
    }
    return views.toLocaleString();
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(video.id);
  };

  const diff = difficultyStyles[video.difficulty] || difficultyStyles.beginner;

  return (
    <Link
      to={`/video/${video.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border-2 border-[#0A1A2F] shadow-[4px_4px_0_rgba(10,26,47,0.12)] hover:shadow-[6px_8px_0_rgba(47,107,255,0.25)] hover:-translate-y-1 transition-all duration-200"
    >
      <div className="relative aspect-video overflow-hidden bg-dark-200">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* 播放按钮 - 悬停显示 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-elevation-3">
            <Play className="w-5 h-5 text-primary-600 ml-0.5 fill-current" />
          </div>
        </div>

        {/* 时长徽章 */}
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 bg-black/75 backdrop-blur-sm rounded text-xs text-white font-medium flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {video.duration}
        </div>

        {/* 难度标签 */}
        <div className="absolute top-2.5 left-2.5">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: diff.bg, color: diff.fg }}
          >
            {difficultyLabels[video.difficulty]}
          </span>
        </div>

        {/* 收藏按钮 */}
        <button
          onClick={handleFavorite}
          aria-label={favorited ? '取消收藏' : '收藏'}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
            favorited
              ? 'bg-vibe-red text-white opacity-100'
              : 'bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 hover:bg-black/60'
          }`}
        >
          <Heart className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-dark-900 text-sm leading-snug line-clamp-2 mb-3 group-hover:text-primary-700 transition-colors">
          {video.title}
        </h3>

        <div className="flex items-center gap-4 text-xs text-dark-500">
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {formatViews(video.views)}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5" />
            {formatViews(video.likes)}
          </span>
        </div>

        {showAuthor && (
          <div className="mt-3 pt-3 border-t border-dark-200 flex items-center gap-2">
            <img
              src={video.authorAvatar}
              alt={video.author}
              className="w-6 h-6 rounded-full"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <span className="text-xs text-dark-600 truncate">{video.author}</span>
          </div>
        )}
      </div>
    </Link>
  );
};

export default VideoCard;
