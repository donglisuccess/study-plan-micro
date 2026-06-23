const { trackEvent } = require('../../utils/eventTracker');
const { getActivePlan } = require('../../utils/planStorage');

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
    plan: null
  },

  onLoad() {
    const plan = getActivePlan();

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

    this.setData({
      plan
    });
  },

  handleSave() {
    wx.showToast({
      title: '保存海报功能即将开放',
      icon: 'none'
    });
  },

  handleShareTap() {
    if (!this.data.plan) {
      return;
    }
    trackEvent('click_share', {
      planId: this.data.plan.id,
      source: 'poster_share_button'
    });
  },

  handleBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.redirectTo({
        url: '/pages/plan/plan'
      });
    }
  },

  onShareAppMessage() {
    const plan = this.data.plan;

    if (plan) {
      trackEvent('click_share', {
        planId: plan.id,
        source: 'poster_native_share'
      });
    }

    return {
      title: '我生成了一份暑假学习计划，你也试试',
      path: plan ? '/pages/loading/loading?' + formatPlanQuery(plan) : '/pages/loading/loading'
    };
  }
});
