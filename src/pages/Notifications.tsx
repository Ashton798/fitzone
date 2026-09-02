import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell, Heart, MessageSquare, UserPlus, AtSign, Trophy,
  Settings, Trash2, CheckCheck, ChevronLeft, Dot
} from 'lucide-react';

// 模拟通知数据
interface NotificationItem {
  id: string;
  type: 'system' | 'community' | 'message';
  title: string;
  content: string;
  time: string;
  read: boolean;
  icon: typeof Bell;
  color: string;
  link?: string;
}

const mockNotifications: NotificationItem[] = [
  {
    id: 'n1',
    type: 'system',
    title: '系统通知',
    content: '欢迎使用 FitZone！完成首次训练即可获得新人勋章 🎉',
    time: '2分钟前',
    read: false,
    icon: Bell,
    color: 'from-primary-500 to-vibe-purple',
    link: '/videos',
  },
  {
    id: 'n2',
    type: 'community',
    title: '收到新的点赞',
    content: '健身达人 赞了你的动态「今日打卡：完成30分钟HIIT训练」',
    time: '15分钟前',
    read: false,
    icon: Heart,
    color: 'from-red-500 to-pink-500',
    link: '/community',
  },
  {
    id: 'n3',
    type: 'community',
    title: '新的评论',
    content: '运动小能手 评论了你的动态：太棒了！一起加油💪',
    time: '1小时前',
    read: false,
    icon: MessageSquare,
    color: 'from-blue-500 to-cyan-500',
    link: '/community',
  },
  {
    id: 'n4',
    type: 'community',
    title: '新的关注',
    content: '晨跑爱好者 关注了你，快去看看 Ta 的主页吧',
    time: '3小时前',
    read: true,
    icon: UserPlus,
    color: 'from-green-500 to-emerald-500',
    link: '/community',
  },
  {
    id: 'n5',
    type: 'message',
    title: '私信消息',
    content: '李教练：今天的训练计划已经发给你了，记得打卡哦～',
    time: '昨天',
    read: true,
    icon: AtSign,
    color: 'from-vibe-purple to-pink-500',
    link: '/chat',
  },
  {
    id: 'n6',
    type: 'system',
    title: '打卡成就解锁',
    content: '恭喜！你已连续打卡 7 天，获得「坚持一周」徽章 🔥',
    time: '2天前',
    read: true,
    icon: Trophy,
    color: 'from-yellow-500 to-orange-500',
    link: '/profile',
  },
  {
    id: 'n7',
    type: 'system',
    title: '系统升级通知',
    content: 'FitZone 已更新至 v2.0，新增 AI 教练智能推荐功能，立即体验！',
    time: '3天前',
    read: true,
    icon: Settings,
    color: 'from-cyan-500 to-blue-500',
    link: '/ai-coach',
  },
];

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'system', label: '系统' },
  { key: 'community', label: '社区' },
  { key: 'message', label: '私信' },
] as const;

const Notifications = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'community' | 'message'>('all');
  const [notifications, setNotifications] = useState(mockNotifications);

  const filtered = activeTab === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeTab);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleReadAll = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有通知吗？')) {
      setNotifications([]);
    }
  };

  const handleClick = (item: NotificationItem) => {
    handleRead(item.id);
    if (item.link) {
      navigate(item.link);
    }
  };

  return (
    <div className="min-h-screen bg-dark-100 pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-dark-200 text-dark-500 hover:text-dark-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-dark-900">消息通知</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-primary-500 text-white rounded-full">
                  {unreadCount} 条未读
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReadAll}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-dark-600 hover:text-dark-900 hover:bg-dark-200 rounded-xl transition-colors"
              title="全部已读"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">全部已读</span>
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-dark-600 hover:text-vibe-red hover:bg-red-500/10 rounded-xl transition-colors"
              title="清空通知"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">清空</span>
            </button>
          </div>
        </div>

        {/* Tab 切换 */}
        <div className="flex items-center gap-2 mb-6 bg-dark-100 rounded-2xl p-1 overflow-x-auto">
          {tabs.map(tab => {
            const count = tab.key === 'all'
              ? notifications.length
              : notifications.filter(n => n.type === tab.key).length;
            const unread = tab.key === 'all'
              ? unreadCount
              : notifications.filter(n => n.type === tab.key && !n.read).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-600 hover:text-dark-900 hover:bg-dark-200'
                }`}
              >
                {tab.label}
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                    {unread}
                  </span>
                )}
                {unread === 0 && count > 0 && (
                  <span className="text-xs text-dark-500">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 通知列表 */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-dark-500" />
            </div>
            <p className="text-dark-500">暂无通知消息</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleClick(item)}
                  className={`group flex gap-4 p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                    item.read
                      ? 'bg-white border-dark-300'
                      : 'bg-primary-50/40 border-primary-200 hover:border-primary-300'
                  }`}
                >
                  {/* 图标 */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${item.read ? 'text-dark-700' : 'text-dark-900'}`}>
                        {item.title}
                      </h3>
                      {!item.read && (
                        <Dot className="w-4 h-4 text-primary-500 fill-primary-500" />
                      )}
                    </div>
                    <p className={`text-sm leading-relaxed mb-1 ${item.read ? 'text-dark-500' : 'text-dark-800'}`}>
                      {item.content}
                    </p>
                    <p className="text-xs text-dark-500">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 底部提示 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-dark-500">
            仅显示最近 30 天的通知消息
          </p>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
