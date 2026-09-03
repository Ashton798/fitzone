import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Sparkles, RefreshCw, Mic, Play,
  Film, Square, Volume2,
  AlertCircle, X, Image as ImageIcon, Lightbulb,
} from 'lucide-react';
import { ChatMessage } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { getVideoById } from '@/data/videos';
import { Link, useNavigate } from 'react-router-dom';
import {
  chatStream, analyzeImage, analyzeVideo,
  voiceTTS, extractVideoFrames,
  createSpeechRecognizer, isSpeechRecognitionSupported, SpeechRecognizer,
} from '@/lib/aiApi';
import { workoutsApi } from '@/lib/api';

type WorkoutAIContext = {
  days: number;
  workoutCount: number;
  records: Array<{ date: string; workoutName: string; exerciseId: string; exerciseName: string; sets: Array<{ weight: number; reps: number }> }>;
};

const answerWorkoutProgress = (question: string, context: WorkoutAIContext | null): string | null => {
  if (!/(最近|进步|上次|重量|纪录|记录|练多少|训练数据)/.test(question)) return null;
  if (!context?.records?.length) return '你的账号里还没有足够的训练记录，我暂时无法判断进步情况。先在「训练」里完成并保存几次训练，我就能基于真实数据帮你比较。';
  const names = [...new Set(context.records.map(item => item.exerciseName))];
  const matched = names.find(name => question.includes(name));
  if (!matched) return null;
  const rows = context.records.filter(item => item.exerciseName === matched && item.sets.length > 0);
  if (rows.length < 2) return `我只找到 1 次${matched}记录（${rows[0]?.date || '日期未知'}），数据还不足以判断趋势。再记录一次后，我就能做前后对比。`;
  const bestSet = (sets: Array<{ weight: number; reps: number }>) => [...sets].sort((a, b) => (b.weight * b.reps) - (a.weight * a.reps))[0];
  const first = bestSet(rows[0].sets);
  const latest = bestSet(rows.at(-1)!.sets);
  const delta = latest.weight - first.weight;
  const direction = delta > 0 ? `提高了 ${delta}kg` : delta < 0 ? `降低了 ${Math.abs(delta)}kg` : '重量保持不变';
  return `根据你最近 ${context.days} 天真实保存的训练记录：\n\n${matched}工作组从 **${first.weight}kg × ${first.reps}**（${rows[0].date}）变化到 **${latest.weight}kg × ${latest.reps}**（${rows.at(-1)!.date}），${direction}。\n\n建议继续以动作稳定为前提渐进加重；当当前重量能稳定完成目标次数时，再增加 2.5kg。`;
};

const AICoach = () => {
  const { isLoggedIn } = useAuthStore();
  const navigate = useNavigate();

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-primary-500 flex items-center justify-center shadow-elevation-3">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold font-display text-dark-900 mb-3">AI 健身教练</h2>
          <p className="text-dark-600 mb-6 text-sm leading-relaxed">
            登录后即可使用 AI 教练：文字对话、语音交流、上传图片/视频分析动作等
          </p>
          <button onClick={() => navigate('/login')} className="btn-filled text-base px-7 py-3">
            去登录
          </button>
        </div>
      </div>
    );
  }

  return <UnifiedChat />;
};

// ==================== 状态徽章 ====================

// ==================== 文字对话组件（豆包风格）====================
const QUICK_ACTIONS = [
  { label: '制定减脂计划', text: '帮我制定一个减脂训练计划，每周能练 4 天', icon: Lightbulb },
  { label: '增肌建议', text: '我想增肌，请给我一些训练和饮食建议', icon: Lightbulb },
  { label: '深蹲动作', text: '深蹲的正确姿势是怎样的？常见错误有哪些？', icon: Lightbulb },
  { label: '饮食搭配', text: '健身期间应该怎么搭配饮食？', icon: Lightbulb },
];

