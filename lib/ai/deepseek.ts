// ============================================================
// DeepSeek API 封装
// 官网：https://platform.deepseek.com
// API 兼容 OpenAI 格式，使用 openai SDK 调用
// 文档：https://api-docs.deepseek.com/
// ============================================================

import OpenAI from 'openai';
import { VIDEO_CATALOG } from './videoCatalog.js';

// 是否已配置 DeepSeek API Key
export function isDeepSeekConfigured(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

// 获取 DeepSeek 客户端
function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DeepSeek API Key 未配置，请在 .env 中设置 DEEPSEEK_API_KEY');
  }
  return new OpenAI({
    baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey,
  });
}

// AI 健身教练系统提示
const buildSystemPrompt = (): string => {
  // 视频目录文本（按动作分组）
  const group = new Map<string, string[]>();
  for (const v of VIDEO_CATALOG) {
    const key = v.movement || '其他';
    if (!group.has(key)) group.set(key, []);
    group.get(key)!.push(`${v.id}(${v.title.slice(0, 14)})`);
  }
  const catalogLines: string[] = [];
  for (const [mv, ids] of group) {
    catalogLines.push(`- ${mv}：${ids.join('、')}`);
  }
  const catalogText = catalogLines.join('\n');

  return `你是 FitZone 健身平台的 AI 健身教练，名字叫"小动"。你具备专业健身、营养、运动康复知识，回答要像真人私教一样专业、详细、有温度。

你的职责：
1. 为用户制定个性化健身计划（增肌/减脂/塑形/体能/康复），给出**具体到每天练什么、几组几次**的安排
2. 解答动作问题（深蹲/卧推/硬拉/俯卧撑等），讲清楚姿势要点、发力感受、常见错误、进阶思路
3. 提供饮食营养建议（热量、三大营养素、三餐搭配、补剂）
4. 解答运动损伤与恢复问题
5. 提供鼓励与坚持动力

回答风格要求：
- 用中文，语气亲切自然，像真人教练，可适当用 emoji
- **回答要详细、可执行**：多用 **加粗**、有序列表、小标题、分点；训练安排要写清"动作+组数+次数+休息"；饮食要写清吃什么、吃多少
- 一般回答 400~900 字；制定完整计划时可以用表格或分天列出
- 专业但通俗，避免堆砌术语
- 用户问题含糊时，先问清目标/基础/器械条件再给方案，不要硬答
- 涉及伤病疼痛时，提醒先就医，再给一般性建议

**站内视频推荐（重要）**：
FitZone 站内有真实跟练视频，每个动作都有对应课程。当用户问某个动作怎么做、想跟练、或你给出训练计划时，请在回答末尾用下面格式推荐 1~3 个最相关的站内视频（必须使用目录中存在的 id，格式严格为 markdown 链接，一行一个）：

📺 推荐跟练：
- [深蹲标准教学](/video/v1)

视频目录（动作：视频id(标题)，供你选择推荐）：
${catalogText}

你正在和一位健身爱好者对话，请提供专业、贴心、可执行的建议。`;
};

// ==================== 流式文字对话 ====================
export async function deepseekChatStream(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const client = getClient();
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const fullMessages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    ...messages.map(m => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const stream = await client.chat.completions.create({
    model,
    messages: fullMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 2048,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      onChunk(delta);
    }
  }
}

// ==================== 普通文字对话（非流式） ====================
export async function deepseekChat(
  messages: { role: string; content: string }[]
): Promise<string> {
  const client = getClient();
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const fullMessages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    ...messages.map(m => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  const completion = await client.chat.completions.create({
    model,
    messages: fullMessages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  return completion.choices?.[0]?.message?.content || '';
}
