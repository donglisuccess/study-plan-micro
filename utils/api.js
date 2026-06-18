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
      timeout: 8000,
      success(response) {
        const payload = response.data || {};
        if (response.statusCode >= 200 && response.statusCode < 300 && payload.code === 0) {
          resolve(payload.data);
          return;
        }
        reject(new Error(payload.message || '接口请求失败'));
      },
      fail(error) {
        reject(error);
      }
    });
  });
}

function getBasicOptions() {
  return request({
    path: '/api/basic-options'
  });
}

module.exports = {
  getBasicOptions
};
