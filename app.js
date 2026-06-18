App({
  onLaunch() {
    const logs = wx.getStorageSync('studyPlanAppLogs') || [];
    logs.unshift(Date.now());
    wx.setStorageSync('studyPlanAppLogs', logs.slice(0, 20));
  },

  globalData: {
    appName: '暑假学习计划助手',
    apiBaseUrl: 'http://127.0.0.1:5000',
    basicOptions: null,
    basicOptionsError: false
  }
});
