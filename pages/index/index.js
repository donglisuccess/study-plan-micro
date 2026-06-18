const { trackEvent } = require('../../utils/eventTracker');
const { getBasicOptions } = require('../../utils/api');

const defaultForm = {
  grade: '',
  subject: '',
  level: '',
  goal: '',
  days: '',
  dailyTime: ''
};

const PRIMARY_GRADES = ['五年级', '六年级', '小学五年级', '小学六年级'];
const PRIMARY_SUBJECTS = ['数学', '语文', '英语'];

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
    bannerList: [
      {
        url: 'https://dl-tesdl-tes.oss-cn-beijing.aliyuncs.com/weixin/banner.png',
        background: '#2f80ed'
      },
      {
        url: 'https://dl-tesdl-tes.oss-cn-beijing.aliyuncs.com/weixin/banner-2.png',
        background: '#effbe8'
      }
    ],
    gradeOptions: [],
    allSubjectOptions: [],
    subjectOptions: [],
    levelOptions: [],
    goalOptions: [],
    daysOptions: [],
    timeOptions: [],
    form: defaultForm,
    isComplete: false,
    isLoadingOptions: true,
    optionsLoadFailed: false
  },

  onLoad(options) {
    const nextForm = Object.assign({}, defaultForm, {
      grade: decodeOption(options.grade),
      subject: decodeOption(options.subject),
      level: decodeOption(options.level),
      goal: decodeOption(options.goal),
      days: decodeOption(options.days),
      dailyTime: decodeOption(options.dailyTime)
    });

    this.setData({
      form: nextForm,
      isComplete: this.checkComplete(nextForm)
    });

    const app = getApp();
    if (app.globalData.basicOptions) {
      this.applyBasicOptions(app.globalData.basicOptions);
    } else {
      this.loadBasicOptions();
    }

    trackEvent('visit_home', {
      fromShare: Boolean(options.grade || options.subject || options.goal)
    });
  },

  checkComplete(form) {
    return Boolean(form.grade && form.subject && form.level && form.goal && form.days && form.dailyTime);
  },

  getSubjectOptions(allSubjectOptions, grade) {
    if (PRIMARY_GRADES.indexOf(grade) > -1) {
      return allSubjectOptions.filter((subject) => PRIMARY_SUBJECTS.indexOf(subject) > -1);
    }
    return allSubjectOptions;
  },

  applyBasicOptions(data) {
    const optionData = data || {};
    const defaults = optionData.defaults || {};
    const currentForm = this.data.form;
    const allSubjectOptions = optionData.subjects || [];
    const subjectOptions = this.getSubjectOptions(allSubjectOptions, currentForm.grade);
    const form = Object.assign({}, currentForm, {
      subject: subjectOptions.indexOf(currentForm.subject) > -1 ? currentForm.subject : '',
      days: currentForm.days || defaults.days || '',
      dailyTime: currentForm.dailyTime || defaults.dailyTimes || ''
    });

    this.setData({
      gradeOptions: optionData.grades || [],
      allSubjectOptions,
      subjectOptions,
      levelOptions: optionData.levels || [],
      goalOptions: optionData.goals || [],
      daysOptions: optionData.days || [],
      timeOptions: optionData.dailyTimes || [],
      form,
      isComplete: this.checkComplete(form),
      isLoadingOptions: false,
      optionsLoadFailed: false
    });
  },

  loadBasicOptions() {
    this.setData({
      isLoadingOptions: true,
      optionsLoadFailed: false
    });

    getBasicOptions().then((data) => {
      const app = getApp();
      app.globalData.basicOptions = data || null;
      app.globalData.basicOptionsError = false;
      this.applyBasicOptions(data);
    }).catch((error) => {
      console.error('[study-plan] load basic options failed', error);
      getApp().globalData.basicOptionsError = true;
      this.setData({
        isLoadingOptions: false,
        optionsLoadFailed: true
      });
      wx.showToast({
        title: '选项加载失败，请检查后端服务',
        icon: 'none'
      });
    });
  },

  retryLoadOptions() {
    this.loadBasicOptions();
  },

  selectOption(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.currentTarget.dataset.value;
    const form = Object.assign({}, this.data.form, {
      [field]: value
    });
    const nextData = {};

    if (field === 'grade') {
      const subjectOptions = this.getSubjectOptions(this.data.allSubjectOptions, value);
      nextData.subjectOptions = subjectOptions;
      if (subjectOptions.indexOf(form.subject) === -1) {
        form.subject = '';
      }
    }

    this.setData(Object.assign(nextData, {
      form,
      isComplete: this.checkComplete(form)
    }));
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
      path: path.replace('/pages/index/index', '/pages/loading/loading')
    };
  }
});
