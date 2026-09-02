// ============================================================
// 豆包（火山引擎）API 封装
// 官网：https://www.volcengine.com/product/doubao
// 视觉模型：doubao-1.5-vision-pro-32k（识别图片/视频帧）
// 语音合成 TTS：openspeech.bytedance.com/api/v1/tts
// 语音识别 ASR：openspeech.bytedance.com/api/v1/auc/recognize/flash
// ============================================================

import FormData from 'form-data';
import fs from 'fs';

const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const TTS_URL = 'https://openspeech.bytedance.com/api/v1/tts';
const ASR_URL = 'https://openspeech.bytedance.com/api/v1/auc/recognize/flash';

// 是否配置了豆包视觉 API
export function isDoubaoVisionConfigured(): boolean {
  // 官方豆包 或 OpenRouter 字节 Seed 视觉模型 任一可用即视为已配置
  return !!process.env.DOUBAO_ARK_API_KEY || !!process.env.OPENROUTER_API_KEY;
}

// 是否配置了豆包语音 API（TTS/ASR）
export function isDoubaoVoiceConfigured(): boolean {
  return !!(process.env.VOLC_APPID && process.env.VOLC_ACCESS_TOKEN);
}

// ==================== 视觉模型：分析图片 ====================
// 支持单张或多张图片，返回文字分析
export async function doubaoAnalyzeImages(
  imageBuffers: { data: Buffer; mime: string }[],
  userQuestion: string
): Promise<string> {
  const apiKey = process.env.DOUBAO_ARK_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey && !orKey) {
    throw new Error('视觉 API Key 未配置，请在 .env 中设置 DOUBAO_ARK_API_KEY 或 OPENROUTER_API_KEY');
  }
  // 官方豆包优先;无豆包 key 时走 OpenRouter 的字节 Seed 视觉模型
  const baseUrl = apiKey ? ARK_BASE_URL : 'https://openrouter.ai/api/v1';
  const useKey = apiKey || orKey!;
  const model = apiKey
    ? process.env.DOUBAO_VISION_MODEL || 'doubao-1.5-vision-pro-32k'
    : process.env.OPENROUTER_VISION_MODEL || 'bytedance-seed/seed-1.6-flash';

  // 构造多模态消息
  const content: any[] = [
    {
      type: 'text',
      text: userQuestion || '请分析这张健身动作图片，指出动作是否标准，有哪些问题需要改进，给出具体建议。',
    },
  ];

  for (const img of imageBuffers) {
    const base64 = img.data.toString('base64');
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mime};base64,${base64}` },
    });
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${useKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`视觉 API 调用失败 (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || '分析失败，未返回内容';
}

// ==================== 视觉模型：分析视频帧序列 ====================
// 前端抽好的关键帧，按顺序传给豆包
export async function doubaoAnalyzeVideoFrames(
  frames: { data: Buffer; mime: string; timestamp: number }[],
  userQuestion: string,
  totalDuration: number
): Promise<string> {
  const apiKey = process.env.DOUBAO_ARK_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey && !orKey) {
    throw new Error('视觉 API Key 未配置');
  }
  const baseUrl = apiKey ? ARK_BASE_URL : 'https://openrouter.ai/api/v1';
  const useKey = apiKey || orKey!;
  const model = apiKey
    ? process.env.DOUBAO_VISION_MODEL || 'doubao-1.5-vision-pro-32k'
    : process.env.OPENROUTER_VISION_MODEL || 'bytedance-seed/seed-1.6-flash';

  const promptText = `用户上传了一段健身动作视频（总时长 ${totalDuration.toFixed(1)} 秒），我已从中抽取了 ${frames.length} 个关键帧（按时间顺序）。
${userQuestion ? '用户提问：' + userQuestion : '请分析这段健身动作视频'}

请按以下结构输出分析报告：
1. **动作识别**：判断是什么动作（深蹲/硬拉/卧推/俯卧撑/引体向上/平板支撑等）
2. **整体评分**：给出 1-100 分
3. **动作优点**：列出做得好的地方
4. **问题分析**：指出动作中存在的问题，按时间帧说明
5. **改进建议**：给出具体可执行的改进建议
6. **训练建议**：包括重量选择、组数次数、频率等`;

  const content: any[] = [{ type: 'text', text: promptText }];

  for (const frame of frames) {
    const base64 = frame.data.toString('base64');
    content.push({
      type: 'image_url',
      image_url: { url: `data:${frame.mime};base64,${base64}` },
    });
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${useKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      temperature: 0.3,
      max_tokens: 3072,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`视频分析 API 调用失败 (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || '分析失败，未返回内容';
}

// ==================== 语音合成 TTS ====================
// 文字 → 音频（WAV/MP3）
export async function doubaoTTS(text: string): Promise<Buffer> {
  const appid = process.env.VOLC_APPID;
  const accessToken = process.env.VOLC_ACCESS_TOKEN;
  const cluster = process.env.VOLC_TTS_CLUSTER || 'volcano_tts';

  if (!appid || !accessToken) {
    throw new Error('火山语音未配置，需要 VOLC_APPID 和 VOLC_ACCESS_TOKEN');
  }

  const voiceType = process.env.VOLC_TTS_VOICE || 'zh_female_qingxin';

  const reqId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const body = {
    app: { appid, token: 'access_token', cluster },
    user: { uid: 'fitzone-user' },
    audio: {
      voice_type: voiceType,
      encoding: 'mp3',
      speed_ratio: 1.0,
      volume_ratio: 1.0,
      pitch_ratio: 1.0,
    },
    request: {
      reqid: reqId,
      text,
      text_type: 'plain',
      operation: 'query',
    },
  };

  const response = await fetch(TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer; ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`豆包 TTS 调用失败 (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  if (data.code !== 3000 || !data.data) {
    throw new Error(`豆包 TTS 返回错误: ${data.message || '未知错误'}`);
  }

  // data 字段是 base64 编码的音频
  return Buffer.from(data.data, 'base64');
}

// ==================== 语音识别 ASR（一句话识别） ====================
// 音频 → 文字
export async function doubaoASR(audioBuffer: Buffer, mime: string): Promise<string> {
  const appid = process.env.VOLC_APPID;
  const accessToken = process.env.VOLC_ACCESS_TOKEN;
  const cluster = process.env.VOLC_ASR_CLUSTER || 'volcengine_streaming_common';

  if (!appid || !accessToken) {
    throw new Error('火山语音未配置');
  }

  // 转换 mime 为音频格式参数
  const format = mime.includes('wav') ? 'wav' : mime.includes('mp3') ? 'mp3' : 'ogg';

  const formData = new FormData();
  formData.append('audio_file', audioBuffer, { filename: 'audio.' + format, contentType: mime });
  formData.append('appid', appid);
  formData.append('cluster', cluster);
  formData.append('language', 'zh-CN');
  formData.append('format', format);
  formData.append('rate', '16000');

  const response = await fetch(ASR_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer; ${accessToken}`,
      ...formData.getHeaders(),
    },
    body: formData as any,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`豆包 ASR 调用失败 (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  if (data.code !== 1000) {
    throw new Error(`豆包 ASR 返回错误: ${data.message || '未知错误'}`);
  }

  // result 字段是识别文本
  return data.result || '';
}
