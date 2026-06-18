const SUBJECT_MODULES = {
  数学: {
    primary: ['数的运算', '分数与小数', '应用题', '图形与面积', '方程入门', '统计与概率'],
    middle: ['有理数与整式', '方程与不等式', '函数基础', '几何图形', '三角形与四边形', '数据统计'],
    high: ['集合与函数', '基本初等函数', '三角函数', '数列', '立体几何', '概率统计']
  },
  语文: {
    primary: ['字词积累', '阅读理解', '古诗文背诵', '作文审题', '段落表达', '课内基础'],
    middle: ['现代文阅读', '文言文基础', '古诗词鉴赏', '作文素材', '语言运用', '名著阅读'],
    high: ['论述类文本', '文学类文本', '文言文阅读', '古诗词鉴赏', '语言文字运用', '议论文写作']
  },
  英语: {
    primary: ['核心单词', '基础句型', '阅读短文', '听力跟读', '语法入门', '书面表达'],
    middle: ['词汇短语', '时态语法', '阅读理解', '完形填空', '听说训练', '作文表达'],
    high: ['核心词汇', '句法结构', '阅读理解', '完形填空', '语法填空', '应用文写作']
  },
  物理: {
    primary: ['生活中的物理', '测量与单位', '力与运动', '声和光', '热现象', '实验观察'],
    middle: ['机械运动', '声现象', '光现象', '质量与密度', '力与运动', '功和机械能'],
    high: ['运动学', '相互作用', '牛顿运动定律', '曲线运动', '机械能', '实验与测量']
  },
  化学: {
    primary: ['物质观察', '常见材料', '溶解现象', '空气与水', '实验安全', '生活中的化学'],
    middle: ['物质构成', '化学用语', '空气和氧气', '水和溶液', '化学方程式', '酸碱盐基础'],
    high: ['物质的量', '离子反应', '氧化还原反应', '元素化合物', '化学反应原理', '有机化学基础']
  },
  生物: {
    primary: ['认识生物', '植物生长', '动物特征', '人体健康', '生态环境', '观察记录'],
    middle: ['细胞结构', '生物分类', '植物生理', '人体生理', '遗传与变异', '生态系统'],
    high: ['细胞代谢', '遗传规律', '稳态与调节', '生物与环境', '生物技术', '实验探究']
  },
  政治: {
    primary: ['规则意识', '家庭与责任', '校园生活', '社会公德', '国家常识', '成长思考'],
    middle: ['成长与心理', '道德与法治', '权利与义务', '国家制度', '国情与发展', '时事理解'],
    high: ['中国特色社会主义', '经济与社会', '政治与法治', '哲学与文化', '逻辑与思维', '时事分析']
  },
  历史: {
    primary: ['历史时间线', '重要人物', '文明起源', '古代国家', '近现代事件', '历史故事'],
    middle: ['中国古代史', '中国近代史', '中国现代史', '世界古代史', '世界近代史', '世界现代史'],
    high: ['中外历史纲要', '国家制度演变', '经济与社会生活', '文化交流传播', '战争与和平', '史料分析']
  }
};

const TIPS = [
  '今天重点是稳住节奏，完成后及时打勾。',
  '不要追求题量，先把做错的原因说清楚。',
  '家长可以让孩子复述一遍今天学到的重点。',
  '遇到不会的题先标记，集中在最后 10 分钟处理。',
  '做完后把最容易错的 1 个点写在纸上。'
];

function parseDays(days) {
  if (typeof days === 'number') {
    return days;
  }
  const matched = String(days || '').match(/\d+/);
  return matched ? Number(matched[0]) : 30;
}

function parseDailyMinutes(dailyTime) {
  const text = String(dailyTime || '');
  if (text.indexOf('30') > -1) {
    return 30;
  }
  if (text.indexOf('1.5') > -1) {
    return 90;
  }
  if (text.indexOf('2') > -1) {
    return 120;
  }
  return 60;
}

