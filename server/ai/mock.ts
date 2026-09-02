// ============================================================
// AI Mock 兜底实现
// 当未配置 API Key 时，所有 AI 接口走这里返回模拟数据
// 让前端 UI 能完整演示，用户体验真实接口的流程
// ============================================================

// 模拟网络延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 健身话题关键词匹配
const FITNESS_REPLIES: { keywords: string[]; reply: string }[] = [
  {
    keywords: ['减脂', '减肥', '瘦身', '减重', '瘦'],
    reply: '关于减脂，我给你几个核心建议：\n\n1. **热量缺口**：每天摄入比消耗少 300-500 大卡\n2. **力量训练**：每周 3-4 次，保留肌肉量提升基础代谢\n3. **有氧运动**：每周 2-3 次 HIIT 或 30 分钟以上中低强度有氧\n4. **高蛋白饮食**：每公斤体重 1.6-2g 蛋白质，防止肌肉流失\n5. **充足睡眠**：每天 7-8 小时，睡眠不足会增加饥饿感\n\n需要我帮你制定详细的减脂计划吗？',
  },
  {
    keywords: ['增肌', '长肌肉', '壮', '肌肉'],
    reply: '增肌的关键在于：\n\n1. **热量盈余**：每天多吃 300-500 大卡\n2. **渐进超负荷**：每周尝试增加重量或次数\n3. **蛋白质充足**：每公斤体重 1.6-2.2g 蛋白质\n4. **复合动作**：深蹲、硬拉、卧推、引体向上为主\n5. **充足恢复**：同一肌群间隔 48 小时，每天睡 7-9 小时\n\n推荐推拉腿分化训练，每周 6 练 1 休。需要详细计划告诉我！',
  },
  {
    keywords: ['深蹲', 'squat'],
    reply: '深蹲正确姿势：\n\n1. 双脚与肩同宽，脚尖外展 30°\n2. 杠铃放斜方肌上，核心收紧\n3. 髋部后坐像坐椅子，膝盖跟脚尖方向\n4. 下蹲至大腿平行地面\n5. 脚跟蹬地站起，顶部不锁死膝盖\n\n常见错误：膝盖内扣、弯腰弓背、脚跟离地。建议先空杆练动作。',
  },
  {
    keywords: ['俯卧撑', 'push'],
    reply: '俯卧撑要点：\n\n1. 双手略宽于肩，身体呈一条直线\n2. 核心收紧，屁股不塌不翘\n3. 肘部约 45° 角，不要完全外展\n4. 控制下放 2-3 秒，胸部接近地面\n5. 胸部发力快速推起\n\n新手从跪姿俯卧撑开始，每天 3 组每组力竭。',
  },
  {
    keywords: ['饮食', '吃', '蛋白', '营养'],
    reply: '健身饮食原则：\n\n**蛋白质**（每公斤体重 1.6-2.2g）：鸡胸、鱼肉、牛肉、鸡蛋、豆腐\n**优质碳水**：糙米、燕麦、红薯、全麦面包\n**健康脂肪**：牛油果、坚果、橄榄油、鱼油\n\n**减脂**：热量缺口 300-500，高蛋白防肌肉流失\n**增肌**：热量盈余 300-500，训练前后补充碳水蛋白\n\n多喝水每天 2-3 升，少食多餐避免暴饮暴食。',
  },
  {
    keywords: ['计划', '安排', '训练'],
    reply: '我可以为你制定个性化计划，请告诉我：\n\n1. 目标：增肌 / 减脂 / 塑形 / 体能\n2. 基础：新手 / 有基础 / 进阶\n3. 频率：每周能练几天\n4. 场地：健身房 / 家里\n5. 时长：每次能练多久\n\n告诉我这些，给你定制专属计划！',
  },
  {
    keywords: ['休息', '恢复', '睡眠'],
    reply: '休息恢复要点：\n\n• 同一肌群间隔 48 小时\n• 每天 7-9 小时睡眠，11 点前入睡\n• 休息日可做主动恢复：散步、瑜伽、拉伸\n• 出现持续疲劳、食欲减退等过度训练信号时多休息\n\n记住：肌肉是在休息时生长的，不要急功近利！',
  },
];

const DEFAULT_REPLY = '这是个好问题！健身是循序渐进的过程。\n\n你可以告诉我更具体的需求：\n• 想知道某个动作怎么做？\n• 需要制定训练计划？\n• 饮食方面的疑问？\n• 减脂还是增肌？\n\n我会给你针对性的建议！💪';

// 简单关键词匹配
function matchReply(text: string): string {
  const lower = text.toLowerCase();
  for (const item of FITNESS_REPLIES) {
    if (item.keywords.some(k => lower.includes(k.toLowerCase()))) {
      return item.reply;
    }
  }
  return DEFAULT_REPLY;
}

// ==================== 文字对话（模拟流式） ====================
export async function mockChatStream(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void
): Promise<void> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const reply = lastUserMsg ? matchReply(lastUserMsg.content) : DEFAULT_REPLY;

  await delay(300);

  // 模拟逐字流式输出
  const chunks = reply.match(/.{1,8}/g) || [reply];
  for (const chunk of chunks) {
    await delay(40 + Math.random() * 30);
    onChunk(chunk);
  }
}

