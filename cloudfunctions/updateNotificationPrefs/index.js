// cloudfunctions/updateNotificationPrefs/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

const DEFAULT_NOTIFICATION_PREFS = {
  onListed: false,
  oneDayBefore: false,
  customHoursEnabled: true,
  customHours: 1
};

const normalizeNotificationPrefs = (prefs = {}) => {
  const merged = { ...DEFAULT_NOTIFICATION_PREFS, ...prefs };
  let customHours = Number(merged.customHours);
  if (!Number.isFinite(customHours)) {
    customHours = DEFAULT_NOTIFICATION_PREFS.customHours;
  }
  customHours = Math.min(Math.max(Math.round(customHours), 1), 168);
  return {
    onListed: !!merged.onListed,
    oneDayBefore: !!merged.oneDayBefore,
    customHoursEnabled: !!merged.customHoursEnabled,
    customHours
  };
};

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return {
      code: -1,
      message: '未登录'
    };
  }

  try {
    const prefs = normalizeNotificationPrefs(event.prefs || {});
    const userDoc = await db.collection('users').doc(OPENID).get().catch(() => null);

    if (!userDoc || !userDoc.data) {
      await db.collection('users').add({
        data: {
          _id: OPENID,
          subscriptions: [],
          followArtists: [],
          notificationPrefs: prefs,
          createTime: new Date()
        }
      });
    } else {
      await db.collection('users').doc(OPENID).update({
        data: {
          notificationPrefs: prefs
        }
      });
    }

    return {
      code: 0,
      data: prefs
    };
  } catch (err) {
    console.error('updateNotificationPrefs error:', err);
    return {
      code: -1,
      message: err.message || '更新通知设置失败'
    };
  }
};