function getStageByGrade(grade) {
  const gradeText = String(grade || '');
  if (gradeText.indexOf('小学') > -1 || gradeText === '五年级' || gradeText === '六年级') {
    return 'primary';
  }
  if (gradeText.indexOf('高') === 0) {
    return 'high';
  }
  return 'middle';
}

function getModules(grade, subject) {
  const subjectModules = SUBJECT_MODULES[subject] || SUBJECT_MODULES.数学;
  return subjectModules[getStageByGrade(grade)] || subjectModules.middle;
}

function createId() {
  return 'plan_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
}

function buildSummary(options) {
  const levelTextMap = {
    基础较弱: '这份计划适合基础较弱、希望在暑假补齐核心知识点的学生。',
    一般: '这份计划适合基础一般、希望把本学期内容再梳理一遍的学生。',
    较好: '这份计划适合基础较好、希望利用暑假保持学习节奏并进一步提升的学生。'
  };
  const goalTextMap = {
    补基础: '建议每天坚持完成基础复习、针对练习和错题整理，不追求题量，重点是把薄弱知识补扎实。',
    巩固提升: '建议在复习基础的同时加入适量提升练习，用错题复盘帮助孩子把会做的题做稳。',
    预习新课: '建议先保持旧知识不断档，再逐步预习新课概念，让孩子开学前有基本熟悉感。',
    '补基础 + 预习': '建议前期集中补基础，中后期加入新课预习，让孩子既补齐短板，也提前适应新学期内容。'
  };

  return (levelTextMap[options.level] || levelTextMap.一般) + (goalTextMap[options.goal] || goalTextMap.补基础);
}

function limitTasks(tasks, minutes) {
  const max = minutes <= 30 ? 2 : minutes <= 60 ? 3 : 4;
  return tasks.slice(0, max);
}

function buildDiagnosticItem(minutes) {
  return {
    title: '基础诊断',
    tasks: limitTasks([
      '回顾本学期主要知识点',
      '找出最不熟悉的 3 个模块',
      '完成 10 道基础题',
      '把不会的题按知识点分类'
    ], minutes),
    tip: '不要急着刷难题，先找到薄弱点。'
  };
}

function buildReviewItem(weekIndex, minutes) {
  return {
    title: '第 ' + weekIndex + ' 周复盘',
    tasks: limitTasks([
      '整理本周错题并标出高频错误',
      '重做 5 道代表性错题',
      '用自己的话复述 3 个重点知识',
      '和家长一起调整下一周学习重点'
    ], minutes),
    tip: '复盘日不是休息日，重点是把学过的内容变扎实。'
  };
}

function buildBaseItem(moduleName, subject, minutes) {
  const subjectTask = {
    数学: '完成 8 到 12 道基础题',
    语文: '完成 1 篇短阅读或 1 组字词练习',
    英语: '完成 10 个单词和 5 个基础句子练习',
    物理: '完成 6 到 10 道基础概念或计算题',
    化学: '完成 1 组化学用语或基础概念练习',
    生物: '完成 1 组概念辨析并画出知识关系',
    政治: '整理 3 个核心观点并匹配生活例子',
    历史: '梳理时间线并记住 3 个关键事件'
  };

  return {
    title: '基础复习：' + moduleName,
    tasks: limitTasks([
      '复习' + moduleName + '的基本概念',
      subjectTask[subject] || subjectTask.数学,
      '把错题原因写成一句话',
      '请孩子口头讲一遍今天的重点'
    ], minutes),
    tip: '基础复习要慢一点，能讲清楚比做得多更重要。'
  };
}

