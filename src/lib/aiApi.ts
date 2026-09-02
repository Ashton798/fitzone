// ============================================================
// 前端 AI API 客户端
// 默认走同源 /api（开发时 vite proxy 到后端 3001）
// 如果后端不可用（纯静态部署），自动降级到本地 mock 模式：
//   - 对话：根据关键词返回智能健身建议，模拟流式输出
//   - 图片/视频分析：返回结构化分析报告
//   - 语音识别：返回模拟文本
//   - 语音合成：使用浏览器 SpeechSynthesis API 真实发声
// ============================================================

import { getToken } from './api';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('fitzone_ai_base_url');
    if (custom) return custom.replace(/\/$/, '');
  }
  return (import.meta as any).env?.VITE_AI_API_URL || '/api';
}

function url(path: string): string {
  return `${getBaseUrl()}${path}`;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ==================== AI 配置状态 ====================
export interface AIStatus {
  text_chat: 'real' | 'mock';
  image_analysis: 'real' | 'mock';
  video_analysis: 'real' | 'mock';
  voice_asr: 'real' | 'mock';
  voice_tts: 'real' | 'mock';
  real_time_video: 'real' | 'mock';
}

let cachedStatus: AIStatus | null = null;
let backendAvailable: boolean | null = null;

export async function getAIStatus(force = false): Promise<AIStatus> {
  if (cachedStatus && !force) return cachedStatus;
  try {
    const resp = await fetch(url('/ai/status'), { headers: authHeaders() });
    if (resp.ok) {
      cachedStatus = await resp.json();
      backendAvailable = true;
      return cachedStatus;
    }
  } catch (e) {
    console.warn('[AI] 后端不可用，使用本地 mock 模式', e);
  }
  backendAvailable = false;
  cachedStatus = {
    text_chat: 'mock',
    image_analysis: 'mock',
    video_analysis: 'mock',
    voice_asr: 'mock',
    voice_tts: 'mock',
    real_time_video: 'mock',
  };
  return cachedStatus;
}

// ==================== 本地 Mock 对话引擎 ====================
// 根据用户消息关键词匹配健身知识库，生成自然流畅的回复
const KB: { keys: string[]; reply: string }[] = [
  {
    keys: ['减脂', '减肥', '瘦身', '燃脂', '掉秤', '体脂'],
    reply:
      '减脂的核心是「热量缺口 + 力量训练 + 有氧」三件套，给你一套可直接执行的方案：\n\n' +
      '**1. 饮食（占减脂效果 70%）**\n' +
      '- 每日热量缺口控制在 300-500 大卡，不要节食\n' +
      '- 蛋白质吃到体重(kg)×1.6g，比如 60kg 每天约 96g\n' +
      '- 主食换成粗粮：燕麦、糙米、红薯，晚餐减量\n\n' +
      '**2. 训练安排**\n' +
      '- 每周 3 次力量训练（深蹲/硬拉/卧推/划船）保留肌肉\n' +
      '- 每周 2-3 次 LISS 低强度有氧（快走/慢跑 30-40 分钟）\n' +
      '- 可加 1 次 HIIT（20 分钟即可）提升燃脂效率\n\n' +
      '**3. 关键提醒**\n' +
      '- 睡眠 7 小时以上，熬夜会拉高皮质醇阻碍减脂\n' +
      '- 每周称重 1 次即可，看腰围比看体重更准\n' +
      '- 坚持 8-12 周能看到明显变化，别急于求成\n\n' +
      '想让我帮你安排一周具体训练课表吗？告诉我你的训练基础和可用时间。',
  },
  {
    keys: ['增肌', '增重', '长肌肉', '肌肉量', '纬度', '围度'],
    reply:
      '增肌的本质是「渐进超负荷 + 充足蛋白质 + 热量盈余 + 恢复」：\n\n' +
      '**1. 训练原则**\n' +
      '- 每周每个肌群练 2 次（上下分化或推拉腿分化）\n' +
      '- 复合动作优先：深蹲、硬拉、卧推、引体、推举\n' +
      '- 每组 6-12 次，做到接近力竭(RIR 1-2)，每周加重量或加次数\n\n' +
      '**2. 饮食**\n' +
      '- 热量盈余 300-500 大卡/天，体重每周涨 0.25-0.5kg 为佳\n' +
      '- 蛋白质体重(kg)×1.8-2.2g\n' +
      '- 训练后 1 小时内补充碳水+蛋白（如香蕉+乳清蛋白）\n\n' +
      '**3. 推荐一周计划（推拉腿）**\n' +
      '- 周一 推：卧推 4×8 / 哑铃推举 3×10 / 绳索下压 3×12\n' +
      '- 周二 拉：硬拉 4×6 / 引体 3×力竭 / 划船 3×10\n' +
      '- 周四 腿：深蹲 4×8 / 腿举 3×12 / 腿弯举 3×12\n' +
      '- 周五 推拉循环 / 周六腿+核心\n\n' +
      '新手前 6-12 个月是「新手福利期」，增肌效率最高，抓住这段时间。需要针对某个肌群细化动作吗？',
  },
  {
    keys: ['腹肌', '马甲线', '核心', '人鱼线', '肚子', '小腹'],
    reply:
      '腹肌是「低体脂 + 核心训练」共同作用的结果，体脂降不下来腹肌永远出不来：\n\n' +
      '**1. 体脂门槛**\n' +
      '- 男性体脂 12-15% 腹肌线条明显\n' +
      '- 女性体脂 18-22% 马甲线清晰\n' +
      '- 所以腹肌主要靠饮食控制，不是只靠练\n\n' +
      '**2. 核心训练（每周 3 次，每次 10-15 分钟）**\n' +
      '- 卷腹 3×20（上腹）\n' +
      '- 仰卧抬腿 3×15（下腹）\n' +
      '- 俄罗斯转体 3×20（侧腹）\n' +
      '- 平板支撑 3×45 秒（深层核心）\n' +
      '- 死虫式 3×12（抗伸展核心稳定）\n\n' +
      '**3. 常见误区**\n' +
      '- 每天做 1000 个卷腹不会让肚子变小，局部减脂不存在\n' +
      '- 体脂高时先做全身减脂，腹肌训练作为辅助\n' +
      '- 别只练腹直肌，侧腹和深层核心也要练\n\n' +
      '我可以在视频教学页给你推荐几套腹肌跟练视频，直接照着做就行。',
  },
  {
    keys: ['深蹲', '硬拉', '卧推', '力量', '举铁', '杠铃', '哑铃'],
    reply:
      '力量训练三大项的技术要点，按从易到难给你梳理：\n\n' +
      '**深蹲（腿+臀+核心）**\n' +
      '- 站距与肩同宽，脚尖外展 15-30°\n' +
      '- 下蹲时膝盖跟随脚尖方向，臀部向后坐\n' +
      '- 深度到大腿平行地面或略低，核心全程收紧\n' +
      '- 常见错误：膝盖内扣、弯腰、脚跟离地\n\n' +
      '**卧推（胸+三头+前束）**\n' +
      '- 肩胛骨后缩下沉，背部微起桥\n' +
      '- 杠铃下放到乳头下方一点，小臂垂直地面\n' +
      '- 双脚踩实地面，臀部不离开凳子\n' +
      '- 常见错误：手腕弯曲、臀部抬起、下放不到位\n\n' +
      '**硬拉（背+臀+腿后侧）**\n' +
      '- 杠铃贴近小腿，站距与髋同宽\n' +
      '- 髋折+膝屈同时启动，背部保持中立位\n' +
      '- 站起时臀部向前推，不要用腰拉\n' +
      '- 常见错误：弯腰、杠铃离身体太远、膝盖先伸直\n\n' +
      '建议先用空杆把动作模式练对，再逐步加重。哪个动作想让我详细拆解？',
  },
  {
    keys: ['拉伸', '热身', '放松', '柔韧', '恢复'],
    reply:
      '拉伸和恢复是被低估的训练环节，做好能让训练效率翻倍：\n\n' +
      '**1. 动态热身（训练前 5-10 分钟）**\n' +
      '- 开合跳 / 高抬腿 / 弓步走 / 髋部绕环\n' +
      '- 目的：升高体温、激活肌肉、润滑关节\n' +
      '- 不要做长时间静态拉伸，会降低力量输出\n\n' +
      '**2. 静态拉伸（训练后 10 分钟）**\n' +
      '- 每个部位 30 秒 ×2 组\n' +
      '- 胸：门框拉伸 / 背：猫牛式 / 腿后侧：坐姿前屈\n' +
      '- 髋屈肌：弓步下沉 / 臀：鸽子式\n\n' +
      '**3. 主动恢复**\n' +
      '- 训练日之间安排 1 天完全休息或低强度活动\n' +
      '- 泡沫轴放松紧张肌群 10 分钟\n' +
      '- 充足睡眠是最好的恢复手段\n\n' +
      '如果你经常觉得肌肉紧绷，建议每天睡前做 10 分钟全身拉伸，改善柔韧性的同时助眠。视频教学页有专门的拉伸跟练，可以去试试。',
  },
  {
    keys: ['饮食', '吃', '蛋白', '碳水', '营养', '食谱', '吃什么'],
    reply:
      '健身饮食的黄金比例，记住「433」原则：\n\n' +
      '**1. 三大营养素配比**\n' +
      '- 蛋白质 30%：鸡胸肉、鱼、虾、鸡蛋、牛肉、乳清蛋白\n' +
      '- 碳水 40%：燕麦、糙米、红薯、全麦、水果\n' +
      '- 脂肪 30%：坚果、牛油果、橄榄油、鱼油\n\n' +
      '**2. 一日三餐参考（减脂版）**\n' +
      '- 早餐：2 个鸡蛋 + 燕麦粥 + 1 把蓝莓\n' +
      '- 午餐：150g 鸡胸 + 1 碗糙米饭 + 大量蔬菜\n' +
      '- 晚餐：150g 鱼 + 半个红薯 + 蔬菜汤\n' +
      '- 加餐：希腊酸奶 / 1 把坚果 / 蛋白棒\n\n' +
      '**3. 关键原则**\n' +
      '- 训练后 1 小时内补充蛋白质 + 碳水\n' +
      '- 减脂期蛋白质不能少，否则掉肌肉\n' +
      '- 不要完全戒碳水，会影响训练状态和激素\n' +
      '- 喝水 2-2.5L/天，脱水会降低运动表现\n\n' +
      '饮食计划页有详细的一周食谱可以参考，需要我根据你的目标定制吗？',
  },
  {
    keys: ['跑步', '慢跑', '跑', '配速', '马拉松'],
    reply:
      '跑步是最方便的有氧运动，但姿势不对容易伤膝盖：\n\n' +
      '**1. 正确跑姿**\n' +
      '- 身体微前倾，从脚踝前倾不是弯腰\n' +
      '- 落地用中前脚掌，不要脚跟着地重重砸地\n' +
      '- 步频 170-180 步/分钟，小步幅高频更省力\n' +
      '- 手臂自然摆动，不要左右晃\n\n' +
      '**2. 新手训练计划**\n' +
      '- 第 1-2 周：跑走结合，跑 2 分钟走 1 分钟 ×7 组\n' +
      '- 第 3-4 周：连续慢跑 20-30 分钟\n' +
      '- 第 5-6 周：增加到 40 分钟，配速慢慢提\n' +
      '- 每周 3-4 次，给身体恢复时间\n\n' +
      '**3. 避免伤病**\n' +
      '- 跑前动态热身 5 分钟，跑后拉伸\n' +
      '- 选一双缓震好的跑鞋\n' +
      '- 膝盖不适立即停，不要硬撑\n' +
      '- 每周跑量增加不超过 10%\n\n' +
      '想提升燃脂效率可以尝试间歇跑：快跑 1 分钟 + 慢跑 2 分钟 ×8 组。视频页有跑步教学可以参考。',
  },
  {
    keys: ['瑜伽', '普拉提', '拉伸', '冥想', '舒缓'],
    reply:
      '瑜伽和普拉提对柔韧性、核心稳定和减压都有帮助：\n\n' +
      '**1. 瑜伽 vs 普拉提**\n' +
      '- 瑜伽：强调体式 + 呼吸 + 冥想，提升柔韧性和身心平衡\n' +
      '- 普拉提：强调核心控制和脊柱稳定，更适合康复和塑形\n' +
      '- 新手建议从哈他瑜伽或基础普拉提入门\n\n' +
      '**2. 推荐体式（新手友好）**\n' +
      '- 下犬式：拉伸腿后侧和背部\n' +
      '- 战士一式：开髋 + 强化腿部\n' +
      '- 树式：平衡 + 核心\n' +
      '- 猫牛式：脊柱灵活\n' +
      '- 婴儿式：放松恢复\n\n' +
      '**3. 练习建议**\n' +
      '- 每周 2-3 次，每次 30-60 分钟\n' +
      '- 空腹或饭后 2 小时练习\n' +
      '- 配合呼吸，不要憋气\n' +
      '- 不要追求高难度体式，循序渐进\n\n' +
      '视频教学页有帕梅拉的瑜伽跟练，非常适合新手入门。',
  },
  {
    keys: ['新手', '入门', '小白', '开始', '零基础', '第一次'],
    reply:
      '欢迎开始健身之旅！新手最容易犯的错是一上来就猛练，结果受伤放弃。给你一套安全有效的入门路径：\n\n' +
      '**1. 第 1-2 周：建立习惯**\n' +
      '- 每周 3 次，每次 30-40 分钟\n' +
      '- 内容：5 分钟热身 + 20 分钟力量 + 10 分钟有氧 + 拉伸\n' +
      '- 动作：深蹲、弓步、俯卧撑、划船、平板支撑\n' +
      '- 先用自重，把动作模式练对\n\n' +
      '**2. 第 3-4 周：逐步加量**\n' +
      '- 加入哑铃或弹力带\n' +
      '- 每次训练增加 1-2 个动作\n' +
      '- 开始记录训练日志（重量、组数、次数）\n\n' +
      '**3. 第 5-8 周：进阶**\n' +
      '- 每周 4 次训练\n' +
      '- 学习复合动作：杠铃深蹲、硬拉、卧推\n' +
      '- 开始关注饮食结构\n\n' +
      '**4. 新手最重要的 3 件事**\n' +
      '- 动作质量 > 重量，宁可轻一点做标准\n' +
      '- 坚持 > 完美，能持续来练就是胜利\n' +
      '- 恢复 > 猛练，肌肉是在休息时长的\n\n' +
      '建议先去视频页找帕梅拉的全身初级训练跟练，动作简单适合入门。有问题随时问我！',
  },
  {
    keys: ['膝盖', '腰', '肩', '受伤', '疼痛', '伤', '不适'],
    reply:
      '健身中身体出现疼痛要重视，以下是常见问题的应对建议：\n\n' +
      '⚠️ **重要提示**：剧烈疼痛、肿胀、活动受限请立即就医，AI 建议不能替代医疗诊断。\n\n' +
      '**1. 膝盖疼痛**\n' +
      '- 常见原因：深蹲膝盖内扣、跑量增加过快、股四头肌太弱\n' +
      '- 调整：强化臀中肌（蚌式、侧抬腿）、拉伸髂胫束\n' +
      '- 训练时：减少深蹲深度，避免跳跃动作\n\n' +
      '**2. 腰部疼痛**\n' +
      '- 常见原因：硬拉弯腰、核心太弱、久坐\n' +
      '- 调整：加强核心（死虫式、鸟狗式）、硬拉时保持背部中立\n' +
      '- 训练时：避免大重量弯腰动作，用腿举替代\n\n' +
      '**3. 肩部疼痛**\n' +
      '- 常见原因：卧推姿势不对、肩胛骨不稳定\n' +
      '- 调整：强化肩袖（外旋）、拉伸胸小肌\n' +
      '- 训练时：卧推肩胛骨后缩下沉，避免过头推举\n\n' +
      '**通用原则**：疼痛时立即停止该动作，冰敷 15 分钟，休息 2-3 天。恢复后从轻重量重新开始。如果 1 周不缓解，建议看运动医学科。',
  },
  {
    keys: ['睡眠', '休息', '恢复', '熬夜', '疲劳'],
    reply:
      '睡眠是被严重低估的健身变量，睡不好训练效果直接打折：\n\n' +
      '**1. 睡眠对健身的影响**\n' +
      '- 生长激素 70% 在深度睡眠时分泌，负责肌肉修复和生长\n' +
      '- 睡眠不足会拉高皮质醇，加速肌肉分解、阻碍脂肪燃烧\n' +
      '- 睡眠差会降低训练表现，力量和耐力都下降\n\n' +
      '**2. 优化睡眠的建议**\n' +
      '- 保证 7-9 小时，训练量大时偏 9 小时\n' +
      '- 固定作息，周末也不要差太多\n' +
      '- 睡前 1 小时远离手机蓝光\n' +
      '- 训练安排在睡前 3 小时以上完成\n' +
      '- 卧室温度 18-20°C 最佳\n\n' +
      '**3. 训练与休息的节奏**\n' +
      '- 同一肌群训练间隔至少 48 小时\n' +
      '- 每 6-8 周安排 1 周 deload（减量周）\n' +
      '- 感觉持续疲劳、晨脉升高 5+ 次，说明过度训练，需要休息\n\n' +
      '记住：训练是破坏，休息才是建设。会休息的人才会进步。',
  },
  {
    keys: ['补剂', '蛋白粉', '增肌粉', '肌酸', '氮泵', '维生素'],
    reply:
      '补剂只是锦上添花，饮食和训练才是基础。给你梳理哪些有用、哪些是智商税：\n\n' +
      '**✅ 有循证支持的补剂**\n' +
      '**1. 乳清蛋白粉**\n' +
      '- 适合饮食蛋白质不够时补充，每次 20-30g\n' +
      '- 训练后或早餐补充最佳\n' +
      '- 不是「喝了就长肌肉」，只是方便的蛋白质来源\n\n' +
      '**2. 肌酸（一水肌酸）**\n' +
      '- 最被证实的增力补剂，提升爆发力和训练容量\n' +
      '- 每天 3-5g，不需要加载期，长期服用\n' +
      '- 配合碳水吸收更好\n\n' +
      '**3. 鱼油 / 维生素 D**\n' +
      '- 现代人普遍缺乏，对关节和激素有帮助\n\n' +
      '**❌ 基本是智商税**\n' +
      '- 增肌粉：就是碳水+蛋白，不如直接吃食物\n' +
      '- 氮泵：咖啡因+少量成分，效果有限还贵\n' +
      '- BCAA：蛋白质吃够就不需要\n' +
      '- 睾酮促泌剂：基本无效\n\n' +
      '记住：补剂永远排在「饮食、训练、睡眠」之后。先把这三样做好，再考虑补剂。',
  },
  {
    keys: ['HIIT', '高强度', '间歇', '燃脂'],
    reply:
      'HIIT 是高效燃脂方式，但不是所有人都适合：\n\n' +
      '**1. 什么是 HIIT**\n' +
      '- 高强度间歇训练：短时间高强度 + 短暂休息交替\n' +
      '- 典型：全力 20-30 秒 + 休息 10-30 秒 ×8-10 组\n' +
      '- 总时长 15-25 分钟即可，不宜过长\n\n' +
      '**2. HIIT 的优势**\n' +
      '- 燃脂效率高，运动后持续燃脂(EPOC)可达 24 小时\n' +
      '- 省时间，适合忙碌人群\n' +
      '- 保持肌肉量的同时减脂\n\n' +
      '**3. 适合人群 & 注意事项**\n' +
      '- 适合：有一定训练基础、时间紧张、想突破平台期\n' +
      '- 不适合：纯新手、心血管疾病、关节有伤、孕妇\n' +
      '- 每周 1-2 次即可，不要天天做（恢复成本高）\n\n' +
      '**4. 入门 HIIT 动作**\n' +
      '- 开合跳 30 秒 / 休息 15 秒\n' +
      '- 高抬腿 30 秒 / 休息 15 秒\n' +
      '- 波比跳 30 秒 / 休息 15 秒\n' +
      '- 登山者 30 秒 / 休息 15 秒\n' +
      '- 循环 4-5 组\n\n' +
      '视频页有帕梅拉的 HIIT 跟练，直接照着做就行。',
  },
  {
    keys: ['你好', '在吗', 'hi', 'hello', '嗨', '哈喽'],
    reply:
      '你好！我是你的 AI 健身教练，可以帮你：\n\n' +
      '- 制定减脂 / 增肌 / 塑形的训练计划\n' +
      '- 拆解深蹲、硬拉、卧推等技术动作\n' +
      '- 解答饮食营养和补剂问题\n' +
      '- 分析动作照片或视频，纠正姿势\n' +
      '- 处理训练中的伤病和恢复问题\n' +
      '- 语音对话，像真人教练一样交流\n\n' +
      '直接告诉我你的目标（比如「我想减肚子」「新手怎么开始」），我来帮你安排。',
  },
];

function matchKB(userText: string): string {
  const text = userText.toLowerCase();
  for (const item of KB) {
    if (item.keys.some(k => text.includes(k.toLowerCase()))) {
      return item.reply;
    }
  }
  // 默认回复
  return (
    '我理解你的问题。作为 AI 健身教练，我擅长这些领域：\n\n' +
    '- **训练计划**：减脂、增肌、塑形、力量提升\n' +
    '- **动作指导**：深蹲、硬拉、卧推、引体等技术拆解\n' +
    '- **饮食营养**：三餐搭配、营养素比例、补剂建议\n' +
    '- **伤病恢复**：膝盖、腰背、肩部疼痛的应对\n' +
    '- **新手入门**：零基础如何安全开始健身\n\n' +
    '可以试着问我：\n' +
    '「我想减脂，怎么安排训练？」\n' +
    '「深蹲标准动作是什么？」\n' +
    '「新手第一周应该怎么练？」\n' +
    '「增肌期吃什么？」\n\n' +
    '我会给你详细、可执行的建议。'
  );
}

// 模拟流式输出（按词逐段发送，体验接近真实 AI）
function mockChatStream(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<{ text: string; fallback: boolean }> {
  return new Promise((resolve, reject) => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    const reply = matchKB(lastUser?.content || '');

    // 按片段切分（保持换行和标点节奏）
    const chunks: string[] = [];
    const parts = reply.split(/(\n)/); // 保留换行
    for (const part of parts) {
      if (part === '\n') {
        chunks.push('\n');
      } else if (part) {
        // 每 4-8 个字一段，模拟自然打字
        const segLen = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < part.length; i += segLen) {
          chunks.push(part.slice(i, i + segLen));
        }
      }
    }

    let idx = 0;
    let fullText = '';
    let aborted = false;

    const timer = setInterval(() => {
      if (aborted) return;
      if (idx >= chunks.length) {
        clearInterval(timer);
        resolve({ text: fullText, fallback: true });
        return;
      }
      const chunk = chunks[idx++];
      fullText += chunk;
      onChunk(chunk);
    }, 45 + Math.random() * 35); // 45-80ms 一段，接近真人速度

    // 开头加一点「思考」延迟
    const startDelay = setTimeout(() => {
      // 触发第一个 chunk
    }, 300);

    if (signal) {
      signal.addEventListener('abort', () => {
        aborted = true;
        clearInterval(timer);
        clearTimeout(startDelay);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });
}

// ==================== 流式文字对话 ====================
export async function chatStream(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<{ text: string; fallback?: boolean }> {
  // 如果已知后端不可用，直接走 mock
  if (backendAvailable === false) {
    return mockChatStream(messages, onChunk, signal);
  }

  try {
    const resp = await fetch(url('/ai/chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ messages, stream: true }),
      signal,
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    // 关键：检测 content-type，必须是 SSE 流式响应。
    // 纯静态部署或后端异常时，/api 可能返回 HTML/JSON 错误页（200），此时 reader 读到非 SSE
    // 内容不报错，会返回空 text 并错误地标记 backendAvailable=true，导致 AI 永不回复。
    const contentType = resp.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream')) {
      throw new Error(`后端返回非流式响应（content-type: ${contentType}），降级到本地 mock`);
    }

    if (!resp.body) {
      throw new Error('响应没有 body');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let fallback = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.slice(6));
          if (json.chunk) {
            fullText += json.chunk;
            onChunk(json.chunk);
          }
          if (json.fallback) fallback = true;
          if (json.done) {
            backendAvailable = true;
            return { text: fullText, fallback };
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    backendAvailable = true;
    return { text: fullText, fallback };
  } catch (e) {
    // fetch 失败或被 abort
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw e;
    }
    // 后端不可用，降级到 mock
    console.warn('[AI] 对话后端不可用，降级到本地 mock', e);
    backendAvailable = false;
    cachedStatus = null;
    await getAIStatus(true);
    return mockChatStream(messages, onChunk, signal);
  }
}

// ==================== 图片分析 ====================
export async function analyzeImage(
  images: File[],
  question: string
): Promise<{ result: string; mode: string }> {
  // 后端不可用时返回 mock 分析
  if (backendAvailable === false) {
    return mockImageAnalysis(images, question);
  }

  try {
    const formData = new FormData();
    images.forEach(f => formData.append('images', f));
    if (question) formData.append('question', question);

    const resp = await fetch(url('/ai/analyze/image'), {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    backendAvailable = true;
    return data;
  } catch (e) {
    console.warn('[AI] 图片分析后端不可用，降级到本地 mock', e);
    backendAvailable = false;
    cachedStatus = null;
    await getAIStatus(true);
    return mockImageAnalysis(images, question);
  }
}

function mockImageAnalysis(images: File[], question: string): { result: string; mode: string } {
  const q = question || '请分析这个动作';
  const count = images.length;
  return {
    mode: 'mock',
    result:
      `已收到你上传的 ${count} 张照片，我为你做了动作分析（当前为演示模式）：\n\n` +
      `**📋 分析报告**\n\n` +
      `**1. 动作识别**\n` +
      `- 根据图片判断，这组动作属于力量训练范畴\n` +
      `- 主要发力肌群：腿部、臀部、核心\n\n` +
      `**2. 动作优点**\n` +
      `- 整体姿态较为标准，脊柱保持中立位\n` +
      `- 核心有适度收紧，保护腰椎\n` +
      `- 关节角度在合理范围内\n\n` +
      `**3. 改进建议**\n` +
      `- 膝盖可以再向外打开一点，避免内扣\n` +
      `- 重心略偏前，建议脚掌踩实，重心居中\n` +
      `- 下蹲深度可以再加深，到大腿平行地面\n\n` +
      `**4. 训练建议**\n` +
      `- 当前重量适合，保持 3 组 ×10-12 次\n` +
      `- 每周 2 次，逐步加重 5%\n` +
      `- 配合拉伸，预防肌肉紧绷\n\n` +
      `💡 如果想获得真实的 AI 视觉分析，需要部署带视觉模型的后端服务。当前为本地演示模式，结果为通用建议。`,
  };
}

// ==================== 视频分析 ====================
export async function analyzeVideo(
  frames: File[],
  duration: number,
  question: string,
  videoName: string
): Promise<{ result: string; mode: string }> {
  if (backendAvailable === false) {
    return mockVideoAnalysis(frames, duration, question, videoName);
  }

  try {
    const formData = new FormData();
    frames.forEach(f => formData.append('frames', f));
    formData.append('duration', String(duration));
    if (question) formData.append('question', question);
    if (videoName) formData.append('videoName', videoName);

    const resp = await fetch(url('/ai/analyze/video'), {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    backendAvailable = true;
    return data;
  } catch (e) {
    console.warn('[AI] 视频分析后端不可用，降级到本地 mock', e);
    backendAvailable = false;
    cachedStatus = null;
    await getAIStatus(true);
    return mockVideoAnalysis(frames, duration, question, videoName);
  }
}

function mockVideoAnalysis(
  frames: File[],
  duration: number,
  question: string,
  videoName: string
): { result: string; mode: string } {
  const mins = duration > 60 ? `${(duration / 60).toFixed(1)} 分钟` : `${duration.toFixed(0)} 秒`;
  return {
    mode: 'mock',
    result:
      `已分析你的视频「${videoName || '训练录像'}」（时长 ${mins}，抽取 ${frames.length} 帧关键画面）：\n\n` +
      `**🎬 视频分析报告**\n\n` +
      `**1. 动作识别**\n` +
      `- 视频中包含完整的训练动作循环\n` +
      `- 动作类型：复合力量训练\n` +
      `- 完成次数：约 ${Math.floor(duration / 3)} 次\n\n` +
      `**2. 动作质量评估**\n` +
      `- ✅ 准备阶段：站姿稳定，核心收紧\n` +
      `- ✅ 离心阶段：下放速度可控\n` +
      `- ⚠️ 向心阶段：起身时略有代偿，臀部先于膝盖发力\n` +
      `- ✅ 顶点位置：站姿恢复完整\n\n` +
      `**3. 节奏分析**\n` +
      `- 离心时间约 2 秒，向心约 1 秒，节奏合理\n` +
      `- 组间休息充足\n\n` +
      `**4. 改进建议**\n` +
      `- 起身时注意膝盖和臀部同时启动，避免腰部代偿\n` +
      `- 可以加入 1 秒顶峰收缩，增强肌肉刺激\n` +
      `- 建议录侧面角度，便于检查脊柱中立位\n\n` +
      `💡 当前为本地演示模式，分析结果为通用模板。如需真实 AI 帧分析，需要部署带视觉模型的后端。`,
  };
}

// ==================== 语音识别 ASR ====================
export async function voiceASR(audio: Blob): Promise<{ text: string; mode: string }> {
  if (backendAvailable === false) {
    return mockASR();
  }

  try {
    const formData = new FormData();
    formData.append('audio', audio, 'audio/webm');

    const resp = await fetch(url('/ai/voice/asr'), {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    backendAvailable = true;
    return data;
  } catch (e) {
    console.warn('[AI] 语音识别后端不可用，降级到本地 mock', e);
    backendAvailable = false;
    cachedStatus = null;
    await getAIStatus(true);
    return mockASR();
  }
}

// ==================== 浏览器原生语音识别（Web Speech API）====================
// 使用 SpeechRecognition 做真实语音识别，识别用户实际说的话
// 浏览器不支持时返回 null，调用方需回退到 voiceASR
export interface SpeechRecognizer {
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function createSpeechRecognizer(opts: {
  onResult: (text: string, isFinal: boolean) => void;
  onError: (err: string) => void;
  onEnd: () => void;
  onStart?: () => void;
}): SpeechRecognizer | null {
  if (!isSpeechRecognitionSupported()) return null;

  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SR();
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    let finalText = '';
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += result[0].transcript;
      } else {
        interimText += result[0].transcript;
      }
    }
    if (finalText) {
      opts.onResult(finalText, true);
    } else if (interimText) {
      opts.onResult(interimText, false);
    }
  };

  recognition.onerror = (event: any) => {
    const errMap: Record<string, string> = {
      'no-speech': '没有检测到语音，请重试',
      'audio-capture': '麦克风无法访问',
      'not-allowed': '麦克风权限被拒绝',
      'network': '网络错误',
      'aborted': '已取消',
    };
    opts.onError(errMap[event.error] || ('识别错误：' + event.error));
  };

  recognition.onend = () => {
    opts.onEnd();
  };

  if (opts.onStart) {
    recognition.onstart = opts.onStart;
  }

  return {
    start: () => { try { recognition.start(); } catch (e) { /* 重复启动忽略 */ } },
    stop: () => { try { recognition.stop(); } catch (e) { /* 已停止忽略 */ } },
    abort: () => { try { recognition.abort(); } catch (e) { /* 已停止忽略 */ } },
  };
}

function mockASR(): { text: string; mode: string } {
  const samples = [
    '我想减脂，怎么安排训练？',
    '深蹲的标准动作是什么？',
    '新手应该怎么开始健身？',
    '增肌期饮食怎么搭配？',
    '腹肌怎么练才能出线条？',
    '帮我制定一周训练计划',
  ];
  return {
    mode: 'mock',
    text: samples[Math.floor(Math.random() * samples.length)],
  };
}

// ==================== 语音合成 TTS ====================
// 使用浏览器 SpeechSynthesis API 真实合成中文语音
export async function voiceTTS(text: string): Promise<Blob> {
  // 后端不可用或浏览器支持 SpeechSynthesis 时，使用本地合成
  if (backendAvailable === false || typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return localTTS(text);
  }

  try {
    const resp = await fetch(url('/ai/voice/tts'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ text }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    backendAvailable = true;
    return blob;
  } catch (e) {
    console.warn('[AI] 语音合成后端不可用，降级到本地 SpeechSynthesis', e);
    backendAvailable = false;
    cachedStatus = null;
    await getAIStatus(true);
    return localTTS(text);
  }
}

// 浏览器本地语音合成：直接调用 SpeechSynthesis 播放，返回空 Blob 占位
// 优化目标：自然人声（降速、停顿、清洗 Markdown 符号、分句播放）
function localTTS(text: string): Promise<Blob> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve(new Blob([], { type: 'audio/mp3' }));
      return;
    }

    try {
      // 取消之前的朗读
      window.speechSynthesis.cancel();

      // 清洗 Markdown 符号，让 TTS 不读出星号井号
      const cleanText = cleanTextForTTS(text);
      if (!cleanText.trim()) {
        resolve(new Blob([], { type: 'audio/mp3' }));
        return;
      }

      // 按句号/问号/感叹号/换行分句，逐句播放并在句间加停顿
      const sentences = splitSentences(cleanText);
      if (sentences.length === 0) {
        resolve(new Blob([], { type: 'audio/mp3' }));
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      // 优先选最自然的中文语音（iOS 的 Tingting/Sin-ji、安卓的 cmn-Hans-CN、Siri 增强女声等）
      const zhVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('zh'));
      // 偏好女声、更自然的语音
      const preferredNames = ['Tingting', 'Sin-ji', 'Mei-Jia', 'Microsoft Yaoyao', 'Google 普通话', 'Yating', 'Hanhan'];
      let zhVoice = zhVoices.find(v => preferredNames.some(n => v.name.includes(n)));
      if (!zhVoice && zhVoices.length > 0) zhVoice = zhVoices[0];

      let idx = 0;
      let finished = false;
      let safetyTimeout: ReturnType<typeof setTimeout> | null = null;

      const finishOnce = () => {
        if (finished) return;
        finished = true;
        if (safetyTimeout) clearTimeout(safetyTimeout);
        resolve(new Blob([], { type: 'audio/mp3' }));
      };

      const speakNext = () => {
        if (idx >= sentences.length) {
          finishOnce();
          return;
        }
        const sent = sentences[idx++];
        if (!sent.trim()) {
          // 跳过空句
          speakNext();
          return;
        }
        const utter = new SpeechSynthesisUtterance(sent);
        utter.lang = 'zh-CN';
        // 略低于 1.0 的语速听起来更自然
        utter.rate = 0.92;
        // 略低一点的音调更接近真人
        utter.pitch = 1.0;
        utter.volume = 1.0;
        if (zhVoice) utter.voice = zhVoice;

        utter.onend = () => {
          // 句间停顿 250ms，让听感更自然
          setTimeout(speakNext, 250);
        };
        utter.onerror = (e: any) => {
          // 某些安卓浏览器主动打断会触发 error，忽略以免中断整段
          if (e?.error === 'canceled' || e?.error === 'interrupted') {
            return;
          }
          console.warn('[TTS] 单句播放失败，跳过:', e?.error);
          speakNext();
        };

        try {
          window.speechSynthesis.speak(utter);
        } catch (e) {
          console.warn('[TTS] speak 失败:', e);
          speakNext();
        }
      };

      // 兜底：若超时未完成（某些浏览器不触发 onend），强制结束
      safetyTimeout = setTimeout(finishOnce, Math.max(8000, sentences.length * 1200));

      // 启动播放
      speakNext();
    } catch (e) {
      console.error('[TTS] 异常:', e);
      resolve(new Blob([], { type: 'audio/mp3' }));
    }
  });
}

// 清洗 TTS 文本：去掉 Markdown 符号、URL、Emoji 等
function cleanTextForTTS(text: string): string {
  return text
    // 去掉 Markdown 标题符号
    .replace(/^#{1,6}\s*/gm, '')
    // 去掉加粗/斜体
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // 去掉行内代码
    .replace(/`([^`]+)`/g, '$1')
    // 去掉链接，保留文字
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // 去掉列表符号
    .replace(/^[•\-\*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // 去掉多余空白行
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 中文友好的分句：按 。！？；\n 切分，保留标点
function splitSentences(text: string): string[] {
  const result: string[] = [];
  const regex = /[^。！？；\n]+[。！？；]?/g;
  const matches = text.match(regex);
  if (matches) {
    result.push(...matches);
  }
  // 兜底：按 \n 切分剩余
  if (result.length === 0) {
    result.push(...text.split(/\n+/).filter(s => s.trim()));
  }
  return result.map(s => s.trim()).filter(s => s.length > 0);
}

// ==================== 工具：视频抽帧 ====================
export async function extractVideoFrames(
  videoFile: File,
  frameCount = 6
): Promise<{ frames: File[]; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    const url = URL.createObjectURL(videoFile);

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 不可用'));
        return;
      }

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;

      const frames: File[] = [];

      for (let i = 0; i < frameCount; i++) {
        const t = (duration / (frameCount + 1)) * (i + 1);
        await new Promise<void>(res => {
          video.currentTime = Math.min(t, duration - 0.1);
          video.onseeked = () => res();
          setTimeout(() => res(), 2000);
        });

        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>(r =>
            canvas.toBlob(b => r(b), 'image/jpeg', 0.8)
          );
          if (blob) {
            frames.push(new File([blob], `frame-${i}.jpg`, { type: 'image/jpeg' }));
          }
        } catch (e) {
          // 单帧失败忽略
        }
      }

      URL.revokeObjectURL(url);
      resolve({ frames, duration });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('视频加载失败，请检查视频格式'));
    };

    video.src = url;
  });
}
