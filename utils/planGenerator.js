const SUBJECT_MODULES = {
  数学: {
    primary: ['数的运算', '分数与小数', '应用题', '图形与面积', '方程入门', '统计与概率'],
    middle: ['有理数与整式', '方程与不等式', '函数基础', '几何图形', '三角形与四边形', '数据统计']
  },
  语文: {
    primary: ['字词积累', '阅读理解', '古诗文背诵', '作文审题', '段落表达', '课内基础'],
    middle: ['现代文阅读', '文言文基础', '古诗词鉴赏', '作文素材', '语言运用', '名著阅读']
  },
  英语: {
    primary: ['核心单词', '基础句型', '阅读短文', '听力跟读', '语法入门', '书面表达'],
    middle: ['词汇短语', '时态语法', '阅读理解', '完形填空', '听说训练', '作文表达']
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
  return String(grade || '').indexOf('小学') > -1 ? 'primary' : 'middle';
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
    英语: '完成 10 个单词和 5 个基础句子练习'
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
    英语: '完成 1 组阅读或语法小练习'
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
    英语: '跟读新课单词和 3 个重点句型'
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
