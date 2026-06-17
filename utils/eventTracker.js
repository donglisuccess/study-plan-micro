function pad(number) {
  return number < 10 ? '0' + number : String(number);
}

function formatDate(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join(':');
}

function getEventList() {
  try {
    return wx.getStorageSync('studyPlanEvents') || [];
  } catch (error) {
    return [];
  }
}

function trackEvent(eventName, eventData) {
  const event = {
    eventName,
    eventData: eventData || {},
    createdAt: formatDate(new Date())
  };

  console.log('[study-plan-event]', event);

  try {
    const events = getEventList();
    events.push(event);
    wx.setStorageSync('studyPlanEvents', events.slice(-200));
  } catch (error) {
    console.warn('[study-plan-event] save failed', error);
  }
}

module.exports = {
  trackEvent
};
