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

export default router;
