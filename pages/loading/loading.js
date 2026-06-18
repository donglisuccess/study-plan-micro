const { getBasicOptions } = require('../../utils/api');

const MIN_LOADING_TIME = 900;
const MAX_LOADING_TIME = 4000;

Page({
  data: {
    progress: 12,
    statusText: '正在准备学习计划...'
  },

  onLoad(options) {
    this.targetQuery = this.buildTargetQuery(options);
    this.startedAt = Date.now();
    this.startProgress();
    this.preloadOptions();
  },

  onUnload() {
    this.clearTimers();
  },

  buildTargetQuery(options) {
    const query = Object.keys(options || {}).map((key) => {
      return key + '=' + encodeURIComponent(options[key] || '');
    }).join('&');
    return query ? '?' + query : '';
  },

  startProgress() {
    const stages = [
      { progress: 32, text: '正在读取可选信息...' },
      { progress: 58, text: '正在整理学习目标...' },
      { progress: 78, text: '马上就准备好了...' }
    ];
    let stageIndex = 0;

    this.progressTimer = setInterval(() => {
      if (stageIndex >= stages.length) {
        return;
      }
      this.setData(stages[stageIndex]);
      stageIndex += 1;
    }, 360);
  },

  preloadOptions() {
    const app = getApp();
    let finished = false;

    const finish = (optionData, failed) => {
      if (finished) {
        return;
      }
      finished = true;
      app.globalData.basicOptions = optionData || null;
      app.globalData.basicOptionsError = Boolean(failed);

      const elapsed = Date.now() - this.startedAt;
      const remaining = Math.max(0, MIN_LOADING_TIME - elapsed);

      clearInterval(this.progressTimer);
      clearTimeout(this.timeoutTimer);
      this.setData({
        progress: 100,
        statusText: failed ? '网络有点慢，先进入看看' : '准备完成'
      });

      this.enterHomeTimer = setTimeout(() => {
        wx.reLaunch({
          url: '/pages/index/index' + this.targetQuery
        });
      }, remaining + 180);
    };

    if (app.globalData.basicOptions) {
      finish(app.globalData.basicOptions, false);
      return;
    }

    getBasicOptions().then((data) => {
      finish(data, false);
    }).catch((error) => {
      console.error('[study-plan] preload basic options failed', error);
      finish(null, true);
    });

    this.timeoutTimer = setTimeout(() => {
      finish(null, true);
    }, MAX_LOADING_TIME);
  },

  clearTimers() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
    }
    if (this.enterHomeTimer) {
      clearTimeout(this.enterHomeTimer);
    }
  }
});
