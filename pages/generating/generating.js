const { generateStudyPlan } = require('../../utils/api');
const { trackEvent } = require('../../utils/eventTracker');
const { savePlan } = require('../../utils/planStorage');

const MIN_GENERATING_TIME = 1800;

function decodeOption(value) {
  return value ? decodeURIComponent(value) : '';
}

Page({
  data: {
    progress: 8,
    activeIndex: 0,
    failed: false,
    errorText: '',
    mainTitle: '正在为孩子生成学习计划...',
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

    this.setData({
      mainTitle: '正在生成' + this.formOptions.subject + '学习计划...',
      steps: [
        '正在分析' + this.formOptions.grade + this.formOptions.subject + '的学习基础...',
        '正在根据“' + this.formOptions.level + '”调整任务难度...',
        '正在围绕“' + this.formOptions.goal + '”安排学习节奏...',
        '正在平衡复习、练习和错题整理...',
        '正在生成' + this.formOptions.days + '的每日任务...'
      ]
    });

    this.startGenerating();
  },

  onUnload() {
    this.requestSequence = (this.requestSequence || 0) + 1;
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
    this.requestSequence = (this.requestSequence || 0) + 1;
    const currentSequence = this.requestSequence;
    const startedAt = Date.now();

    this.setData({
      progress: 8,
      activeIndex: 0,
      failed: false,
      errorText: ''
    });

    let tick = 0;
    this.progressTimer = setInterval(() => {
      tick += 1;
      const nextProgress = Math.min(92, 8 + tick * 13);
      const nextIndex = Math.min(this.data.steps.length - 1, Math.floor(tick / 2));

      this.setData({
        progress: nextProgress,
        activeIndex: nextIndex
      });
    }, 360);

    generateStudyPlan(this.formOptions).then((plan) => {
      if (currentSequence !== this.requestSequence) {
        return;
      }

      const remaining = Math.max(0, MIN_GENERATING_TIME - (Date.now() - startedAt));
      this.finishTimer = setTimeout(() => {
        this.handleGenerateSuccess(plan, currentSequence);
      }, remaining);
    }).catch((error) => {
      if (currentSequence !== this.requestSequence) {
        return;
      }

      console.error('[study-plan] generate failed', error);
      const remaining = Math.max(0, 900 - (Date.now() - startedAt));
      this.finishTimer = setTimeout(() => {
        if (currentSequence !== this.requestSequence) {
          return;
        }
        this.clearTimers();
        this.setData({
          failed: true,
          errorText: error.message || '生成失败了，请检查网络后重试。'
        });
      }, remaining);
    });
  },

  handleGenerateSuccess(plan, sequence) {
    if (sequence !== this.requestSequence) {
      return;
    }

    savePlan(plan);
    trackEvent('generate_success', {
      planId: plan.id,
      grade: plan.grade,
      subject: plan.subject,
      days: plan.days,
      generatedBy: plan.generatedBy || 'backend'
    });

    this.clearTimers();
    this.setData({
      progress: 100,
      activeIndex: this.data.steps.length - 1
    });

    this.finishTimer = setTimeout(() => {
      wx.redirectTo({
        url: '/pages/plan/plan?id=' + encodeURIComponent(plan.id)
      });
    }, 180);
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