// ==================== 消息气泡（豆包风格）====================
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const imgs = Array.isArray(message.images) ? message.images : [];
  const [speaking, setSpeaking] = useState(false);

  const speak = async () => {
    if (!message.content || speaking) return;
    setSpeaking(true);
    try {
      const blob = await voiceTTS(message.content);
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
        };
        audio.play().catch(() => setSpeaking(false));
      } else {
        // localTTS 已通过 speechSynthesis 直接播放,等待预计时长后恢复
        const words = (message.content || '').length;
        setTimeout(() => setSpeaking(false), Math.max(2500, words * 160));
      }
    } catch (e) {
      console.warn('[朗读] 失败:', e);
      setSpeaking(false);
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-slide-up`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary-100' : 'bg-primary-500'
      }`}>
        {isUser ? <User className="w-4 h-4 text-primary-600" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
          isUser
            ? 'bg-primary-500 text-white rounded-tr-sm'
            : 'bg-white text-dark-800 rounded-tl-sm border border-dark-200 shadow-card'
        }`}>
          {/* 用户附件：图片 */}
          {imgs.length > 0 && (
            <div className={`grid gap-1.5 mb-2 ${imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {imgs.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`附件${i + 1}`}
                  loading="lazy"
                  className={`rounded-xl object-cover border border-white/20 ${imgs.length === 1 ? 'max-h-52 w-auto' : 'w-full aspect-video'}`}
                />
              ))}
            </div>
          )}
          {/* 用户附件：视频 */}
          {isUser && message.videoName && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/15 border border-white/25 px-3 py-2">
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span className="text-xs truncate">{message.videoName}</span>
            </div>
          )}
          {message.streaming && !message.content && !imgs.length ? (
            <div className="flex gap-1.5 py-1.5">
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <FormattedContent text={message.content} />
          )}
          {message.streaming && message.content && (
            <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary-400 animate-pulse align-middle rounded-sm" />
          )}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          <p className={`text-[11px] text-dark-500 ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {!isUser && message.content && !message.streaming && (
            <button
              onClick={speak}
              className={`inline-flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 transition-colors ${
                speaking
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-dark-500 hover:text-primary-600 hover:bg-primary-50'
              }`}
              title={speaking ? '正在朗读…' : '朗读回复'}
            >
              <Volume2 className={`w-3 h-3 ${speaking ? 'animate-pulse' : ''}`} />
              {speaking ? '朗读中' : '朗读'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Markdown 简易渲染 ====================
// 防御性渲染：流式输出过程中 text 可能是 undefined/空/非字符串
function FormattedContent({ text }: { text: string }) {
  // 防御性处理：确保 text 是字符串
  const safeText = typeof text === 'string' ? text : '';
  if (!safeText) return <div className="h-2" />;

  try {
    const lines = safeText.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        elements.push(
          <div key={`tbl-${elements.length}`} className="my-2 overflow-x-auto rounded-lg border border-dark-200">
            <table className="min-w-full text-xs">
              <thead className="bg-dark-100">
                <tr>{tableRows[0].map((c, i) => <th key={i} className="px-2.5 py-1.5 text-left text-dark-800 font-semibold border-b border-dark-200">{c}</th>)}</tr>
              </thead>
              <tbody>
                {tableRows.slice(2).map((row, ri) => (
                  <tr key={ri} className="border-b border-dark-200 last:border-b-0">
                    {row.map((c, ci) => <td key={ci} className="px-2.5 py-1.5 text-dark-700">{renderInline(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] || '';
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length >= 2) {
        inTable = true;
        tableRows.push(trimmed.slice(1, -1).split('|').map(s => s.trim()));
        continue;
      } else if (inTable) {
        flushTable();
      }

      // 推荐视频行: - [标题](/video/v1) 或 [标题](/video/v1) → 渲染成视频卡
      const videoLinkMatch = trimmed.match(/^(?:[-•*]\s*)?\[([^\]]*)\]\((\/video\/[\w-]+)\)$/);
      if (videoLinkMatch) {
        const video = getVideoById(videoLinkMatch[2].replace('/video/', ''));
        if (video) {
          elements.push(<VideoRecommendCard key={`v-${i}`} video={video} />);
          continue;
        }
      }

      if (line.startsWith('### ')) {
        elements.push(<h4 key={i} className="font-bold text-primary-700 mt-3 mb-1 text-sm">{line.slice(4)}</h4>);
      } else if (line.startsWith('## ')) {
        elements.push(<h3 key={i} className="font-bold text-dark-900 mt-3 mb-1 text-base">{line.slice(3)}</h3>);
      } else if (line.startsWith('# ')) {
        elements.push(<h2 key={i} className="font-bold text-dark-900 mt-2 mb-2 text-lg">{line.slice(2)}</h2>);
      } else if (line.startsWith('• ') || line.startsWith('- ')) {
        elements.push(<div key={i} className="flex gap-2 ml-1"><span className="text-primary-600 shrink-0">•</span><span>{renderInline(line.slice(2))}</span></div>);
      } else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)/);
        if (match) {
          elements.push(<div key={i} className="flex gap-2 ml-1"><span className="text-primary-600 font-semibold shrink-0">{match[1]}.</span><span>{renderInline(match[2])}</span></div>);
        }
      } else if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(<p key={i} className="leading-relaxed">{renderInline(line)}</p>);
      }
    }
    if (inTable) flushTable();

    return <div className="space-y-0.5 whitespace-pre-wrap">{elements}</div>;
  } catch (e) {
    // 渲染异常时降级为纯文本，绝不抛错导致白屏
    console.error('[FormattedContent] 渲染异常，降级纯文本:', e);
    return <div className="whitespace-pre-wrap leading-relaxed">{safeText}</div>;
  }
}

// ==================== AI 推荐的站内视频卡片 ====================
// 当 AI 回复中出现 [标题](/video/v1) 链接时,渲染成可点击跳转的视频卡
function VideoRecommendCard({ video }: { video: any }) {
  return (
    <Link
      to={`/video/${video.id}`}
      className="flex items-center gap-2.5 mt-1.5 mb-1 p-2 rounded-xl border border-primary-200 bg-primary-50/70 hover:bg-primary-100/80 hover:border-primary-300 transition-all group"
    >
      {/* 封面缩略图 */}
      <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-primary-200 flex-shrink-0">
        {video.thumbnail ? (
          <img src={video.thumbnail} alt={video.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-4 h-4 text-primary-500" />
          </div>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-4 h-4 text-white fill-current" />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-dark-900 truncate">{video.title}</p>
        <p className="text-[10px] text-primary-600 mt-0.5">
          {video.duration ? `${video.duration} · ` : ''}{video.movement || '跟练课程'}
        </p>
      </div>
      <span className="flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold text-primary-600">
        去观看
        <Play className="w-3 h-3 fill-current" />
      </span>
    </Link>
  );
}

function renderInline(text: string): React.ReactNode {
  if (typeof text !== 'string' || !text) return text || '';
  try {
    // 支持 markdown 链接 [标题](/video/v1) 与加粗/代码
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]*\]\([^)]*\))/g);
    return parts.map((part, i) => {
      if (typeof part !== 'string') return String(part ?? '');
      if (part.length >= 4 && part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-dark-900">{part.slice(2, -2)}</strong>;
      }
      if (part.length >= 2 && part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1.5 py-0.5 bg-dark-100 rounded text-primary-700 text-xs font-mono">{part.slice(1, -1)}</code>;
      }
      // markdown 链接
      const linkMatch = part.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
      if (linkMatch) {
        const label = linkMatch[1];
        const href = linkMatch[2];
        const m = href.match(/^\/video\/([\w-]+)/);
        if (m) {
          const video = getVideoById(m[1]);
          return (
            <Link
              key={i}
              to={`/video/${m[1]}`}
              className="inline-flex items-center gap-1.5 text-primary-600 font-semibold hover:text-primary-700 hover:underline underline-offset-4 decoration-primary-300 transition-colors"
              title={video?.title || label}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {video ? video.title.slice(0, 24) : label}
            </Link>
          );
        }
        if (href.startsWith('/')) {
          return (
            <Link key={i} to={href} className="text-primary-600 font-semibold hover:underline underline-offset-4">
              {label}
            </Link>
          );
        }
        return (
          <a key={i} href={href} target="_blank" rel="noreferrer" className="text-primary-600 font-semibold hover:underline underline-offset-4">
            {label}
          </a>
        );
      }
      return part;
    });
  } catch {
    return text;
  }
}

// ==================== 实时视频对话组件（浅色风格，移动端友好）====================

// ============================================================
// UnifiedChat 全能对话 —— 文字 / 图片 / 视频 / 语音 同一界面
// ============================================================
function UnifiedChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<{ file: File; url: string }[]>([]);
  const [pendingVideo, setPendingVideo] = useState<{ file: File; url: string } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [srSupported] = useState(() => isSpeechRecognitionSupported());
  const isListeningRef = useRef(false);
  // 让 ref 跟随 state
  const setListeningState = (v: boolean) => {
    isListeningRef.current = v;
    setIsListening(v);
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const bufferRef = useRef<string>('');
  const flushScheduledRef = useRef(false);
  const streamingIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  // 卸载时清理语音识别器与音频
  useEffect(() => {
    return () => {
      recognizerRef.current?.abort();
      recognizerRef.current = null;
    };
  }, []);
  const hasMessages = messages.length > 0;

  const flushBuffer = useCallback(() => {
    flushScheduledRef.current = false;
    const buffered = bufferRef.current;
    if (!buffered || !streamingIdRef.current) return;
    bufferRef.current = '';
    const aid = streamingIdRef.current;
    setMessages(prev => prev.map(m => (m.id === aid ? { ...m, content: m.content + buffered } : m)));
  }, []);
  const scheduleFlush = useCallback(() => {
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(flushBuffer);
    else setTimeout(flushBuffer, 30);
  }, [flushBuffer]);

  // 打字机效果：把完整结果逐步写入 assistant 消息
  const typewriteContent = useCallback((aid: string, fullText: string) => {
    setMessages(prev => prev.map(m => (m.id === aid ? { ...m, content: '', streaming: true } : m)));
    if (!fullText) {
      setMessages(prev => prev.map(m => (m.id === aid ? { ...m, content: '（没有返回内容）', streaming: false } : m)));
      setIsStreaming(false);
      return;
    }
    let idx = 0;
    const STEP = 6;
    const timer = setInterval(() => {
      idx = Math.min(fullText.length, idx + STEP);
      setMessages(prev => prev.map(m => (m.id === aid ? { ...m, content: fullText.slice(0, idx) } : m)));
      if (idx >= fullText.length) {
        clearInterval(timer);
        setMessages(prev => prev.map(m => (m.id === aid ? { ...m, streaming: false } : m)));
        setIsStreaming(false);
      }
    }, 22);
  }, []);

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if ((!text && pendingImages.length === 0 && !pendingVideo) || isStreaming) return;
    setError(null);
    setHint(null);

    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      role: 'user',
      content: text || (pendingVideo ? '(上传了一段视频)' : pendingImages.length ? '(上传了图片)' : ''),
      timestamp: new Date().toISOString(),
      images: pendingImages.length ? pendingImages.map(p => p.url) : undefined,
      videoName: pendingVideo ? pendingVideo.file.name : undefined,
    };
    const assistantId = 'a-' + Date.now();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      streaming: true,
    };

    const imgs = [...pendingImages];
    const vid = pendingVideo;
    setPendingImages([]);
    setPendingVideo(null);
    setInputValue('');
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    bufferRef.current = '';
    streamingIdRef.current = assistantId;

    try {
      // —— 视频：抽帧 -> 视觉模型 ——
      if (vid) {
        const question = text || '请分析这段健身动作视频，指出动作是否标准、问题与改进建议';
        setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: '正在解析视频、抽取关键帧…' } : m)));
        const { frames, duration } = await extractVideoFrames(vid.file, 6);
        if (!frames.length) throw new Error('视频抽帧失败，请换一个视频试试');
        setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: '已抽取 6 帧，AI 正在分析动作…' } : m)));
        const resp = await analyzeVideo(frames, duration, question, vid.file.name);
        typewriteContent(assistantId, resp.result || '抱歉，视频分析没有返回内容');
        return;
      }
      // —— 图片：视觉模型 ——
      if (imgs.length) {
        const question = text || '请分析这些健身照片，指出动作是否标准、问题与改进建议';
        const resp = await analyzeImage(imgs.map(p => p.file), question);
        typewriteContent(assistantId, resp.result || '抱歉，图片分析没有返回内容');
        return;
      }
      // —— 纯文字：流式对话 ——
      const controller = new AbortController();
      abortRef.current = controller;
      let workoutContext: WorkoutAIContext | null = null;
      try {
        workoutContext = await workoutsApi.getAIContext(30);
      } catch {
        // 登录失效或后端暂时不可用时，不编造训练数据。
      }
      const dataInstruction = workoutContext?.records?.length
        ? `以下是该用户最近${workoutContext.days}天真实保存的训练数据。只能基于这些记录回答涉及训练进步、重量、次数的问题；不得补造缺失数据。\n${JSON.stringify(workoutContext.records)}`
        : '当前没有可用的真实训练记录。用户询问自身训练进步、历史重量或次数时，必须明确说明数据不足，并建议先使用训练记录功能保存训练；不得编造数据。';
      const groundedAnswer = answerWorkoutProgress(text, workoutContext);
      if (groundedAnswer) {
        typewriteContent(assistantId, groundedAnswer);
        return;
      }
      const history = [{ role: 'system', content: dataInstruction }, ...messages, userMsg]
        .filter(m => (m.content || '').trim().length > 0)
        .slice(-11)
        .map(m => ({ role: m.role, content: m.content }));
      await chatStream(
        history,
        (chunk) => {
          if (typeof chunk !== 'string') return;
          bufferRef.current += chunk;
          scheduleFlush();
        },
        controller.signal
      );
      flushBuffer();
      setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, streaming: false } : m)));
    } catch (err: any) {
      flushBuffer();
      if (err?.name === 'AbortError') {
        setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: m.content + '\n\n（已停止）', streaming: false } : m)));
      } else {
        const errMsg = err?.message || '请求失败，请稍后重试';
        setError(errMsg);
        setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: m.content || ('抱歉，出错了：' + errMsg), streaming: false } : m)));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      streamingIdRef.current = null;
      bufferRef.current = '';
      flushScheduledRef.current = false;
    }
  };

  const stopStream = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
  };
  const clearChat = () => {
    if (isStreaming) return;
    setMessages([]);
    setError(null);
    setHint(null);
  };

  // ============ 语音输入 ============
  const toggleVoice = () => {
    if (!srSupported) {
      setHint('当前浏览器不支持语音识别，请使用 Chrome / Edge，或直接输入文字');
      return;
    }
    if (isListening) {
      recognizerRef.current?.stop();
      setListeningState(false);
      return;
    }
    setHint(null);
    setError(null);
    // 立即进入聆听态(不等 onStart,避免部分浏览器回调延迟导致无反馈)
    setListeningState(true);
    const recognizer = createSpeechRecognizer({
      onResult: (t, isFinal) => {
        if (isFinal) {
          setInputValue(prev => (prev ? prev + t : t).trim());
        } else {
          setInputValue(t);
        }
      },
      onError: (m) => { setListeningState(false); setHint('语音识别：' + m); },
      onEnd: () => {
        setListeningState(false);
        setInputValue(prev => {
          const v = prev.trim();
          if (v) setTimeout(() => sendMessage(v), 80);
          return prev;
        });
      },
      onStart: () => setListeningState(true),
    });
    if (!recognizer) {
      setListeningState(false);
      setHint('语音识别启动失败，请使用 Chrome / Edge 浏览器');
      return;
    }
    recognizerRef.current = recognizer;
    try {
      recognizer.start();
    } catch (e) {
      setListeningState(false);
      setHint('语音识别启动失败：' + (e as any)?.message || '未知错误');
    }
    // 超时保护：15 秒无结果自动停止，避免一直“聆听”
    setTimeout(() => {
      if (isListeningRef.current) {
        recognizer.stop();
        setListeningState(false);
        setHint('没有听到声音，已自动停止。可以再试一次或直接打字');
      }
    }, 15000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // 附件工具按钮
  const toolButtons = (
    <div className="flex items-center gap-1.5">
      <button onClick={() => imageInputRef.current?.click()} disabled={isStreaming}
        className="p-2 rounded-full text-dark-500 hover:bg-primary-50 hover:text-primary-600 transition-colors disabled:opacity-40" title="上传图片分析">
        <ImageIcon className="w-5 h-5" />
      </button>
      <button onClick={() => videoInputRef.current?.click()} disabled={isStreaming}
        className="p-2 rounded-full text-dark-500 hover:bg-primary-50 hover:text-primary-600 transition-colors disabled:opacity-40" title="上传视频分析">
        <Film className="w-5 h-5" />
      </button>
      <button onClick={toggleVoice} disabled={isStreaming}
        className={`relative p-2 rounded-full transition-colors disabled:opacity-40 ${isListening ? 'bg-vibe-red/10 text-vibe-red' : 'text-dark-500 hover:bg-primary-50 hover:text-primary-600'}`}
        title={srSupported ? '点击说话（语音输入）' : '语音识别不可用'}>
        <Mic className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
        {isListening && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-vibe-red rounded-full animate-ping" />}
      </button>
    </div>
  );

  // 待发送附件预览
  const renderPending = () => {
    if (!pendingImages.length && !pendingVideo) return null;
    return (
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {pendingImages.map((p, i) => (
          <div key={'pi' + i} className="relative group">
            <img src={p.url} alt={'p' + i} className="w-16 h-16 rounded-xl object-cover border border-dark-200" />
            <button onClick={() => setPendingImages(prev => prev.filter((_, j) => j !== i))}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-dark-900/80 text-white flex items-center justify-center hover:bg-vibe-red transition-colors" aria-label="移除">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {pendingVideo && (
          <div className="relative flex items-center gap-2 bg-white border border-dark-200 rounded-xl px-3 py-2 max-w-[240px]">
            <Play className="w-4 h-4 text-primary-600 shrink-0 fill-current" />
            <span className="text-xs text-dark-700 truncate">{pendingVideo.file.name}</span>
            <button onClick={() => { URL.revokeObjectURL(pendingVideo.url); setPendingVideo(null); }}
              className="w-5 h-5 rounded-full bg-dark-900/80 text-white flex items-center justify-center hover:bg-vibe-red transition-colors shrink-0" aria-label="移除">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const hiddenInputs = (
    <>
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (!files) return;
          const arr = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 5);
          if (!arr.length) return;
          setPendingImages(prev => [...prev, ...arr.map(f => ({ file: f, url: URL.createObjectURL(f) }))].slice(0, 5));
          e.target.value = '';
        }} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          if (!f.type.startsWith('video/')) { setHint('请选择视频文件'); return; }
          if (f.size > 200 * 1024 * 1024) { setHint('视频不能超过 200MB'); return; }
          setPendingVideo({ file: f, url: URL.createObjectURL(f) });
        }} />
    </>
  );

  // ============ 欢迎页 ============
  if (!hasMessages) {
    return (
      <div className="min-h-screen bg-dark-100 flex flex-col items-center px-4 py-10 overflow-y-auto pb-tabbar">
        {hiddenInputs}
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8 animate-slide-up">
            <div className="w-16 h-16 mx-auto mb-5 rounded-3xl bg-primary-500 flex items-center justify-center shadow-elevation-3">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="h-display text-3xl md:text-4xl text-dark-900 mb-2">你好，我是 FitZone AI 教练</h1>
            <p className="text-dark-600 text-sm md:text-base">打字 · 说话 · 上传图片 / 视频，随时开练</p>
            {!srSupported && (
              <p className="mt-2 text-xs text-vibe-orange inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> 语音识别需 Chrome / Edge；其他浏览器可打字
              </p>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-dark-300 shadow-card-hover p-3 animate-slide-up stagger-2">
            {renderPending()}
            <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="问任何健身问题，或上传图片 / 视频让我分析动作…"
              rows={3}
              className="w-full px-3 py-2 bg-transparent text-dark-900 placeholder-dark-500 focus:outline-none resize-none text-sm" />
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-200">
              <div className="flex items-center gap-1 text-xs text-dark-500">
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                <span>{isListening ? '正在聆听…' : '全能 AI 教练'}</span>
              </div>
              <div className="flex items-center gap-1">
                {toolButtons}
                <div className="w-px h-5 bg-dark-200 mx-1" />
                {isStreaming ? (
                  <button onClick={stopStream}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-vibe-red/10 text-vibe-red rounded-full text-xs font-medium hover:bg-vibe-red/20 transition-colors">
                    <Square className="w-3 h-3" /> 停止
                  </button>
                ) : (
                  <button onClick={() => sendMessage(inputValue)}
                    disabled={!inputValue.trim() && !pendingImages.length && !pendingVideo}
                    className="inline-flex items-center justify-center w-9 h-9 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" aria-label="发送">
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {(hint || error) && (
            <div className={`mt-3 flex items-center justify-center gap-1.5 text-xs rounded-full px-4 py-1.5 ${error ? 'text-vibe-red bg-red-50 border border-red-200' : 'text-vibe-orange bg-orange-50 border border-orange-200'}`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error || hint}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5 animate-slide-up stagger-3">
            {QUICK_ACTIONS.map(q => (
              <button key={q.label} onClick={() => sendMessage(q.text)} disabled={isStreaming}
                className="flex items-center gap-2.5 px-4 py-3 bg-white border border-dark-300 rounded-2xl text-left hover:border-primary-300 hover:shadow-card transition-all group disabled:opacity-50">
                <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                  <q.icon className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-sm text-dark-700 group-hover:text-primary-700">{q.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============ 对话页 ============
  return (
    <div className="min-h-screen bg-dark-100 flex flex-col app-fill">
      {hiddenInputs}
      <div className="flex items-center justify-between px-4 md:px-6 py-2.5 border-b border-dark-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-dark-900">小动 · 全能教练</span>
          <span className="text-xs text-accent-600 flex items-center gap-1 ml-1">
            <span className="w-1.5 h-1.5 bg-accent-500 rounded-full" />
            {isStreaming ? '思考中' : '在线'}
          </span>
        </div>
        <button onClick={clearChat} disabled={isStreaming}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-dark-600 hover:bg-dark-100 transition-colors disabled:opacity-40" title="新对话">
          <RefreshCw className="w-3.5 h-3.5" /> 新对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        <div className="max-w-3xl mx-auto space-y-5">
          {messages.map(m => <MessageBubble key={m.id} message={m} />)}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {(hint || error) && (
        <div className="px-4 md:px-6 pb-1">
          <div className={`max-w-3xl mx-auto text-xs flex items-center gap-2 ${error ? 'text-vibe-red' : 'text-vibe-orange'}`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error || hint}
          </div>
        </div>
      )}

      <div className="px-4 md:px-6 py-3 bg-white border-t border-dark-200">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-dark-300 shadow-card p-2.5 focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/15 transition-all">
            {renderPending()}
            <textarea ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? '正在聆听… 说完自动发送' : '输入问题，或上传图片 / 视频 / 语音… (Enter 发送)'}
              rows={1}
              className="w-full px-2 py-1.5 bg-transparent text-dark-900 placeholder-dark-500 focus:outline-none resize-none text-sm max-h-32" />
            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-dark-200">
              <span className="text-xs text-dark-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary-500" />
                {isListening ? '正在聆听' : '图文音视频对话'}
              </span>
              <div className="flex items-center gap-1">
                {toolButtons}
                <div className="w-px h-5 bg-dark-200 mx-1" />
                {isStreaming ? (
                  <button onClick={stopStream}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-vibe-red/10 text-vibe-red rounded-full text-xs font-medium hover:bg-vibe-red/20 transition-colors">
                    <Square className="w-3 h-3" /> 停止
                  </button>
                ) : (
                  <button onClick={() => sendMessage(inputValue)}
                    disabled={!inputValue.trim() && !pendingImages.length && !pendingVideo}
                    className="inline-flex items-center justify-center w-8 h-8 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" aria-label="发送">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AICoach;
