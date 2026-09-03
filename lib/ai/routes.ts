/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================
// AI 路由模块
// 所有 AI 接口都支持 mock 兜底：未配置 API Key 时走 mock 实现
// 已配置 Key 时调用真实 API
// ============================================================

import { Router } from 'express';
import multer from 'multer';
import type { Request, Response } from 'express';
import { isDeepSeekConfigured, deepseekChatStream, deepseekChat } from './deepseek.js';
import {
  isDoubaoVisionConfigured,
  isDoubaoVoiceConfigured,
  doubaoAnalyzeImages,
  doubaoAnalyzeVideoFrames,
  doubaoTTS,
  doubaoASR,
} from './doubao.js';
import {
  mockChatStream,
  mockAnalyzeImage,
  mockAnalyzeVideo,
  mockTTS,
  mockASR,
} from './mock.js';

const router = Router();

// 文件上传配置（内存存储，限制 50MB - 视频文件可能较大）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ==================== 查询 AI 配置状态 ====================
// 前端用这个接口判断是否走真实 AI
router.get('/status', (req: Request, res: Response) => {
  res.json({
    text_chat: isDeepSeekConfigured() ? 'real' : 'mock',
    image_analysis: isDoubaoVisionConfigured() ? 'real' : 'mock',
    video_analysis: isDoubaoVisionConfigured() ? 'real' : 'mock',
    voice_asr: isDoubaoVoiceConfigured() ? 'real' : 'mock',
    voice_tts: isDoubaoVoiceConfigured() ? 'real' : 'mock',
    real_time_video: 'mock', // 实时视频对话暂只支持 mock
  });
});

// ==================== 文字对话（流式 SSE） ====================
// POST /api/ai/chat
// body: { messages: [{role, content}], stream?: boolean }
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, stream = true } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages 不能为空' });
    }

    // 流式响应
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const sendChunk = (chunk: string) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      };

      try {
        if (isDeepSeekConfigured()) {
          await deepseekChatStream(messages, sendChunk);
        } else {
          await mockChatStream(messages, sendChunk);
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (err: any) {
        // 真实 API 失败时降级到 mock
        if (isDeepSeekConfigured()) {
          console.warn('[AI Chat] DeepSeek 调用失败，降级到 mock:', err.message);
          await mockChatStream(messages, sendChunk);
          res.write(`data: ${JSON.stringify({ done: true, fallback: true })}\n\n`);
        } else {
          throw err;
        }
      }

      res.end();
    } else {
      // 非流式
      const useReal = isDeepSeekConfigured();
      if (useReal) {
        const text = await deepseekChat(messages);
        res.json({ text });
      } else {
        let result = '';
        await mockChatStream(messages, c => (result += c));
        res.json({ text: result });
      }
    }
  } catch (err: any) {
    console.error('[AI Chat] 错误:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'AI 对话失败' });
    }
  }
});

// ==================== 图片分析 ====================
// POST /api/ai/analyze/image
// multipart: images[] (File), question (string)
router.post('/analyze/image', upload.array('images', 5), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const question = req.body?.question || '';

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '请至少上传一张图片' });
    }

    const imageBuffers = files.map(f => ({ data: f.buffer, mime: f.mimetype }));

    if (isDoubaoVisionConfigured()) {
      try {
        const result = await doubaoAnalyzeImages(imageBuffers, question);
        return res.json({ result, mode: 'real' });
      } catch (err: any) {
        console.warn('[AI Image] 豆包调用失败，降级 mock:', err.message);
        const result = await mockAnalyzeImage(files[0].originalname, question);
        return res.json({ result, mode: 'fallback', error: err.message });
      }
    } else {
      const result = await mockAnalyzeImage(files[0].originalname, question);
      return res.json({ result, mode: 'mock' });
    }
  } catch (err: any) {
    console.error('[AI Image] 错误:', err);
    res.status(500).json({ error: err.message || '图片分析失败' });
  }
});

