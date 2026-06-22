const LEGACY_HISTORY_KEY = 'studyPlanHistory';
const HISTORY_INDEX_KEY = 'studyPlanHistoryIds';
const LATEST_KEY = 'latestStudyPlan';
const ACTIVE_KEY = 'activeStudyPlan';
const PLAN_KEY_PREFIX = 'studyPlan_';
const MAX_HISTORY_COUNT = 30;

function completionKey(planId) {
  return 'planCompleted_' + planId;
}

function normalizeHistory(history) {
  return (Array.isArray(history) ? history : [])
    .filter((plan) => plan && plan.id)
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt || left.savedAt || 0).getTime();
      const rightTime = new Date(right.createdAt || right.savedAt || 0).getTime();
      return rightTime - leftTime;
    });
}

function planStorageKey(planId) {
  return PLAN_KEY_PREFIX + planId;
}

function planIdentityKey(plan) {
  if (!plan) {
    return '';
  }
  const grade = String(plan.grade || '').trim();
  const subject = String(plan.subject || '').trim();
  return grade && subject ? grade + '::' + subject : '';
}

function deduplicateHistory(plans) {
  const seenIds = {};
  const seenIdentities = {};
  return normalizeHistory(plans).filter((plan) => {
    const identity = planIdentityKey(plan);
    if (seenIds[plan.id] || (identity && seenIdentities[identity])) {
      return false;
    }

    seenIds[plan.id] = true;
    if (identity) {
      seenIdentities[identity] = true;
    }
    return true;
  });
}

function writeHistory(plans) {
  const nextPlans = deduplicateHistory(plans).slice(0, MAX_HISTORY_COUNT);
  const nextIds = nextPlans.map((plan) => plan.id);
  const previousIds = wx.getStorageSync(HISTORY_INDEX_KEY) || [];

  nextPlans.forEach((plan) => {
    wx.setStorageSync(planStorageKey(plan.id), plan);
  });
  wx.setStorageSync(HISTORY_INDEX_KEY, nextIds);

  previousIds.forEach((planId) => {
    if (nextIds.indexOf(planId) === -1 && wx.removeStorageSync) {
      wx.removeStorageSync(planStorageKey(planId));
      wx.removeStorageSync(completionKey(planId));
    }
  });

  return nextPlans;
}

function getPlanHistory() {
  const storedIds = wx.getStorageSync(HISTORY_INDEX_KEY);
  if (Array.isArray(storedIds)) {
    if (!storedIds.length) {
      return [];
    }

    const storedPlans = normalizeHistory(
      storedIds.map((planId) => wx.getStorageSync(planStorageKey(planId)))
    );
    if (storedPlans.length) {
      const uniquePlans = deduplicateHistory(storedPlans).slice(0, MAX_HISTORY_COUNT);
      const needsCleanup = uniquePlans.length !== storedIds.length
        || uniquePlans.some((plan, index) => plan.id !== storedIds[index]);

      return needsCleanup ? writeHistory(storedPlans) : uniquePlans;
    }
  }

  const storedHistory = normalizeHistory(wx.getStorageSync(LEGACY_HISTORY_KEY));
  const latestPlan = wx.getStorageSync(LATEST_KEY);
  const migrationPlans = storedHistory.slice();

  if (latestPlan && latestPlan.id && !migrationPlans.some((plan) => plan.id === latestPlan.id)) {
    migrationPlans.unshift(Object.assign({}, latestPlan, {
      savedAt: latestPlan.savedAt || new Date().toISOString()
    }));
  }

  if (!migrationPlans.length) {
    return [];
  }

  return writeHistory(migrationPlans);
}

