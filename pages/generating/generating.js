const { generateStudyPlan } = require('../../utils/planGenerator');
const { trackEvent } = require('../../utils/eventTracker');

function decodeOption(value) {
  return value ? decodeURIComponent(value) : '';
}

Page({
  data: {
    progress: 8,
    activeIndex: 0,
    failed: false,
    errorText: '',
    steps: [
      '正在分析孩子的学习基础...',
      '正在安排每日学习任务...',
      '正在平衡复习和预习内容...',
      '正在生成适合暑假的学习节奏...',
      '即将完成，整理计划中...'
    ]
  },

  onLoad(options) {
    this.formOptions = {
      grade: decodeOption(options.grade),
      subject: decodeOption(options.subject),
      level: decodeOption(options.level),
      goal: decodeOption(options.goal),
      days: decodeOption(options.days),
      dailyTime: decodeOption(options.dailyTime)
    };

    this.startGenerating();
  },

  onUnload() {
    this.clearTimers();
  },

  clearTimers() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    if (this.finishTimer) {
      clearTimeout(this.finishTimer);
      this.finishTimer = null;
    }
  },

  startGenerating() {
    this.clearTimers();

    this.setData({
      progress: 8,
      activeIndex: 0,
      failed: false,
      errorText: ''
    });

    let tick = 0;
    this.progressTimer = setInterval(() => {
      tick += 1;
      const nextProgress = Math.min(92, 8 + tick * 17);
      const nextIndex = Math.min(this.data.steps.length - 1, Math.floor(tick / 1.2));

      this.setData({
        progress: nextProgress,
        activeIndex: nextIndex
      });
    }, 300);

    this.finishTimer = setTimeout(() => {
      try {
        const plan = generateStudyPlan(this.formOptions);
        wx.setStorageSync('latestStudyPlan', plan);
        trackEvent('generate_success', {
          planId: plan.id,
          grade: plan.grade,
          subject: plan.subject,
          days: plan.days
        });

        this.clearTimers();
        this.setData({
          progress: 100,
          activeIndex: this.data.steps.length - 1
        });

        wx.redirectTo({
          url: '/pages/plan/plan?id=' + encodeURIComponent(plan.id)
        });
      } catch (error) {
        console.error('[study-plan] generate failed', error);
        this.clearTimers();
        this.setData({
          failed: true,
          errorText: '生成失败了，请稍后重试。'
        });
      }
    }, 1500);
  },

  handleRetry() {
    this.startGenerating();
  },

  onShareAppMessage() {
    return {
      title: '免费生成孩子暑假学习计划',
      path: '/pages/loading/loading'
    };
  }
});
