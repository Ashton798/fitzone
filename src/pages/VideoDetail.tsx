import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Play, Heart, Share2, ThumbsUp, Eye, Clock, ChevronLeft,
  AlertCircle, ExternalLink, Search, Loader2, RefreshCw
} from 'lucide-react';
import { getVideoById, getRelatedVideos } from '@/data/videos';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';
import { difficultyLabels } from '@/types';

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [iframeState, setIframeState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const { isFavorite, toggleFavorite } = useAppStore();
  const { isLoggedIn } = useAuthStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const video = id ? getVideoById(id) : undefined;
  const relatedVideos = id ? getRelatedVideos(id, 4) : [];
  const favorited = video ? isFavorite(video.id) : false;

  // 切换视频时重置状态
  useEffect(() => {
    setIframeState('loading');
    // 清理上一次的超时定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // B站 iframe 失败不会触发 onError，用超时兜底：10 秒未 load 视为失败
    timeoutRef.current = setTimeout(() => {
      setIframeState(prev => prev === 'loading' ? 'error' : prev);
    }, 10000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [id]);

  if (!video) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-900 mb-4">视频不存在</h2>
          <button onClick={() => navigate('/videos')} className="btn-primary">
            返回视频列表
          </button>
        </div>
      </div>
    );
  }

  const formatViews = (views: number) => {
    if (views >= 10000) {
      return (views / 10000).toFixed(1) + '万';
    }
    return views.toString();
  };

  const handleFavorite = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (video) {
      toggleFavorite(video.id);
    }
  };

  // B站嵌入播放器URL
  const bilibiliEmbedUrl = video.bvid
    ? `https://player.bilibili.com/player.html?bvid=${video.bvid}&high_quality=1&danmaku=0&autoplay=0`
    : '';
  const bilibiliWatchUrl = video.bvid
    ? `https://www.bilibili.com/video/${video.bvid}`
    : '';
  // 搜索兜底：用视频标题在B站搜索，即使 bvid 无效也能找到内容
  const bilibiliSearchUrl = `https://search.bilibili.com/all?keyword=${encodeURIComponent(video.title + ' ' + video.author)}`;

  const handleIframeLoad = () => {
    // iframe 触发 load 事件，清理超时定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIframeState('loaded');
  };

  const handleRetry = () => {
    setIframeState('loading');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIframeState(prev => prev === 'loading' ? 'error' : prev);
    }, 10000);
    // 强制 iframe 重新加载
    if (iframeRef.current) {
      const src = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.src = src;
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-dark-100 pt-20 pb-16">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-dark-500 hover:text-dark-900 mb-6 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          返回
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Video Section */}
          <div className="lg:col-span-2">
            {/* Video Player - B站iframe嵌入，带 loading/超时/搜索兜底 */}
            <div className="relative rounded-2xl overflow-hidden bg-black">
              {bilibiliEmbedUrl && iframeState !== 'error' ? (
                <div className="aspect-video w-full bg-black relative">
                  <iframe
                    ref={iframeRef}
                    src={bilibiliEmbedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                    referrerPolicy="no-referrer"
                    title={video.title}
                    onLoad={handleIframeLoad}
                  />
                  {/* Loading 蒙层：iframe 加载中显示 spinner */}
                  {iframeState === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-none">
                      <div className="text-center">
                        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-3" />
                        <p className="text-white text-sm">视频加载中...</p>
                        <p className="text-gray-400 text-xs mt-1">如长时间未加载，可点击下方"前往B站观看"</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center bg-black">
                  <div className="text-center p-8 max-w-md">
                    <AlertCircle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">视频无法在站内播放</h3>
                    <p className="text-gray-400 mb-5 text-sm">
                      该视频源可能已被下架或不允许嵌入。你可以通过以下方式继续观看：
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleRetry}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors text-sm font-medium"
                      >
                        <RefreshCw className="w-4 h-4" />
                        重试加载
                      </button>
                      {bilibiliWatchUrl && (
                        <a
                          href={bilibiliWatchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-dark-700 text-white rounded-xl hover:bg-dark-600 transition-colors text-sm font-medium"
                        >
                          <ExternalLink className="w-4 h-4" />
                          前往B站观看原视频
                        </a>
                      )}
                      <a
                        href={bilibiliSearchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors text-sm font-medium border border-white/20"
                      >
                        <Search className="w-4 h-4" />
                        在B站搜索类似视频
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 视频来源提示 */}
            {video.bvid && (
              <div className="mt-3 flex items-center gap-2 text-xs text-dark-500 flex-wrap">
                <span className="px-2 py-1 bg-dark-100 rounded text-dark-600">视频来源：B站</span>
                {bilibiliWatchUrl && (
                  <a
                    href={bilibiliWatchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    在B站打开
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <a
                  href={bilibiliSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary-600 hover:text-primary-700 transition-colors"
                >
                  搜索更多
                  <Search className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Video Info */}
            <div className="mt-6">
              <h1 className="text-2xl font-bold text-dark-900 mb-4">{video.title}</h1>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-dark-500">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{formatViews(video.views)} 次观看</span>
                </div>
                <div className="flex items-center gap-2 text-dark-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{video.duration}</span>
                </div>
                <span
                  className="px-3 py-1 rounded-lg text-xs font-medium"
                  style={
                    video.difficulty === 'beginner'
                      ? { backgroundColor: '#E6F4EA', color: '#188038' }
                      : video.difficulty === 'intermediate'
                      ? { backgroundColor: '#FEF7E0', color: '#B06000' }
                      : { backgroundColor: '#FCE8E6', color: '#C5221F' }
                  }
                >
                  {difficultyLabels[video.difficulty]}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={handleFavorite}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                    favorited
                      ? 'bg-primary-500 text-white'
                      : 'bg-white text-dark-600 hover:bg-dark-200 border border-dark-300'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`} />
                  {favorited ? '已收藏' : '收藏'}
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-white text-dark-600 hover:bg-dark-200 border border-dark-300 transition-all">
                  <ThumbsUp className="w-5 h-5" />
                  {formatViews(video.likes)}
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-white text-dark-600 hover:bg-dark-200 border border-dark-300 transition-all">
                  <Share2 className="w-5 h-5" />
                  分享
                </button>
              </div>

              {/* Author */}
              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-dark-300">
                <div className="flex items-center gap-4">
                  <img
                    src={video.authorAvatar}
                    alt={video.author}
                    className="w-12 h-12 rounded-full border-2 border-primary-500/50"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="font-semibold text-dark-900">{video.author}</h3>
                    <p className="text-sm text-dark-500">专业健身教练</p>
                  </div>
                </div>
                <button className="btn-primary px-5 py-2 text-sm">
                  关注
                </button>
              </div>

              {/* Description */}
              <div className="mt-6 p-6 bg-white rounded-2xl border border-dark-300">
                <h3 className="font-semibold text-dark-900 mb-3">视频简介</h3>
                <p className="text-dark-600 leading-relaxed">{video.description}</p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {video.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-primary-50 text-primary-700 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Related Videos */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className="text-lg font-semibold text-dark-900 mb-4">相关推荐</h3>
              <div className="space-y-4">
                {relatedVideos.map((v) => (
                  <Link
                    key={v.id}
                    to={`/video/${v.id}`}
                    className="group flex gap-3 p-2 rounded-xl bg-white border border-dark-300 hover:bg-dark-100 transition-colors"
                  >
                    <div className="relative flex-shrink-0 w-40 aspect-video rounded-xl overflow-hidden">
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-dark-900/30">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-dark-900/80 rounded text-xs text-white">
                        {v.duration}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-dark-900 text-sm line-clamp-2 group-hover:text-primary-600 transition-colors">
                        {v.title}
                      </h4>
                      <p className="text-xs text-dark-500 mt-1">{v.author}</p>
                      <p className="text-xs text-dark-500 mt-1">{formatViews(v.views)} 次观看</p>
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                to="/videos"
                className="mt-6 flex items-center justify-center gap-2 w-full py-3 text-primary-600 hover:text-primary-700 transition-colors"
              >
                查看更多视频
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;
