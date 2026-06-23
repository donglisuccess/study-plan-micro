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

const CANVAS_WIDTH = 690;
const CANVAS_HEIGHT = 1220;

function drawRoundRect(context, x, y, width, height, radius, fillStyle) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
  context.setFillStyle(fillStyle);
  context.fill();
}

function truncateText(context, text, maxWidth) {
  const value = String(text || '');
  if (context.measureText(value).width <= maxWidth) {
    return value;
  }

  let result = value;
  while (result.length && context.measureText(result + '…').width > maxWidth) {
    result = result.slice(0, -1);
  }
  return result + '…';
}

function getTextLines(context, text, maxWidth, maxLines) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  const lines = [];
  let currentLine = '';

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const testLine = currentLine + character;
    if (currentLine && context.measureText(testLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = character;
      if (lines.length === maxLines) {
        break;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === maxLines) {
    lines[maxLines - 1] = truncateText(context, lines[maxLines - 1], maxWidth);
  }

  return lines;
}

function drawTextLines(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const lines = getTextLines(context, text, maxWidth, maxLines);
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
  return lines.length;
}

Page({
  data: {
    plan: null,
    isSaving: false,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT
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
    if (!this.data.plan || this.data.isSaving) {
      return;
    }

    this.setData({
      isSaving: true
    });

    wx.showLoading({
      title: '正在生成海报',
      mask: true
    });

    this.createPosterImage()
      .then((filePath) => this.savePosterToAlbum(filePath))
      .then(() => {
        trackEvent('save_poster', {
          planId: this.data.plan.id,
          source: 'poster_save_button'
        });
        wx.showToast({
          title: '海报已保存到相册',
          icon: 'success'
        });
      })
      .catch((error) => {
        if (error && error.isPermissionDenied) {
          this.showAlbumPermissionGuide();
          return;
        }

        wx.showToast({
          title: '保存失败，请稍后重试',
          icon: 'none'
        });
      })
      .finally(() => {
        wx.hideLoading();
        this.setData({
          isSaving: false
        });
      });
  },

  createPosterImage() {
    return new Promise((resolve, reject) => {
      try {
        this.drawPosterCanvas();
      } catch (error) {
        reject(error);
        return;
      }

      setTimeout(() => {
        wx.canvasToTempFilePath({
          canvasId: 'posterCanvas',
          x: 0,
          y: 0,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          destWidth: CANVAS_WIDTH * 2,
          destHeight: CANVAS_HEIGHT * 2,
          fileType: 'png',
          quality: 1,
          success: (result) => resolve(result.tempFilePath),
          fail: reject
        }, this);
      }, 180);
    });
  },

  drawPosterCanvas() {
    const plan = this.data.plan;
    const context = wx.createCanvasContext('posterCanvas', this);
    const width = CANVAS_WIDTH;

    context.setFillStyle('#f5f7fb');
    context.fillRect(0, 0, width, CANVAS_HEIGHT);

    const coverGradient = context.createLinearGradient(0, 0, width, 470);
    coverGradient.addColorStop(0, '#2f6fe4');
    coverGradient.addColorStop(0.72, '#4d91f5');
    coverGradient.addColorStop(1, '#66a6f5');
    context.setFillStyle(coverGradient);
    context.fillRect(0, 0, width, 470);

    context.setFillStyle('rgba(255, 255, 255, 0.08)');
    context.beginPath();
    context.arc(620, 20, 180, 0, Math.PI * 2);
    context.fill();

    context.setStrokeStyle('rgba(255, 255, 255, 0.88)');
    context.setLineWidth(3);
    drawRoundRect(context, 42, 40, 32, 32, 8, 'rgba(255, 255, 255, 0.06)');
    context.strokeRect(50, 49, 16, 3);
    context.strokeRect(50, 59, 16, 3);
    context.setFillStyle('rgba(255, 255, 255, 0.94)');
    context.setFontSize(20);
    context.fillText('暑假学习计划助手', 88, 64);

    context.setFontSize(20);
    const subject = truncateText(context, plan.subject, 112);
    const subjectWidth = Math.max(78, context.measureText(subject).width + 30);
    drawRoundRect(
      context,
      width - subjectWidth - 40,
      40,
      subjectWidth,
      36,
      18,
      'rgba(255, 255, 255, 0.16)'
    );
    context.setFillStyle('#ffffff');
    context.setTextAlign('center');
    context.fillText(subject, width - subjectWidth / 2 - 40, 65);
    context.setTextAlign('left');

    drawRoundRect(context, 42, 126, 184, 34, 7, 'rgba(18, 64, 146, 0.2)');
    context.setFillStyle('#dfeeff');
    context.setFontSize(19);
    context.fillText(truncateText(context, plan.grade + '专属成长计划', 158), 56, 149);

    context.setFillStyle('#ffffff');
    context.setFontSize(44);
    context.fillText('这个暑假，', 42, 218);
    context.setFontSize(49);
    context.fillText(truncateText(context, '把' + plan.subject + '学扎实', 600), 42, 280);

    context.setFillStyle('rgba(255, 255, 255, 0.8)');
    context.setFontSize(22);
    drawTextLines(
      context,
      '一份围绕“' + plan.goal + '”制定的学习安排',
      42,
      326,
      590,
      32,
      2
    );

    drawRoundRect(context, 42, 382, 350, 62, 16, 'rgba(255, 255, 255, 0.15)');
    context.setFillStyle('#ffffff');
    context.setFontSize(38);
    context.fillText(String(plan.days), 62, 425);
    context.setFontSize(18);
    context.fillText('天', 110, 423);
    context.setFillStyle('rgba(255, 255, 255, 0.7)');
    context.setFontSize(16);
    context.fillText('计划周期', 165, 405);
    context.setFillStyle('#ffffff');
    context.setFontSize(20);
    context.fillText(truncateText(context, '每天 ' + plan.dailyTime, 190), 165, 430);

    context.setFillStyle('#ffffff');
    context.fillRect(0, 470, width, CANVAS_HEIGHT - 470);

    drawRoundRect(context, 36, 505, width - 72, 128, 20, '#f3f7ff');
    context.setFillStyle('#3a78f2');
    drawRoundRect(context, 58, 537, 8, 64, 4, '#3a78f2');
    context.setFillStyle('#8b97a5');
    context.setFontSize(18);
    context.fillText('我的暑假目标', 86, 548);
    context.setFillStyle('#293b52');
    context.setFontSize(30);
    drawTextLines(context, plan.goal, 86, 588, 520, 38, 2);

    const profileItems = [
      { label: '年级', value: plan.grade },
      { label: '科目', value: plan.subject },
      { label: '当前基础', value: plan.level }
    ];
    profileItems.forEach((item, index) => {
      const centerX = 115 + index * 230;
      context.setTextAlign('center');
      context.setFillStyle('#999999');
      context.setFontSize(18);
      context.fillText(item.label, centerX, 684);
      context.setFillStyle('#333333');
      context.setFontSize(23);
      context.fillText(truncateText(context, item.value, 175), centerX, 718);
      if (index < 2) {
        context.setFillStyle('#e8ebef');
        context.fillRect(229 + index * 230, 664, 1, 60);
      }
    });
    context.setTextAlign('left');

    drawRoundRect(context, 36, 758, width - 72, 245, 20, '#ffffff');
    context.setStrokeStyle('#e7ebf0');
    context.setLineWidth(1);
    context.strokeRect(37, 759, width - 74, 243);
    context.setFillStyle('#8b97a5');
    context.setFontSize(18);
    context.fillText('重点学习内容', 62, 798);
    context.setFillStyle('#333333');
    context.setFontSize(28);
    context.fillText('这个暑假，认真做好这些事', 62, 840);
    context.setFillStyle('#edf0f4');
    context.fillRect(62, 866, width - 124, 1);
    context.setFillStyle('#5d6875');
    context.setFontSize(23);
    drawTextLines(context, plan.focus, 62, 904, width - 124, 34, 3);

    context.setFillStyle('#3a78f2');
    context.setFontSize(42);
    context.fillText('“', 43, 1057);
    context.setFillStyle('#747f8c');
    context.setFontSize(21);
    context.fillText('不追求一天改变很多，只认真完成计划里的每一天。', 80, 1050);

    context.setStrokeStyle('#dfe3e8');
    context.setLineWidth(1);
    context.setLineDash([7, 7], 0);
    context.beginPath();
    context.moveTo(36, 1090);
    context.lineTo(width - 36, 1090);
    context.stroke();
    context.setLineDash([], 0);

    drawRoundRect(context, 42, 1123, 48, 48, 13, '#3a78f2');
    context.setFillStyle('#ffffff');
    context.setFontSize(22);
    context.setTextAlign('center');
    context.fillText('学', 66, 1155);
    context.setTextAlign('left');
    context.setFillStyle('#3f4b59');
    context.setFontSize(20);
    context.fillText('暑假学习计划助手', 104, 1143);
    context.setFillStyle('#a0a7af');
    context.setFontSize(16);
    context.fillText('科学规划，让成长清晰可见', 104, 1168);

    drawRoundRect(context, 548, 1130, 100, 34, 17, '#f0f4fa');
    context.setFillStyle('#7d8997');
    context.setFontSize(17);
    context.setTextAlign('center');
    context.fillText('专属计划', 598, 1153);
    context.setTextAlign('left');

    context.draw(false);
  },

  savePosterToAlbum(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: resolve,
        fail: (error) => {
          const message = error && error.errMsg ? error.errMsg : '';
          const isPermissionDenied = /auth deny|auth denied|authorize no response/i.test(message);
          reject(Object.assign({}, error, {
            isPermissionDenied
          }));
        }
      });
    });
  },

  showAlbumPermissionGuide() {
    wx.showModal({
      title: '需要相册权限',
      content: '请在设置中允许“保存到相册”，开启后即可保存海报。',
      confirmText: '去设置',
      confirmColor: '#3a78f2',
      success: (result) => {
        if (!result.confirm) {
          return;
        }
        wx.openSetting();
      }
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