function savePlan(plan) {
  if (!plan || !plan.id) {
    return [];
  }

  const savedPlan = Object.assign({}, plan, {
    savedAt: plan.savedAt || new Date().toISOString()
  });
  const savedIdentity = planIdentityKey(savedPlan);
  const history = getPlanHistory().filter((item) => {
    return item.id !== savedPlan.id
      && (!savedIdentity || planIdentityKey(item) !== savedIdentity);
  });
  const nextHistory = writeHistory([savedPlan].concat(history));

  wx.setStorageSync(LATEST_KEY, savedPlan);
  wx.setStorageSync(ACTIVE_KEY, savedPlan);
  return nextHistory;
}

function removePlan(planId) {
  if (!planId) {
    return getPlanHistory();
  }

  const nextHistory = writeHistory(
    getPlanHistory().filter((plan) => plan.id !== planId)
  );
  const legacyHistory = wx.getStorageSync(LEGACY_HISTORY_KEY);

  if (Array.isArray(legacyHistory)) {
    wx.setStorageSync(
      LEGACY_HISTORY_KEY,
      legacyHistory.filter((plan) => plan && plan.id !== planId)
    );
  }

  if (wx.removeStorageSync) {
    wx.removeStorageSync(planStorageKey(planId));
    wx.removeStorageSync(completionKey(planId));
  }

  const latestPlan = wx.getStorageSync(LATEST_KEY);
  if (!latestPlan || latestPlan.id === planId) {
    if (nextHistory.length) {
      wx.setStorageSync(LATEST_KEY, nextHistory[0]);
    } else if (wx.removeStorageSync) {
      wx.removeStorageSync(LATEST_KEY);
    }
  }

  const activePlan = wx.getStorageSync(ACTIVE_KEY);
  if (!activePlan || activePlan.id === planId) {
    if (nextHistory.length) {
      wx.setStorageSync(ACTIVE_KEY, nextHistory[0]);
    } else if (wx.removeStorageSync) {
      wx.removeStorageSync(ACTIVE_KEY);
    }
  }

  return nextHistory;
}

function getLatestPlan() {
  const latestPlan = wx.getStorageSync(LATEST_KEY);
  const history = getPlanHistory();
  if (latestPlan && latestPlan.id && history.some((plan) => plan.id === latestPlan.id)) {
    return latestPlan;
  }
  return history.length ? history[0] : null;
}

function getPlanById(planId) {
  if (!planId) {
    return null;
  }
  const storedPlan = wx.getStorageSync(planStorageKey(planId));
  if (storedPlan && storedPlan.id) {
    return storedPlan;
  }
  return getPlanHistory().find((plan) => plan.id === planId) || null;
}

function setActivePlan(plan) {
  if (plan && plan.id) {
    wx.setStorageSync(ACTIVE_KEY, plan);
  }
}

function getActivePlan() {
  const activePlan = wx.getStorageSync(ACTIVE_KEY);
  if (activePlan && activePlan.id) {
    return activePlan;
  }
  return getLatestPlan();
}

function getCompletedMap(planId) {
  return wx.getStorageSync(completionKey(planId)) || {};
}

function saveCompletedMap(planId, completedMap) {
  wx.setStorageSync(completionKey(planId), completedMap || {});
}

function getPlanProgress(plan) {
  if (!plan || !plan.id) {
    return {
      completedCount: 0,
      progressPercent: 0,
      allCompleted: false,
      nextTask: null
    };
  }

  const items = Array.isArray(plan.items) ? plan.items : [];
  const completedMap = getCompletedMap(plan.id);
  const completedCount = items.filter((item) => Boolean(completedMap[item.day])).length;
  const totalDays = Number(plan.days) || items.length;

  return {
    completedCount,
    progressPercent: totalDays
      ? Math.round(completedCount / totalDays * 100)
      : 0,
    allCompleted: totalDays > 0 && completedCount === totalDays,
    nextTask: items.find((item) => !completedMap[item.day]) || null
  };
}

module.exports = {
  completionKey,
  getPlanHistory,
  savePlan,
  removePlan,
  getLatestPlan,
  getPlanById,
  setActivePlan,
  getActivePlan,
  getCompletedMap,
  saveCompletedMap,
  getPlanProgress
};
