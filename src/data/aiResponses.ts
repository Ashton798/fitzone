export const aiResponses: Record<string, string[]> = {
  greeting: [
    '你好！我是你的AI健身教练💪 很高兴为你服务！我可以帮你制定健身计划、解答健身问题、推荐训练动作和饮食建议。请问你今天想训练什么部位，或者有什么健身问题想问我吗？',
    '嗨！欢迎来到FitZone！我是你的专属AI教练🏋️ 无论是增肌、减脂、塑形、康复，有什么我可以帮你的？',
  ],
  plan: [
    '好的，我来为你制定一个健身计划！请先告诉我几个信息：\n\n1. 你的健身目标是什么？（增肌/减脂/塑形/提高体能）\n2. 你目前的健身基础如何？（新手/有一定基础/进阶）\n3. 每周能训练几天？每次多长时间？\n4. 主要想在哪里训练？（健身房/家里）\n\n告诉我这些，我给你定制专属计划！',
  ],
  lose_weight: [
    '好的，减脂计划来啦！🔥\n\n**减脂核心原则：热量缺口 + 力量训练保肌肉 + 有氧加速燃脂\n\n**推荐训练安排（每周5天）：\n\n**周一：上肢力量训练**\n- 热身 胸部：卧推/俯卧撑 4组x12次\n- 背部：引体向上/高位下拉 4组x10次\n- 肩部：哑铃推举 3组x12次\n- 二头：哑铃弯举 3组x12次\n- 三头：绳索下压 3组x12次\n\n**周二：HIIT燃脂训练**\n- 30分钟HIIT（高强度间歇训练）\n- 动作：波比跳、高抬腿、开合跳、登山跑\n- 每个动作20秒，休息10秒，循环8-10轮\n\n**周三：下肢+核心**\n- 深蹲 4组x15次\n- 弓步蹲 3组x12次/腿\n- 臀桥 4组x15次\n- 平板支撑 3组x60秒\n\n**周四：休息或轻有氧**\n- 慢跑/跳绳 30-45分钟\n\n**周五：全身力量**\n- 复合动作为主\n\n**饮食建议：**\n- 每日热量摄入：基础代谢-300~500大卡\n- 蛋白质：每公斤体重1.6-2g\n- 碳水：训练前后补充优质碳水\n- 脂肪：占总热量20-25%\n- 多喝水！每天2-3升\n\n坚持就是胜利，有问题随时问我！💪',
  ],
  build_muscle: [
    '好的！增肌计划安排上！💪\n\n**增肌核心原则：热量盈余 + 渐进超负荷 + 充足恢复**\n\n**推荐训练分化（推拉腿分化，每周6天）：\n\n**周一：推日（胸肩三头）**\n- 平板卧推 4组x8-10次\n- 上斜哑铃飞鸟 3组x12次\n- 哑铃肩推 4组x10次\n- 侧平举 3组x15次\n- 绳索下压 3组x12次\n-  overhead tricep extension 3组x12次\n\n**周二：拉日（背二头）**\n- 引体向上/高位下拉 4组x8-10次\n- 杠铃划船 4组x10次\n- 坐姿划船 3组x12次\n- 哑铃弯举 3组x12次\n- 锤式弯举 3组x12次\n\n**周三：腿日**\n- 深蹲 4组x8-10次\n- 硬拉 4组x6-8次\n- 腿举 3组x12次\n- 腿弯举 3组x12次\n- 站姿提踵 4组x15次\n\n**周四-周六：重复推/拉/腿**\n\n**周日：休息**\n\n**饮食建议：**\n- 热量盈余：基础代谢+300~500大卡\n- 蛋白质：每公斤体重1.6-2.2g\n- 碳水：训练前后充足补充\n- 脂肪：占总热量25-30%\n- 少食多餐，每天4-6餐\n\n记住渐进超负荷！每周试着增加一点重量或次数，加油！🏋️',
  ],
  diet: [
    '健身饮食很重要！三分练七分吃🥗\n\n**基本原则：**\n\n**蛋白质来源（每公斤体重1.6-2.2g）：**\n- 鸡胸肉、鱼肉、牛肉、鸡蛋、牛奶、豆腐、蛋白粉\n\n**优质碳水：**\n- 糙米、燕麦、红薯、玉米、全麦面包、水果\n\n**健康脂肪：**\n- 牛油果、坚果、橄榄油、鱼油\n\n**一日三餐示例（减脂版）：**\n- 早餐：燕麦+鸡蛋+牛奶+水果\n- 午餐：糙米饭+鸡胸肉+蔬菜\n- 晚餐：红薯+鱼肉+蔬菜沙拉\n\n**增肌版：**\n- 早餐：全麦面包+鸡蛋+牛奶+香蕉\n- 午餐：米饭+牛肉+蔬菜\n- 训练后：蛋白粉+香蕉\n- 晚餐：糙米+鸡胸+蔬菜\n- 睡前：牛奶/酪蛋白\n\n**小贴士：\n- 多喝水！每天2-3升\n- 少食多餐，避免暴饮暴食\n- 训练前后补充碳水和蛋白\n- 尽量自己做饭，少油少盐少糖\n\n有具体饮食问题可以继续问我！',
  ],
  squat: [
    '深蹲是动作之王！来看看正确姿势：🏋️\n\n**正确深蹲姿势：**\n\n1. **起始姿势**\n- 双脚与肩同宽或略宽，脚尖向外约30度\n- 杠铃放在斜方肌上（高杠位）\n- 双手握距略宽于肩，收紧核心\n\n2. **下蹲过程**\n- 髋部先向后坐，像坐椅子一样\n- 膝盖跟随脚尖方向，不要内扣\n- 下蹲至大腿与地面平行或略低\n- 保持背部挺直，不要弯腰\n\n3. **站起过程**\n- 脚跟发力，蹬地站起\n- 保持核心收紧\n- 顶部不要锁死膝盖\n\n**常见错误：**\n❌ 膝盖内扣 → 想象膝盖向外推\n❌ 弯腰弓背 → 核心收紧，胸挺起\n❌ 蹲得不够深 → 至少大腿平行地面\n❌ 脚跟抬起 → 重心在脚掌中后\n\n**新手建议：**\n- 先用空杆或徒手练习\n- 对着镜子练，纠正动作\n- 可以先从高脚杯深蹲找感觉\n\n动作标准比重量重要！先练好动作再加重量💪',
  ],
  push_up: [
    '俯卧撑是最好的徒手训练动作！💪\n\n**正确姿势：**\n\n1. **起始姿势**\n- 双手略宽于肩，手指朝前\n- 身体呈一条直线，从头顶到脚跟\n- 核心收紧，屁股不要塌也不要翘\n\n2. **下放过程**\n- 控制速度，2-3秒下放\n- 肘部约45度角，不是完全外展\n- 胸部接近地面1-2cm\n\n3. **推起过程**\n- 胸部发力，快速推起\n- 手臂伸直但不要锁死\n\n**常见错误：**\n❌ 塌腰 → 收紧核心，想象有人要打你肚子\n❌ 屁股翘太高 → 身体保持一条线\n❌ 肘部外展90度 → 约45度，保护肩膀\n❌ 只做半程 → 完整动作效果更好\n\n**进阶路线：**\n🏃‍♂️ 新手：跪姿俯卧撑\n💪 标准：标准俯卧撑\n🔥 进阶：宽距/窄距/击掌/倒立\n\n每天坚持，从10个开始，慢慢增加！',
  ],
  rest: [
    '休息和恢复非常重要！肌肉是在休息时生长的😴\n\n**关于休息：**\n\n**训练间隔：**\n- 同一肌群训练间隔48小时\n- 大肌群（胸背腿）恢复较慢\n- 小肌群（肩臂）恢复较快\n\n**睡眠：**\n- 每天7-9小时睡眠\n- 晚上11点前入睡最佳\n- 睡眠时生长激素分泌最旺盛\n\n**休息日安排：**\n- 完全休息：什么都不做\n- 主动恢复：散步、瑜伽、拉伸\n- 轻度有氧：慢跑20-30分钟\n\n**过度训练信号：**\n⚠️ 持续疲劳\n⚠️ 睡眠质量下降\n⚠️ 食欲减退\n⚠️ 训练状态下滑\n⚠️ 容易生病\n\n如果出现以上情况，多休息一两天！\n\n记住：休息也是训练的一部分，不要急功近利💪',
  ],
  default: [
    '这是个好问题！让我想想...\n\n健身是一个循序渐进的过程，最重要的是坚持和科学的方法。你可以告诉我更具体的问题，比如：\n\n• 想知道某个动作怎么做？\n• 需要制定训练计划？\n• 饮食方面的疑问？\n• 减脂还是增肌？\n\n我会尽力帮你解答！💪',
    '嗯嗯，我理解你的问题。健身这件事因人而异，关键是找到适合自己的方法并坚持下去。\n\n你可以跟我说说你的具体情况，比如：\n- 你的健身目标是什么？\n- 目前的基础怎么样？\n- 有什么具体的困扰？\n\n这样我能给你更有针对性的建议！',
  ],
};

