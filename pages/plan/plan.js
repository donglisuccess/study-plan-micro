const { trackEvent } = require('../../utils/eventTracker');

function completionKey(planId) {
  return 'planCompleted_' + planId;
}

function encodeQuery(data) {
  return Object.keys(data).map((key) => {
    return key + '=' + encodeURIComponent(data[key] || '');
  }).join('&');
}

function formatPlanQuery(plan) {
  return encodeQuery({
    grade: plan.grade,
    subject: plan.subject,
    level: plan.level,
    goal: plan.goal,
    days: plan.days + ' 天',
    dailyTime: plan.dailyTime
  });
}

Page({
  data: {
    plan: null,
    completedCount: 0,
    showFeedback: false,
    feedbackOptions: [
      { label: '有帮助', active: false },
      { label: '一般', active: false },
      { label: '不太符合', active: false },
      { label: '内容太简单', active: false },
      { label: '内容太多', active: false },
      { label: '想要更详细', active: false }
    ],
    feedbackText: ''
  },

  onLoad() {
    this.loadPlan();
  },

  loadPlan() {
    const plan = wx.getStorageSync('latestStudyPlan');

    if (!plan || !plan.id) {
      wx.showToast({
        title: '请先生成计划',
        icon: 'none'
      });
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index'
        });
      }, 800);
      return;
    }

    const completedMap = wx.getStorageSync(completionKey(plan.id)) || {};
    const nextItems = (plan.items || []).map((item) => {
      return Object.assign({}, item, {
        completed: Boolean(completedMap[item.day])
      });
    });
    const nextPlan = Object.assign({}, plan, {
      items: nextItems
    });

    this.setData({
      plan: nextPlan,
      completedCount: this.countCompleted(nextItems)
    });

    trackEvent('view_plan', {
      planId: nextPlan.id,
      grade: nextPlan.grade,
      subject: nextPlan.subject,
      days: nextPlan.days
    });
  },

  countCompleted(items) {
    return items.filter((item) => item.completed).length;
  },

  saveCompleted(plan) {
    const completedMap = {};
    plan.items.forEach((item) => {
      if (item.completed) {
        completedMap[item.day] = true;
      }
    });
    wx.setStorageSync(completionKey(plan.id), completedMap);
  },

  toggleComplete(event) {
    const index = Number(event.currentTarget.dataset.index);
    const plan = Object.assign({}, this.data.plan);
    const items = plan.items.slice();
    items[index] = Object.assign({}, items[index], {
      completed: !items[index].completed
    });
    plan.items = items;

    this.saveCompleted(plan);
    this.setData({
      plan,
      completedCount: this.countCompleted(items)
    });
  },

  handlePoster() {
    if (!this.data.plan) {
      return;
    }

    trackEvent('click_share', {
      planId: this.data.plan.id,
      source: 'plan_poster_button'
    });

    wx.navigateTo({
      url: '/pages/poster/poster'
    });
  },

  handleRegenerate() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  },

  openFeedback() {
    this.setData({
      showFeedback: true
    });
  },

  closeFeedback() {
    this.setData({
      showFeedback: false
    });
  },

  noop() {},

  toggleFeedback(event) {
    const index = Number(event.currentTarget.dataset.index);
    const feedbackOptions = this.data.feedbackOptions.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }
      return Object.assign({}, item, {
        active: !item.active
      });
    });

    this.setData({
      feedbackOptions
    });
  },

  handleFeedbackInput(event) {
    this.setData({
      feedbackText: event.detail.value
    });
  },

  submitFeedback() {
    const plan = this.data.plan;
    const selectedFeedbacks = this.data.feedbackOptions
      .filter((item) => item.active)
      .map((item) => item.label);
    const feedback = {
      planId: plan ? plan.id : '',
      options: selectedFeedbacks,
      text: this.data.feedbackText,
      createdAt: Date.now()
    };
    const list = wx.getStorageSync('studyPlanFeedbacks') || [];
    list.push(feedback);
    wx.setStorageSync('studyPlanFeedbacks', list.slice(-100));

    trackEvent('submit_feedback', {
      planId: feedback.planId,
      options: feedback.options,
      hasText: Boolean(feedback.text)
    });

    this.setData({
      showFeedback: false,
      feedbackOptions: this.data.feedbackOptions.map((item) => {
        return Object.assign({}, item, {
          active: false
        });
      }),
      feedbackText: ''
    });

    wx.showToast({
      title: '感谢反馈，我们会继续优化计划内容',
      icon: 'none'
    });
  },

  onShareAppMessage() {
    const plan = this.data.plan;
    const path = plan ? '/pages/index/index?' + formatPlanQuery(plan) : '/pages/index/index';

    return {
      title: '我生成了一份暑假学习计划，你也试试',
      path
    };
  }
});
