import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HelpCircle, ChevronLeft, ChevronDown, Search,
  Phone, Mail, MessageCircle, Play, BookOpen,
  User, CreditCard, Shield, Zap, AlertCircle
} from 'lucide-react';

// FAQ 数据
interface FAQItem {
  q: string;
  a: string;
  category: string;
}

const faqData: FAQItem[] = [
  // 账号问题
  {
    category: '账号',
    q: '如何注册 FitZone 账号？',
    a: '点击首页右上角的「登录」按钮，选择「微信登录」「QQ登录」或「手机号验证码登录」即可快速注册。手机号登录时，输入11位手机号后点击「获取验证码」，输入收到的6位验证码即可完成注册登录。',
  },
  {
    category: '账号',
    q: '忘记密码怎么办？',
    a: '在登录页选择「密码登录」方式，点击「忘记密码？」按钮，通过绑定的手机号验证后即可重置密码。如果没有绑定手机号，请联系客服协助处理。',
  },
  {
    category: '账号',
    q: '如何修改昵称、头像和个性签名？',
    a: '登录后点击右上角头像进入「个人中心」，点击「编辑资料」即可修改昵称、头像（提供15个预设头像可选）和个性签名。修改后自动保存。',
  },
  {
    category: '账号',
    q: '如何注销账号？',
    a: '进入「隐私与安全」→「账号操作」→「注销账号」，按提示二次确认即可。注意：注销后账号和数据将永久删除，无法恢复。',
  },
  // 视频相关
  {
    category: '视频',
    q: '视频无法播放怎么办？',
    a: '1) 检查网络连接是否正常；2) 尝试刷新页面或更换浏览器；3) 视频来源为B站，如加载失败可点击「在B站打开」直接跳转B站观看；4) 清理浏览器缓存后重试。',
  },
  {
    category: '视频',
    q: '视频内容与标题不符？',
    a: '所有视频均来自B站知名健身博主官方账号（帕梅拉、Rita Mark 等），内容真实可靠。如发现内容不符，请通过「联系客服」反馈，我们会尽快核实处理。',
  },
  {
    category: '视频',
    q: '如何收藏喜欢的视频？',
    a: '在视频播放页点击「收藏」按钮即可加入收藏夹，收藏的视频可在个人中心查看。收藏功能需要先登录账号。',
  },
  {
    category: '视频',
    q: '视频可以下载吗？',
    a: '由于视频版权限制，目前不支持直接下载。建议在线观看，或前往B站原视频页面查看是否支持缓存下载。',
  },
  // 社区
  {
    category: '社区',
    q: '如何在社区发布动态？',
    a: '进入「社区广场」页面，点击底部的「发动态」按钮，输入文字内容（可添加标签），点击发布即可。发布动态需要先登录账号。',
  },
  {
    category: '社区',
    q: '如何添加好友和私信聊天？',
    a: '1) 在社区广场点击其他用户的头像进入主页，点击「加好友」发送请求；2) 对方同意后，点击导航栏的「私信」图标即可开始聊天。',
  },
  {
    category: '社区',
    q: '如何续火花？',
    a: '和好友每天互相发送一条消息即可续火花。连续聊天天数越多，火花等级越高。中断聊天超过24小时，火花会熄灭。',
  },
  // AI 教练
  {
    category: 'AI教练',
    q: 'AI 教练如何使用？',
    a: '进入「AI教练」页面，在聊天框输入你的健身问题（如：如何练腹肌、减脂饮食建议等），AI 教练会根据你的问题提供专业的个性化建议。',
  },
  {
    category: 'AI教练',
    q: 'AI 教练的建议可靠吗？',
    a: 'AI 教练基于专业健身知识库训练，建议具有参考价值。但如有特殊健康状况或伤病，请咨询专业医生或线下教练，AI 建议不能替代专业医疗意见。',
  },
  // 饮食计划
  {
    category: '饮食',
    q: '如何添加饮食记录？',
    a: '进入「饮食计划」页面，选择日期和餐次（早餐/午餐/晚餐/加餐），点击「添加食物」输入食物名称和热量等营养信息即可记录。',
  },
  {
    category: '饮食',
    q: '可以查看历史饮食记录吗？',
    a: '可以。在「饮食计划」页面点击日期选择器，选择想查看的日期即可查看当天的所有饮食记录和营养摄入汇总。',
  },
  // 安全隐私
  {
    category: '安全',
    q: '我的个人信息安全吗？',
    a: 'FitZone 严格保护用户隐私。你的手机号、密码等敏感信息均加密存储，不会未经授权分享给第三方。可在「隐私与安全」页面管理隐私设置。',
  },
  {
    category: '安全',
    q: '如何屏蔽其他用户？',
    a: '进入对方主页，点击右上角「...」选择「屏蔽」。屏蔽后对方无法查看你的动态、给你发消息。可在「隐私与安全」中管理屏蔽列表。',
  },
];