// ==================== 视频分析（前端抽帧后上传） ====================
// POST /api/ai/analyze/video
// multipart: frames[] (File[], 多张关键帧), duration (string, 视频总秒数), question (string)
router.post('/analyze/video', upload.array('frames', 16), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    const duration = parseFloat(req.body?.duration || '0');
    const question = req.body?.question || '';
    const videoName = req.body?.videoName || 'uploaded-video.mp4';

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '请上传视频帧' });
    }

    const frames = files.map((f, i) => ({
      data: f.buffer,
      mime: f.mimetype,
      timestamp: (duration / files.length) * i,
    }));

    if (isDoubaoVisionConfigured()) {
      try {
        const result = await doubaoAnalyzeVideoFrames(frames, question, duration);
        return res.json({ result, mode: 'real' });
      } catch (err: any) {
        console.warn('[AI Video] 豆包调用失败，降级 mock:', err.message);
        const result = await mockAnalyzeVideo(videoName, duration, question);
        return res.json({ result, mode: 'fallback', error: err.message });
      }
    } else {
      const result = await mockAnalyzeVideo(videoName, duration, question);
      return res.json({ result, mode: 'mock' });
    }
  } catch (err: any) {
    console.error('[AI Video] 错误:', err);
    res.status(500).json({ error: err.message || '视频分析失败' });
  }
});

// ==================== 语音识别 ASR ====================
// POST /api/ai/voice/asr
// multipart: audio (File, wav/mp3/webm)
router.post('/voice/asr', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: '请上传音频文件' });
    }

    if (isDoubaoVoiceConfigured()) {
      try {
        const text = await doubaoASR(file.buffer, file.mimetype);
        return res.json({ text, mode: 'real' });
      } catch (err: any) {
        console.warn('[AI ASR] 豆包调用失败，降级 mock:', err.message);
        // 假设音频 5 秒
        const text = await mockASR(5);
        return res.json({ text, mode: 'fallback', error: err.message });
      }
    } else {
      const text = await mockASR(5);
      return res.json({ text, mode: 'mock' });
    }
  } catch (err: any) {
    console.error('[AI ASR] 错误:', err);
    res.status(500).json({ error: err.message || '语音识别失败' });
  }
});

// ==================== 语音合成 TTS ====================
// POST /api/ai/voice/tts
// body: { text: string }
router.post('/voice/tts', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text 不能为空' });
    }

    let audioBuffer: Buffer;
    let mode = 'mock';

    if (isDoubaoVoiceConfigured()) {
      try {
        audioBuffer = await doubaoTTS(text);
        mode = 'real';
      } catch (err: any) {
        console.warn('[AI TTS] 豆包调用失败，降级 mock:', err.message);
        audioBuffer = await mockTTS(text);
        mode = 'fallback';
      }
    } else {
      audioBuffer = await mockTTS(text);
    }

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', audioBuffer.length.toString());
    res.setHeader('X-AI-Mode', mode);
    return res.send(audioBuffer);
  } catch (err: any) {
    console.error('[AI TTS] 错误:', err);
    res.status(500).json({ error: err.message || '语音合成失败' });
  }
});

const parseJSONObject = (text: string) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI 返回格式不完整');
  return JSON.parse(text.slice(start, end + 1));
};

const fallbackWorkoutPlan = (goal: string, days: number) => {
  const templates = [
    { name: 'Push', focus: '胸 + 肩 + 三头', exercises: [['bench-press', '卧推'], ['incline-dumbbell-press', '上斜哑铃卧推'], ['overhead-press', '肩推'], ['lateral-raise', '侧平举'], ['rope-pushdown', '绳索下压']] },
    { name: 'Pull', focus: '背 + 二头', exercises: [['pull-up', '引体向上'], ['lat-pulldown', '高位下拉'], ['seated-row', '坐姿划船'], ['dumbbell-curl', '哑铃弯举']] },
    { name: 'Legs', focus: '腿 + 核心', exercises: [['squat', '深蹲'], ['deadlift', '硬拉'], ['leg-press', '腿举']] },
  ];
  return templates.slice(0, Math.max(1, Math.min(days, 3))).map((template, index) => ({
    ...template,
    name: days === 1 ? `${goal || '全身'}训练` : template.name,
    weekday: [1, 3, 5][index],
    exercises: template.exercises.map(([exerciseId, exerciseName]) => ({ exerciseId, exerciseName, sets: 3, weight: 0, reps: 8, restSeconds: 90 })),
  }));
};

