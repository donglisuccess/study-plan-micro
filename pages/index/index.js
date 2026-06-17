const { trackEvent } = require('../../utils/eventTracker');

const defaultForm = {
  grade: '',
  subject: '',
  level: '',
  goal: '',
  days: '30 天',
  dailyTime: '1 小时'
};

function encodeQuery(form) {
  return Object.keys(form).map((key) => {
    return key + '=' + encodeURIComponent(form[key] || '');
  }).join('&');
}

function decodeOption(value) {
  return value ? decodeURIComponent(value) : '';
}

Page({
  data: {
    gradeOptions: ['小学五年级', '小学六年级', '初一', '初二', '初三'],
    subjectOptions: ['数学', '语文', '英语'],
    levelOptions: ['基础较弱', '一般', '较好'],
    goalOptions: ['补基础', '巩固提升', '预习新课', '补基础 + 预习'],
    daysOptions: ['14 天', '21 天', '30 天', '45 天'],
    timeOptions: ['30 分钟', '1 小时', '1.5 小时', '2 小时'],
    form: defaultForm,
    isComplete: false
  },

  onLoad(options) {
    const nextForm = Object.assign({}, defaultForm, {
      grade: decodeOption(options.grade),
      subject: decodeOption(options.subject),
      level: decodeOption(options.level),
      goal: decodeOption(options.goal),
      days: decodeOption(options.days) || defaultForm.days,
      dailyTime: decodeOption(options.dailyTime) || defaultForm.dailyTime
    });

    this.setData({
      form: nextForm,
      isComplete: this.checkComplete(nextForm)
    });

    trackEvent('visit_home', {
      fromShare: Boolean(options.grade || options.subject || options.goal)
    });
  },

  checkComplete(form) {
    return Boolean(form.grade && form.subject && form.level && form.goal && form.days && form.dailyTime);
  },

  selectOption(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.currentTarget.dataset.value;
    const form = Object.assign({}, this.data.form, {
      [field]: value
    });

    this.setData({
      form,
      isComplete: this.checkComplete(form)
    });
  },

  handleGenerate() {
    if (!this.data.isComplete) {
      return;
    }

    trackEvent('click_generate', this.data.form);

    wx.navigateTo({
      url: '/pages/generating/generating?' + encodeQuery(this.data.form)
    });
  },

  onShareAppMessage() {
    const form = this.data.form;
    const path = '/pages/index/index?' + encodeQuery({
      grade: form.grade,
      subject: form.subject,
      level: form.level,
      goal: form.goal,
      days: form.days,
      dailyTime: form.dailyTime
    });

    return {
      title: '免费生成孩子暑假学习计划',
      path
    };
  }
});
