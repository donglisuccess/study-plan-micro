const { trackEvent } = require('../../utils/eventTracker');
const {
  getLatestPlan,
  getPlanById,
  setActivePlan,
  getCompletedMap,
  saveCompletedMap,
  removePlan
} = require('../../utils/planStorage');

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
    progressPercent: 0,
    nextTaskText: '',
    allCompleted: false,
    weeks: [],
    selectedWeekIndex: 0,
    weekScrollLeft: 0,
    visibleItems: [],
    expandedDay: 0,
    showPlanCelebration: false,
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

  onLoad(options) {
    this.planId = options.id ? decodeURIComponent(options.id) : '';
    this.loadPlan(this.planId);
  },

  loadPlan(planId) {
    const plan = getPlanById(planId) || getLatestPlan();

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

    setActivePlan(plan);
    const completedMap = getCompletedMap(plan.id);
    const nextItems = (plan.items || []).map((item) => {
      return Object.assign({}, item, {
        completed: Boolean(completedMap[item.day])
      });
    });
    const nextPlan = Object.assign({}, plan, {
      items: nextItems
    });

    const firstIncompleteIndex = nextItems.findIndex((item) => !item.completed);
    const initialItemIndex = firstIncompleteIndex > -1
      ? firstIncompleteIndex
      : Math.max(0, nextItems.length - 1);
    const selectedWeekIndex = Math.floor(initialItemIndex / 7);
    const expandedDay = nextItems[initialItemIndex] ? nextItems[initialItemIndex].day : 0;

    this.updatePlanView(nextPlan, selectedWeekIndex, expandedDay);

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

  buildWeeks(items) {
    const weeks = [];

    for (let start = 0; start < items.length; start += 7) {
      const weekItems = items.slice(start, start + 7);
      const completedCount = this.countCompleted(weekItems);
      const firstDay = weekItems[0].day;
      const lastDay = weekItems[weekItems.length - 1].day;

      weeks.push({
        index: weeks.length,
        label: '第 ' + (weeks.length + 1) + ' 周',
        range: firstDay === lastDay
          ? '第 ' + firstDay + ' 天'
          : firstDay + '-' + lastDay + ' 天',
        completedCount,
        total: weekItems.length,
        completed: completedCount === weekItems.length
      });
    }

    return weeks;
  },

  getWeekScrollLeft(selectedWeekIndex) {
    const windowInfo = wx.getWindowInfo
      ? wx.getWindowInfo()
      : wx.getSystemInfoSync();
    const windowWidth = windowInfo.windowWidth || 375;
    const rpxScale = windowWidth / 750;
    const tabWidth = 186;
    const tabGap = 16;
    const pageHorizontalPadding = 60;
    const viewportWidth = windowWidth - pageHorizontalPadding * rpxScale;
    const tabCenter = (selectedWeekIndex * (tabWidth + tabGap) + tabWidth / 2) * rpxScale;

    return Math.max(0, Math.round(tabCenter - viewportWidth / 2));
  },

  updatePlanView(plan, selectedWeekIndex, expandedDay, options) {
    const viewOptions = options || {};
    const updateOverview = viewOptions.updateOverview !== false;
    const items = plan.items || [];
    const currentHeightMap = {};
    (this.data.visibleItems || []).forEach((item) => {
      currentHeightMap[item.day] = item.detailsHeight || 0;
    });
    const weekCount = Math.ceil(items.length / 7);
    const safeWeekIndex = Math.min(
      Math.max(Number(selectedWeekIndex) || 0, 0),
      Math.max(weekCount - 1, 0)
    );
    const start = safeWeekIndex * 7;
    const visibleItems = items.slice(start, start + 7).map((item, index) => {
      return Object.assign({}, item, {
        originalIndex: start + index,
        taskCount: (item.tasks || []).length,
        detailsHeight: currentHeightMap[item.day] || 0
      });
    });
    const nextExpandedDay = visibleItems.some((item) => item.day === expandedDay)
      ? expandedDay
      : visibleItems.length
        ? visibleItems[0].day
        : 0;

    const nextData = {
      selectedWeekIndex: safeWeekIndex,
      weekScrollLeft: this.getWeekScrollLeft(safeWeekIndex),
      visibleItems,
      expandedDay: nextExpandedDay
    };

    if (updateOverview) {
      const completedCount = this.countCompleted(items);
      const nextTask = items.find((item) => !item.completed);
      const totalDays = Number(plan.days) || items.length;

      Object.assign(nextData, {
        plan,
        completedCount,
        progressPercent: totalDays ? Math.round(completedCount / totalDays * 100) : 0,
        nextTaskText: nextTask
          ? '下一项：第 ' + nextTask.day + ' 天 · ' + nextTask.title
          : '全部任务已完成，可以进行一次整体复盘',
        allCompleted: items.length > 0 && completedCount === items.length,
        weeks: this.buildWeeks(items)
      });
    }

    this.setData(nextData, () => {
      this.measureDayDetails();
    });
  },

  measureDayDetails() {
    const query = wx.createSelectorQuery().in(this);
    query.selectAll('.day-details').boundingClientRect((rects) => {
      if (!rects || !rects.length) {
        return;
      }

      const heightMap = {};
      rects.forEach((rect, index) => {
        const currentItem = this.data.visibleItems[index];
        const day = Number(rect.dataset && rect.dataset.day)
          || (currentItem ? currentItem.day : 0);
        if (day) {
          heightMap[day] = Math.ceil(rect.height);
        }
      });

      const visibleItems = this.data.visibleItems.map((item) => {
        return Object.assign({}, item, {
          detailsHeight: heightMap[item.day] || item.detailsHeight || 0
        });
      });

      this.setData({
        visibleItems
      });
    }).exec();
  },

  saveCompleted(plan) {
    const completedMap = {};
    plan.items.forEach((item) => {
      if (item.completed) {
        completedMap[item.day] = true;
      }
    });
    saveCompletedMap(plan.id, completedMap);
  },

  toggleComplete(event) {
    const index = Number(event.currentTarget.dataset.index);
    const plan = Object.assign({}, this.data.plan);
    const items = plan.items.slice();
    const wasCompleted = items[index].completed;
    items[index] = Object.assign({}, items[index], {
      completed: !wasCompleted
    });
    plan.items = items;

    this.saveCompleted(plan);
    this.updatePlanView(plan, this.data.selectedWeekIndex, items[index].day);

    const shouldCelebrate = !wasCompleted
      && items.length > 0
      && items.every((item) => item.completed);

    if (shouldCelebrate) {
      this.showPlanCompletionCelebration();
    }
  },

  showPlanCompletionCelebration() {
    if (this.completionCelebrationTimer) {
      clearTimeout(this.completionCelebrationTimer);
    }

    this.setData({
      showPlanCelebration: true
    });

    this.completionCelebrationTimer = setTimeout(() => {
      this.setData({
        showPlanCelebration: false
      });
      this.completionCelebrationTimer = null;
    }, 3200);
  },

  selectWeek(event) {
    const selectedWeekIndex = Number(event.currentTarget.dataset.index);
    const start = selectedWeekIndex * 7;
    const weekItems = this.data.plan.items.slice(start, start + 7);
    const firstIncomplete = weekItems.find((item) => !item.completed);
    const expandedDay = firstIncomplete
      ? firstIncomplete.day
      : weekItems.length
        ? weekItems[0].day
        : 0;

    this.updatePlanView(this.data.plan, selectedWeekIndex, expandedDay, {
      updateOverview: false
    });
  },

  toggleDayExpand(event) {
    const day = Number(event.currentTarget.dataset.day);
    this.setData({
      expandedDay: this.data.expandedDay === day ? 0 : day
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
    const plan = this.data.plan;
    if (!plan) {
      return;
    }

    wx.showModal({
      title: '重新生成计划',
      content: '当前计划将从“我的学习计划”中移除，已完成记录也会清空。',
      confirmText: '重新生成',
      confirmColor: '#2f80ed',
      success: (result) => {
        if (!result.confirm) {
          return;
        }

        const query = formatPlanQuery(plan);
        removePlan(plan.id);
        wx.reLaunch({
          url: '/pages/index/index?' + query
        });
      }
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

  onUnload() {
    if (this.completionCelebrationTimer) {
      clearTimeout(this.completionCelebrationTimer);
      this.completionCelebrationTimer = null;
    }
  },

  onShareAppMessage() {
    const plan = this.data.plan;
    const path = plan ? '/pages/loading/loading?' + formatPlanQuery(plan) : '/pages/loading/loading';

    return {
      title: '我生成了一份暑假学习计划，你也试试',
      path
    };
  }
});