// ==================== 图片动作分析 ====================
export async function mockAnalyzeImage(
  imageName: string,
  userQuestion: string
): Promise<string> {
  await delay(1500);

  const q = userQuestion || '动作分析';
  return `## 🤖 AI 动作分析报告\n\n（演示模式 - 未配置豆包 API Key，以下是模拟分析结果）\n\n**拍摄图片**：${imageName}\n**用户提问**：${q}\n\n---\n\n### 📊 整体评估\n**动作评分**：85 / 100 ⭐⭐⭐⭐\n\n### ✅ 做得好的地方\n- 站姿稳定，重心分布合理\n- 核心收紧，脊柱保持中立位\n- 膝盖方向与脚尖基本一致\n\n### ⚠️ 需要改进\n1. **髋部位置**：髋部略微偏高，建议下蹲时再多坐一点\n2. **膝盖**：膝盖有轻微内扣倾向，注意向外推\n3. **背部**：上背部略微圆肩，挺胸收肩胛骨\n\n### 💡 改进建议\n- 下蹲前先深呼吸收紧核心\n- 想象坐椅子，髋部先向后坐\n- 膝盖向外推，与脚尖同向\n- 顶部不要锁死膝盖\n\n### 🎯 训练建议\n- 当前重量合适，先巩固动作模式\n- 建议录视频侧面拍摄更易分析\n- 每周记录一次动作视频对比进步\n\n---\n\n💡 配置豆包 API Key 后将获得真实精准的视觉分析能力，能识别具体动作类型、关节角度、肌肉发力等细节。`;
}

// ==================== 视频动作分析 ====================
export async function mockAnalyzeVideo(
  videoName: string,
  durationSec: number,
  userQuestion: string
): Promise<string> {
  await delay(2500);

  return `## 🎬 AI 视频动作分析报告\n\n（演示模式 - 未配置豆包 API Key，以下是模拟分析结果）\n\n**视频文件**：${videoName}\n**视频时长**：${durationSec.toFixed(1)} 秒\n**用户提问**：${userQuestion || '动作分析'}\n\n---\n\n### 📊 整体评估\n**动作评分**：82 / 100 ⭐⭐⭐⭐\n**动作类型**：深蹲训练\n**完成次数**：8 次\n\n### 📈 帧序列分析\n\n| 时间段 | 动作阶段 | 评分 | 备注 |\n|--------|---------|------|------|\n| 0-3s | 准备姿势 | 90 | 站姿标准 |\n| 3-6s | 第1次下蹲 | 85 | 髋部略高 |\n| 6-9s | 第2次 | 88 | 改进明显 |\n| 9-12s | 第3次 | 80 | 膝盖内扣 |\n| 12-15s | 第4次 | 82 | 速度过快 |\n\n### ✅ 优点\n- 动作节奏整体稳定\n- 全程核心收紧良好\n- 下蹲深度达标\n\n### ⚠️ 主要问题\n1. **第3次重复**：膝盖明显内扣，可能造成膝盖压力\n2. **离心阶段**：下蹲速度过快，建议控制 2-3 秒\n3. **顶部位置**：站起时膝盖完全锁死，应保持微曲\n\n### 💡 训练建议\n- 减轻重量，先纠正膝盖内扣问题\n- 离心阶段控制 3 秒，向心阶段 1 秒\n- 顶部保持微曲膝，保护关节\n- 建议用弹力带绕膝盖提示向外推\n\n---\n\n💡 配置豆包 API Key 后将逐帧分析关键姿势，识别肌肉发力顺序、关节角度变化轨迹等专业指标。`;
}

// ==================== 语音转文字（ASR） ====================
export async function mockASR(audioDurationSec: number): Promise<string> {
  await delay(800);
  // 根据音频时长返回不同的模拟文本
  const samples = [
    '教练，我想问一下深蹲的时候膝盖应该怎么放？',
    '帮我制定一个减脂的训练计划。',
    '俯卧撑做不了多少个，怎么提升？',
    '增肌期间每天应该吃多少蛋白质？',
    '深蹲的时候腰有点不舒服，是姿势问题吗？',
  ];
  return samples[Math.floor(Math.random() * samples.length)];
}

// ==================== 文字转语音（TTS） ====================
// 返回一个最简单的 WAV 音频，让前端能播放出声音（无声）
export async function mockTTS(text: string): Promise<Buffer> {
  await delay(500);

  // 生成一个 1 秒静音的 WAV 文件
  const sampleRate = 16000;
  const durationSec = Math.min(3, Math.max(1, text.length / 10));
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample

  const header = Buffer.alloc(44);
  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  // 静音数据 + 微弱提示音（让用户能听到一点声音）
  const data = Buffer.alloc(dataSize);
  for (let i = 0; i < numSamples; i++) {
    // 前 0.2 秒一个 440Hz 提示音
    if (i < sampleRate * 0.2) {
      const sample = Math.sin(2 * Math.PI * 440 * (i / sampleRate)) * 0.1 * 32767;
      data.writeInt16LE(sample, i * 2);
    }
  }

  return Buffer.concat([header, data]);
}