function buildConsolidationItem(moduleName, subject, goal, minutes) {
  const subjectTask = {
    数学: '完成 10 到 15 道分层练习',
    语文: '完成 1 篇阅读并圈出关键句',
    英语: '完成 1 组阅读或语法小练习',
    物理: '完成 8 到 12 道分层练习并检查单位',
    化学: '完成 1 组方程式或实验现象练习',
    生物: '完成 1 组图表或实验探究练习',
    政治: '完成 2 道材料分析题并标出观点',
    历史: '完成 2 道材料题并写出事件联系'
  };
  const tasks = [
    '复盘' + moduleName + '的常见题型',
    subjectTask[subject] || subjectTask.数学,
    '整理 2 道代表性错题'
  ];

  if (goal === '巩固提升' || goal === '补基础 + 预习') {
    tasks.push('尝试 1 道稍有难度的提升题');
  }

  return {
    title: '专题巩固：' + moduleName,
    tasks: limitTasks(tasks, minutes),
    tip: TIPS[Math.floor(Math.random() * TIPS.length)]
  };
}

function buildPreviewItem(moduleName, subject, hasFoundationGoal, minutes) {
  const subjectTask = {
    数学: '完成 3 到 5 道新课例题',
    语文: '预读 1 篇新课文并标出生词',
    英语: '跟读新课单词和 3 个重点句型',
    物理: '阅读 1 个新课实验并记录变量关系',
    化学: '预习新课概念并写出 3 个关键化学用语',
    生物: '阅读新课图示并整理 3 个核心概念',
    政治: '预读新课框题并圈出 3 个核心观点',
    历史: '预读新课时间线并标记 3 个关键节点'
  };
  const tasks = [
    '阅读' + moduleName + '的新课内容',
    '标记看不懂的概念或题型',
    subjectTask[subject] || subjectTask.数学
  ];

  if (hasFoundationGoal) {
    tasks.unshift('回看与新课相关的旧知识');
  }

  return {
    title: '新课预习：' + moduleName,
    tasks: limitTasks(tasks, minutes),
    tip: '预习只求先熟悉，不要求一次学透。'
  };
}

function buildPlanItem(day, totalDays, options, modules, minutes) {
  if (day === 1) {
    return buildDiagnosticItem(minutes);
  }

  if (day % 7 === 0) {
    return buildReviewItem(day / 7, minutes);
  }

  const progress = day / totalDays;
  const moduleName = modules[(day - 2) % modules.length];
  const hasPreviewGoal = String(options.goal || '').indexOf('预习') > -1;
  const hasFoundationGoal = String(options.goal || '').indexOf('补基础') > -1;
  const weakBase = options.level === '基础较弱';
  const baseLine = weakBase ? 0.52 : 0.35;

  if (progress <= baseLine || hasFoundationGoal && progress <= 0.45) {
    return buildBaseItem(moduleName, options.subject, minutes);
  }

  if (hasPreviewGoal && progress >= 0.68) {
    return buildPreviewItem(moduleName, options.subject, hasFoundationGoal, minutes);
  }

  return buildConsolidationItem(moduleName, options.subject, options.goal, minutes);
}

function generateStudyPlan(options) {
  if (!options || !options.grade || !options.subject || !options.level || !options.goal || !options.days || !options.dailyTime) {
    throw new Error('缺少生成学习计划所需的信息');
  }

  const totalDays = parseDays(options.days);
  const minutes = parseDailyMinutes(options.dailyTime);
  const modules = getModules(options.grade, options.subject);
  const items = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const item = buildPlanItem(day, totalDays, options, modules, minutes);
    items.push({
      day,
      title: item.title,
      tasks: item.tasks,
      duration: minutes + ' 分钟',
      tip: item.tip,
      completed: false
    });
  }

  return {
    id: createId(),
    grade: options.grade,
    subject: options.subject,
    level: options.level,
    goal: options.goal,
    days: totalDays,
    dailyTime: options.dailyTime,
    summary: buildSummary(options),
    focus: buildFocus(options),
    items
  };
}

function buildFocus(options) {
  const parts = ['基础复习', '错题整理'];
  if (String(options.goal || '').indexOf('预习') > -1) {
    parts.push('新课预习');
  }
  if (options.goal === '巩固提升') {
    parts.push('专题提升');
  }
  return parts.join(' + ');
}

module.exports = {
  generateStudyPlan
};
