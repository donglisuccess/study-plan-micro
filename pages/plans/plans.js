const {
  getPlanHistory,
  getPlanById,
  getPlanProgress,
  setActivePlan,
  removePlan
} = require('../../utils/planStorage');

const DELETE_ACTION_WIDTH_RPX = 144;
const SWIPE_START_DISTANCE = 8;
const SWIPE_GUIDE_CLOSED_KEY = 'plansSwipeGuideClosed';

function pad(number) {
  return number < 10 ? '0' + number : String(number);
}

function formatSavedTime(value) {
  if (!value) {
    return '近期生成';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '近期生成';
  }

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('.') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join(':');
}

Page({
  data: {
    plans: [],
    visiblePlans: [],
    subjectFilters: ['全部'],
    selectedSubject: '全部',
    subjectCount: 0,
    swipingPlanId: '',
    openedPlanId: '',
    showSwipeGuide: true
  },

  onLoad() {
    this.setData({
      showSwipeGuide: !wx.getStorageSync(SWIPE_GUIDE_CLOSED_KEY)
    });
  },

  onShow() {
    this.loadPlans();
  },

  loadPlans() {
    const history = getPlanHistory();
    const subjects = [];
    const plans = history.map((plan) => {
      if (plan.subject && subjects.indexOf(plan.subject) === -1) {
        subjects.push(plan.subject);
      }

      const progress = getPlanProgress(plan);
      return {
        id: plan.id,
        grade: plan.grade,
        subject: plan.subject,
        goal: plan.goal,
        days: plan.days,
        dailyTime: plan.dailyTime,
        subjectMark: (plan.subject || '计').slice(0, 1),
        completedCount: progress.completedCount,
        progressPercent: progress.progressPercent,
        allCompleted: progress.allCompleted,
        nextTaskText: progress.nextTask
          ? '下一项：第 ' + progress.nextTask.day + ' 天 · ' + progress.nextTask.title
          : '计划已全部完成，可以随时回来复盘',
        savedTimeText: formatSavedTime(plan.createdAt || plan.savedAt),
        swipeOffset: 0
      };
    });

    const subjectFilters = ['全部'].concat(subjects);
    const selectedSubject = subjectFilters.indexOf(this.data.selectedSubject) > -1
      ? this.data.selectedSubject
      : '全部';

    this.setData({
      plans,
      subjectFilters,
      subjectCount: subjects.length,
      selectedSubject,
      visiblePlans: this.filterPlans(plans, selectedSubject),
      swipingPlanId: '',
      openedPlanId: ''
    });
  },

  filterPlans(plans, subject) {
    if (subject === '全部') {
      return plans;
    }
    return plans.filter((plan) => plan.subject === subject);
  },

  selectSubject(event) {
    const subject = event.currentTarget.dataset.subject;
    this.setData({
      selectedSubject: subject,
      visiblePlans: this.filterPlans(this.data.plans, subject).map((plan) => {
        return Object.assign({}, plan, {
          swipeOffset: 0
        });
      }),
      swipingPlanId: '',
      openedPlanId: ''
    });
  },

  getDeleteActionWidth() {
    if (this.deleteActionWidth) {
      return this.deleteActionWidth;
    }

    const windowInfo = wx.getWindowInfo
      ? wx.getWindowInfo()
      : wx.getSystemInfoSync();
    this.deleteActionWidth = DELETE_ACTION_WIDTH_RPX * (windowInfo.windowWidth || 375) / 750;
    return this.deleteActionWidth;
  },

  updatePlanSwipeOffset(planId, offset) {
    const visiblePlans = this.data.visiblePlans.map((plan) => {
      if (plan.id !== planId) {
        return plan;
      }
      return Object.assign({}, plan, {
        swipeOffset: offset
      });
    });

    this.setData({
      visiblePlans
    });
  },

  closeOpenedPlan(excludedPlanId) {
    const openedPlanId = this.data.openedPlanId;
    if (!openedPlanId || openedPlanId === excludedPlanId) {
      return;
    }

    this.updatePlanSwipeOffset(openedPlanId, 0);
    this.setData({
      openedPlanId: ''
    });
  },

  handlePlanTouchStart(event) {
    const touch = event.touches && event.touches[0];
    const planId = event.currentTarget.dataset.id;
    if (!touch || !planId) {
      return;
    }

    this.closeOpenedPlan(planId);
    const deleteActionWidth = this.getDeleteActionWidth();
    const currentPlan = this.data.visiblePlans.find((plan) => plan.id === planId);

    this.planTouchState = {
      planId,
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset: currentPlan ? currentPlan.swipeOffset : 0,
      offset: currentPlan ? currentPlan.swipeOffset : 0,
      deleteActionWidth,
      direction: '',
      moved: false
    };
  },

  handlePlanTouchMove(event) {
    const state = this.planTouchState;
    const touch = event.touches && event.touches[0];
    if (!state || !touch || state.planId !== event.currentTarget.dataset.id) {
      return;
    }

    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;

    if (!state.direction) {
      if (Math.abs(deltaX) < SWIPE_START_DISTANCE && Math.abs(deltaY) < SWIPE_START_DISTANCE) {
        return;
      }
      state.direction = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }

    if (state.direction !== 'horizontal') {
      return;
    }

    const offset = Math.max(
      -state.deleteActionWidth,
      Math.min(0, state.startOffset + deltaX)
    );
    state.offset = offset;
    state.moved = state.moved || Math.abs(deltaX) > SWIPE_START_DISTANCE;

    this.setData({
      swipingPlanId: state.planId
    });
    this.updatePlanSwipeOffset(state.planId, offset);
  },

  handlePlanTouchEnd(event) {
    const state = this.planTouchState;
    if (!state || state.planId !== event.currentTarget.dataset.id) {
      return;
    }

    const shouldOpen = state.direction === 'horizontal'
      && state.offset <= -state.deleteActionWidth * 0.42;
    const targetOffset = shouldOpen ? -state.deleteActionWidth : 0;

    this.suppressPlanTapUntil = state.moved ? Date.now() + 350 : 0;
    this.planTouchState = null;
    this.setData({
      swipingPlanId: '',
      openedPlanId: shouldOpen ? state.planId : ''
    });
    this.updatePlanSwipeOffset(state.planId, targetOffset);
  },

  openPlan(event) {
    const planId = event.currentTarget.dataset.id;

    if (this.suppressPlanTapUntil && Date.now() < this.suppressPlanTapUntil) {
      return;
    }
    this.suppressPlanTapUntil = 0;

    const currentPlan = this.data.visiblePlans.find((plan) => plan.id === planId);
    if (currentPlan && currentPlan.swipeOffset < 0) {
      this.updatePlanSwipeOffset(planId, 0);
      this.setData({
        openedPlanId: ''
      });
      return;
    }

    const plan = getPlanById(planId);
    if (!plan) {
      return;
    }

    setActivePlan(plan);
    wx.navigateTo({
      url: '/pages/plan/plan?id=' + encodeURIComponent(planId)
    });
  },

  deletePlan(event) {
    const planId = event.currentTarget.dataset.id;
    const plan = this.data.plans.find((item) => item.id === planId);
    if (!plan) {
      return;
    }

    wx.showModal({
      title: '删除学习计划',
      content: '确定删除“' + plan.grade + ' · ' + plan.subject + '”吗？学习进度也会一并清除。',
      confirmText: '删除',
      confirmColor: '#e84545',
      success: (result) => {
        if (!result.confirm) {
          this.updatePlanSwipeOffset(planId, 0);
          this.setData({
            openedPlanId: ''
          });
          return;
        }

        removePlan(planId);
        this.loadPlans();
        wx.showToast({
          title: '计划已删除',
          icon: 'success'
        });
      }
    });
  },

  closeSwipeGuide() {
    wx.setStorageSync(SWIPE_GUIDE_CLOSED_KEY, true);
    this.setData({
      showSwipeGuide: false
    });
  },

  goCreatePlan() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
