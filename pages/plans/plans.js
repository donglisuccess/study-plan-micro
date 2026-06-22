const {
  getPlanHistory,
  getPlanById,
  getPlanProgress,
  setActivePlan
} = require('../../utils/planStorage');

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
    subjectCount: 0
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
        savedTimeText: formatSavedTime(plan.createdAt || plan.savedAt)
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
      visiblePlans: this.filterPlans(plans, selectedSubject)
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
      visiblePlans: this.filterPlans(this.data.plans, subject)
    });
  },

  openPlan(event) {
    const planId = event.currentTarget.dataset.id;
    const plan = getPlanById(planId);
    if (!plan) {
      return;
    }

    setActivePlan(plan);
    wx.navigateTo({
      url: '/pages/plan/plan?id=' + encodeURIComponent(planId)
    });
  },

  goCreatePlan() {
    wx.reLaunch({
      url: '/pages/index/index'
    });
  }
});
