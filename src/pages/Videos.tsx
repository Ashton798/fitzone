import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, Dumbbell } from 'lucide-react';
import VideoCard from '@/components/VideoCard';
import { videos } from '@/data/videos';
import { categories } from '@/data/categories';
import { Difficulty, difficultyLabels } from '@/types';

const Videos = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedMovement, setSelectedMovement] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState('popular');

  // 当前品类的动作列表（品类→动作二级筛选）
  const currentCategory = categories.find(c => c.id === selectedCategory);
  const movements = currentCategory?.movements || [];

  const filteredVideos = useMemo(() => {
    let result = [...videos];

    if (selectedCategory !== 'all') {
      result = result.filter(v => v.category === selectedCategory);
    }

    if (selectedMovement !== 'all') {
      result = result.filter(v => v.movement === selectedMovement);
    }

    if (selectedDifficulty !== 'all') {
      result = result.filter(v => v.difficulty === selectedDifficulty);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v =>
        v.title.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        (v.movement || '').toLowerCase().includes(query) ||
        v.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => b.views - a.views);
        break;
      case 'newest':
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case 'likes':
        result.sort((a, b) => b.likes - a.likes);
        break;
    }

    return result;
  }, [selectedCategory, selectedMovement, selectedDifficulty, searchQuery, sortBy]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedMovement('all'); // 切换品类时重置动作筛选
    const params = new URLSearchParams(searchParams);
    if (categoryId === 'all') {
      params.delete('category');
    } else {
      params.set('category', categoryId);
    }
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen bg-dark-100 pt-16 pb-16">
      {/* Page Header - 深蓝运动风 */}
      <div className="relative overflow-hidden py-20 mb-10 hero-gradient">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-dark-100" style={{ transform: 'skewY(-2deg) scale(1.02)', transformOrigin: 'bottom left' }} />
        <div className="container mx-auto px-4 relative z-10">
          <span className="sticker sticker-blue text-sm px-3.5 py-1.5 mb-5 inline-block">
            <Dumbbell className="w-3.5 h-3.5 inline mr-1" />
            90+ 真实教学视频
          </span>
          <h1 className="font-display text-4xl md:text-6xl text-white mb-4">
            视频<span className="gradient-text">教学</span>
          </h1>
          <p className="text-primary-200/90 max-w-xl text-base md:text-lg">
            海量专业健身视频，从入门到进阶，按品类与动作分好类，找到适合你的训练课程
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Search and Filters */}
        <div className="mb-8 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索视频、课程、教练..."
                className="w-full pl-12 pr-4 py-4 bg-white border border-dark-300 rounded-2xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all"
              />
            </form>

            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-4 pr-10 py-4 bg-white border border-dark-300 rounded-2xl text-dark-900 focus:outline-none focus:border-primary-500 transition-all cursor-pointer"
                >
                  <option value="popular">最受欢迎</option>
                  <option value="newest">最新发布</option>
                  <option value="likes">最多点赞</option>
                </select>
                <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-dark-600 hover:bg-dark-200 hover:text-dark-900 border border-dark-300'
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-dark-600 hover:bg-dark-200 hover:text-dark-900 border border-dark-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Movement Filter - 品类下的具体动作筛选 */}
          {selectedCategory !== 'all' && movements.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              <Dumbbell className="w-4 h-4 text-dark-500" />
              <span className="text-sm text-dark-500">动作：</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedMovement('all')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedMovement === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'
                  }`}
                >
                  全部
                </button>
                {movements.map((m) => (
                  <button
                    key={m}
                    onClick={() => setSelectedMovement(m)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedMovement === m
                        ? 'bg-primary-500 text-white'
                        : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Difficulty Filter */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-dark-500" />
            <span className="text-sm text-dark-500">难度：</span>
            <div className="flex gap-2">
              {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedDifficulty(level)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedDifficulty === level
                      ? 'bg-accent-500 text-white'
                      : 'text-dark-500 hover:text-dark-900 hover:bg-dark-100'
                  }`}
                >
                  {level === 'all' ? '全部' : difficultyLabels[level as Difficulty]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-dark-500">
            共找到 <span className="text-dark-900 font-semibold">{filteredVideos.length}</span> 个视频
          </p>
        </div>

        {/* Video Grid */}
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video, index) => (
              <div key={video.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                <VideoCard video={video} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-100 flex items-center justify-center">
              <Search className="w-10 h-10 text-dark-500" />
            </div>
            <h3 className="text-xl font-semibold text-dark-900 mb-2">没有找到相关视频</h3>
            <p className="text-dark-500 mb-6">试试其他关键词或筛选条件</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedMovement('all');
                setSelectedDifficulty('all');
              }}
              className="btn-primary"
            >
              重置筛选
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Videos;
