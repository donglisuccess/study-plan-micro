function getApiBaseUrl() {
  const app = getApp();
  return app.globalData.apiBaseUrl;
}

function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: getApiBaseUrl() + options.path,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json'
      },
      timeout: options.timeout || 8000,
      success(response) {
        const payload = response.data || {};
        if (response.statusCode >= 200 && response.statusCode < 300 && payload.code === 0) {
          resolve(payload.data);
          return;
        }
        reject(new Error(payload.message || '接口请求失败'));
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络连接失败'));
      }
    });
  });
}

function getBasicOptions() {
  return request({
    path: '/api/basic-options'
  });
}

function generateStudyPlan(options) {
  return request({
    path: '/api/study-plans/generate',
    method: 'POST',
    data: options,
    timeout: 15000
  });
}

function submitPlanFeedback(feedback) {
  return request({
    path: '/api/study-plans/feedback',
    method: 'POST',
    data: feedback
  });
}

module.exports = {
  getBasicOptions,
  generateStudyPlan,
  submitPlanFeedback
};