const categories = ['全部', '账号', '视频', '社区', 'AI教练', '饮食', '安全'];

const quickGuides = [
  { icon: Play, title: '如何观看视频', desc: '视频播放与收藏指南', color: 'from-primary-500 to-vibe-purple', link: '/videos' },
  { icon: User, title: '完善个人资料', desc: '修改头像昵称签名', color: 'from-blue-500 to-cyan-500', link: '/profile' },
  { icon: BookOpen, title: '加入社区', desc: '发动态加好友聊天', color: 'from-green-500 to-emerald-500', link: '/community' },
  { icon: Zap, title: 'AI 教练使用', desc: '智能健身问答', color: 'from-yellow-500 to-orange-500', link: '/ai-coach' },
];

const Help = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = faqData.filter(item => {
    const matchCategory = activeCategory === '全部' || item.category === activeCategory;
    const matchSearch = !searchQuery ||
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-dark-100 pt-20 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* 顶部标题栏 */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-dark-200 text-dark-500 hover:text-dark-900 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary-600" />
            <h1 className="text-2xl font-bold text-dark-900">帮助中心</h1>
          </div>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索问题，如：如何修改昵称、视频无法播放..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-dark-300 rounded-2xl text-dark-900 placeholder-dark-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 transition-all"
          />
        </div>

        {/* 快速指南 */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-dark-900 mb-4">快速入门</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickGuides.map((guide, index) => {
              const Icon = guide.icon;
              return (
                <Link
                  key={index}
                  to={guide.link}
                  className="group p-4 bg-white rounded-2xl border border-dark-300 hover:border-primary-300 hover:bg-dark-100 transition-all hover:scale-[1.02]"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${guide.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-dark-900 text-sm mb-1">{guide.title}</h3>
                  <p className="text-xs text-dark-500">{guide.desc}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 联系客服 */}
        <section className="mb-10">
          <div className="relative overflow-hidden rounded-2xl bg-primary-50 border border-primary-200 p-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-lg font-semibold text-dark-900 mb-2">没找到答案？联系客服</h2>
              <p className="text-dark-600 text-sm mb-4">我们的客服团队随时为你服务</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <a href="tel:18560167655" className="flex items-center gap-3 p-3 bg-white border border-dark-300 rounded-xl hover:bg-dark-100 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-dark-500">电话客服</p>
                    <p className="text-sm text-dark-900 font-medium">18560167655</p>
                  </div>
                </a>
                <a href="mailto:service@fitzone.com" className="flex items-center gap-3 p-3 bg-white border border-dark-300 rounded-xl hover:bg-dark-100 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-dark-500">邮箱客服</p>
                    <p className="text-sm text-dark-900 font-medium">发送邮件</p>
                  </div>
                </a>
                <Link to="/community" className="flex items-center gap-3 p-3 bg-white border border-dark-300 rounded-xl hover:bg-dark-100 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-vibe-purple/20 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-vibe-purple" />
                  </div>
                  <div>
                    <p className="text-xs text-dark-500">社区反馈</p>
                    <p className="text-sm text-dark-900 font-medium">发帖反馈</p>
                  </div>
                </Link>
              </div>
              <p className="text-xs text-dark-500 mt-3">客服工作时间：9:00 - 18:00</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-lg font-semibold text-dark-900 mb-4">常见问题</h2>

          {/* 分类切换 */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-dark-600 hover:text-dark-900 hover:bg-dark-200 border border-dark-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 问题列表 */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-dark-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-dark-500" />
              </div>
              <p className="text-dark-600 mb-2">没有找到相关问题</p>
              <p className="text-sm text-dark-500">尝试换个关键词，或联系客服</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item, index) => {
                const id = `${item.category}-${index}`;
                const expanded = expandedId === id;
                return (
                  <div
                    key={id}
                    className="bg-white rounded-2xl border border-dark-300 overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setExpandedId(expanded ? null : id)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-dark-100 transition-colors text-left"
                    >
                      <div className="flex-shrink-0 px-2 py-1 text-xs bg-primary-50 text-primary-700 rounded-md">
                        {item.category}
                      </div>
                      <span className="flex-1 text-dark-900 font-medium">{item.q}</span>
                      <ChevronDown className={`w-5 h-5 text-dark-500 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 pt-1">
                        <p className="text-dark-700 text-sm leading-relaxed pl-12">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 底部链接 */}
        <div className="mt-12 p-4 bg-dark-100 rounded-xl border border-dark-300 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-dark-600">
            <Shield className="w-4 h-4 text-primary-600" />
            <span>你的权益受保护</span>
          </div>
          <div className="flex gap-4 text-sm">
            <Link to="/privacy" className="text-primary-600 hover:text-primary-700 transition-colors">
              隐私政策
            </Link>
            <Link to="/notifications" className="text-primary-600 hover:text-primary-700 transition-colors">
              消息通知
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;