export const quickActions = [
  { id: 'plan', label: '生成健身计划', icon: 'Calendar' },
  { id: 'lose_weight', label: '减脂方案', icon: 'Flame' },
  { id: 'build_muscle', label: '增肌方案', icon: 'Dumbbell' },
  { id: 'diet', label: '饮食建议', icon: 'Salad' },
  { id: 'squat', label: '深蹲教学', icon: 'ArrowDown' },
  { id: 'push_up', label: '俯卧撑教学', icon: 'ChevronDown' },
  { id: 'rest', label: '恢复建议', icon: 'Moon' },
];

export const getAIResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('你好') || lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('嗨')) {
    return aiResponses.greeting[Math.floor(Math.random() * aiResponses.greeting.length)];
  }
  
  if (lowerMessage.includes('计划') || lowerMessage.includes('方案')) {
    if (lowerMessage.includes('减脂') || lowerMessage.includes('减肥') || lowerMessage.includes('瘦')) {
      return aiResponses.lose_weight[0];
    }
    if (lowerMessage.includes('增肌') || lowerMessage.includes('长肌肉') || lowerMessage.includes('练肌肉')) {
      return aiResponses.build_muscle[0];
    }
    return aiResponses.plan[0];
  }
  
  if (lowerMessage.includes('减脂') || lowerMessage.includes('减肥') || lowerMessage.includes('瘦') || lowerMessage.includes('燃脂')) {
    return aiResponses.lose_weight[0];
  }
  
  if (lowerMessage.includes('增肌') || lowerMessage.includes('肌肉') || lowerMessage.includes('长肉')) {
    return aiResponses.build_muscle[0];
  }
  
  if (lowerMessage.includes('吃') || lowerMessage.includes('饮食') || lowerMessage.includes('营养') || lowerMessage.includes('食物')) {
    return aiResponses.diet[0];
  }
  
  if (lowerMessage.includes('深蹲')) {
    return aiResponses.squat[0];
  }
  
  if (lowerMessage.includes('俯卧撑') || lowerMessage.includes('push up') || lowerMessage.includes('伏地挺身')) {
    return aiResponses.push_up[0];
  }
  
  if (lowerMessage.includes('休息') || lowerMessage.includes('恢复') || lowerMessage.includes('睡眠')) {
    return aiResponses.rest[0];
  }
  
  return aiResponses.default[Math.floor(Math.random() * aiResponses.default.length)];
};