router.post('/generate/workout-plan', async (req: Request, res: Response) => {
  const goal = String(req.body?.goal || '增肌').slice(0, 40);
  const level = String(req.body?.level || '初级').slice(0, 20);
  const equipment = String(req.body?.equipment || '健身房器械').slice(0, 80);
  const days = Math.max(1, Math.min(6, Number(req.body?.days) || 3));
  try {
    if (!isDeepSeekConfigured()) return res.json({ plans: fallbackWorkoutPlan(goal, days), mode: 'fallback' });
    const text = await deepseekChat([{ role: 'user', content: `请为${level}训练者生成每周${days}天、目标为${goal}、可用器械为${equipment}的训练计划。只输出 JSON：{"plans":[{"name":"Push","focus":"胸+肩+三头","weekday":1,"exercises":[{"exerciseId":"bench-press","exerciseName":"卧推","sets":3,"weight":0,"reps":8,"restSeconds":90}]}]}。动作仅可从这些 id 中选择：bench-press卧推、incline-dumbbell-press上斜哑铃卧推、squat深蹲、deadlift硬拉、pull-up引体向上、lat-pulldown高位下拉、seated-row坐姿划船、dumbbell-curl哑铃弯举、rope-pushdown绳索下压、lateral-raise侧平举、leg-press腿举、overhead-press肩推。不要输出 Markdown。` }]);
    const parsed = parseJSONObject(text);
    if (!Array.isArray(parsed.plans) || !parsed.plans.length) throw new Error('计划为空');
    res.json({ plans: parsed.plans.slice(0, days), mode: 'real' });
  } catch (error: any) {
    res.json({ plans: fallbackWorkoutPlan(goal, days), mode: 'fallback', warning: error.message });
  }
});

const fallbackMeals = (calories: number) => [
  { mealType: 'breakfast', name: '燕麦牛奶 + 鸡蛋 + 香蕉', calories: Math.round(calories * .25), protein: 28, carbs: 62, fat: 15, description: '提前准备，作为早餐计划', eaten: false },
  { mealType: 'lunch', name: '鸡胸肉米饭 + 西兰花', calories: Math.round(calories * .35), protein: 48, carbs: 78, fat: 16, description: '训练日均衡午餐', eaten: false },
  { mealType: 'dinner', name: '清蒸鱼 + 红薯 + 蔬菜', calories: Math.round(calories * .30), protein: 42, carbs: 55, fat: 14, description: '高蛋白晚餐', eaten: false },
  { mealType: 'snack', name: '酸奶 + 坚果', calories: Math.round(calories * .10), protein: 15, carbs: 20, fat: 10, description: '加餐计划', eaten: false },
];

router.post('/generate/meal-plan', async (req: Request, res: Response) => {
  const goal = String(req.body?.goal || '保持').slice(0, 40);
  const preferences = String(req.body?.preferences || '家常饮食').slice(0, 120);
  const calories = Math.max(1200, Math.min(5000, Number(req.body?.calories) || 2200));
  try {
    if (!isDeepSeekConfigured()) return res.json({ meals: fallbackMeals(calories), mode: 'fallback' });
    const text = await deepseekChat([{ role: 'user', content: `为目标${goal}、每日约${calories}千卡、偏好${preferences}的用户生成一天餐单。只输出 JSON：{"meals":[{"mealType":"breakfast","name":"食物和份量","calories":500,"protein":30,"carbs":60,"fat":15,"description":"准备说明","eaten":false}]}。必须包含 breakfast、lunch、dinner，可选 snack；营养数字合理且总热量接近目标。不要输出 Markdown。` }]);
    const parsed = parseJSONObject(text);
    if (!Array.isArray(parsed.meals) || !parsed.meals.length) throw new Error('餐单为空');
    res.json({ meals: parsed.meals.slice(0, 5).map((meal: any) => ({ ...meal, eaten: false })), mode: 'real' });
  } catch (error: any) {
    res.json({ meals: fallbackMeals(calories), mode: 'fallback', warning: error.message });
  }
});

export default router;
