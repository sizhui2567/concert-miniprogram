// cloudfunctions/sendNotification/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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

const isWithinRange = (target, start, end) => {
  return target > start && target <= end;
};

const getListedStageTime = (concert) => {
  if (concert.stage !== '上架') return null;
  if (Array.isArray(concert.stageHistory)) {
    const listedItems = concert.stageHistory.filter(item => item.stage === '上架' && item.time);
    if (listedItems.length > 0) {
      const latest = listedItems[listedItems.length - 1];
      const time = new Date(latest.time);
      if (!Number.isNaN(time.getTime())) return time;
    }
  }
  if (concert.updateTime) {
    const time = new Date(concert.updateTime);
    if (!Number.isNaN(time.getTime())) return time;
  }
  return null;
};

exports.main = async (event, context) => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // 查找可通知的演唱会
    const concerts = await db.collection('concerts')
      .where(_.or([
        { status: 'published' },
        { status: _.exists(false) }
      ]))
      .get();

    const notificationsToSend = [];
    const notifiedCache = new Set();

    const hasSentNotification = async (userId, concertId, type) => {
      const key = `${userId}|${concertId}|${type}`;
      if (notifiedCache.has(key)) {
        return true;
      }
      const existingNotification = await db.collection('notifications')
        .where({
          userId,
          concertId,
          type,
          sent: true
        })
        .get();
      if (existingNotification.data.length > 0) {
        notifiedCache.add(key);
        return true;
      }
      return false;
    };

    for (const concert of concerts.data) {
      const listedTime = getListedStageTime(concert);
      const shouldNotifyListed = listedTime && isWithinRange(listedTime, oneHourAgo, now);
      const hasPlatforms = concert.platforms && Object.keys(concert.platforms).length > 0;

      if (!shouldNotifyListed && !hasPlatforms) continue;

      const users = await db.collection('users')
        .where({
          subscriptions: concert._id
        })
        .get();

      if (!users.data || users.data.length === 0) continue;

      for (const user of users.data) {
        const prefs = normalizeNotificationPrefs(user.notificationPrefs);

        if (prefs.onListed && shouldNotifyListed) {
          const type = 'stage_listed';
          if (!(await hasSentNotification(user._id, concert._id, type))) {
            notificationsToSend.push({
              userId: user._id,
              concertId: concert._id,
              concertTitle: concert.title,
              timeValue: listedTime.toISOString(),
              platform: '',
              type,
              summary: '已上架提醒',
              content: `您关注的"${concert.title}"已上架`
            });
            notifiedCache.add(`${user._id}|${concert._id}|${type}`);
          }
        }

        if (!hasPlatforms) continue;

        for (const [platform, data] of Object.entries(concert.platforms)) {
          if (!data.openTime) continue;
          const openTime = new Date(data.openTime);
          if (Number.isNaN(openTime.getTime())) continue;

          if (prefs.oneDayBefore) {
            const oneDayTarget = new Date(openTime.getTime() - 24 * 60 * 60 * 1000);
            if (isWithinRange(oneDayTarget, now, oneHourLater)) {
              const type = 'open_remind_day';
              if (!(await hasSentNotification(user._id, concert._id, type))) {
                notificationsToSend.push({
                  userId: user._id,
                  concertId: concert._id,
                  concertTitle: concert.title,
                  timeValue: data.openTime,
                  platform,
                  type,
                  summary: '提前一天提醒',
                  content: `您关注的"${concert.title}"将在${platform}开售（提前一天提醒）`
                });
                notifiedCache.add(`${user._id}|${concert._id}|${type}`);
              }
            }
          }

          if (prefs.customHoursEnabled) {
            const offsetHours = prefs.customHours;
            const customTarget = new Date(openTime.getTime() - offsetHours * 60 * 60 * 1000);
            if (isWithinRange(customTarget, now, oneHourLater)) {
              const type = 'open_remind_custom';
              if (!(await hasSentNotification(user._id, concert._id, type))) {
                notificationsToSend.push({
                  userId: user._id,
                  concertId: concert._id,
                  concertTitle: concert.title,
                  timeValue: data.openTime,
                  platform,
                  type,
                  hours: offsetHours,
                  summary: `提前${offsetHours}小时提醒`,
                  content: `您关注的"${concert.title}"将在${platform}开售（提前${offsetHours}小时提醒）`
                });
                notifiedCache.add(`${user._id}|${concert._id}|${type}`);
              }
            }
          }
        }
      }
    }

    // 发送通知
    let sentCount = 0;
    for (const notification of notificationsToSend) {
      try {
        // 发送订阅消息
        await cloud.openapi.subscribeMessage.send({
          touser: notification.userId,
          templateId: 'your-template-id', // 替换为实际模板ID
          page: `/pages/detail/detail?id=${notification.concertId}`,
          data: {
            thing1: { value: notification.concertTitle.substring(0, 20) },
            time2: { value: notification.timeValue },
            thing3: { value: notification.summary.substring(0, 20) }
          }
        });

        // 记录通知
        await db.collection('notifications').add({
          data: {
            userId: notification.userId,
            concertId: notification.concertId,
            type: notification.type,
            content: notification.content,
            platform: notification.platform,
            hours: notification.hours || 0,
            sent: true,
            sendTime: now
          }
        });

        sentCount++;
      } catch (err) {
        console.error('Send notification error:', err);
        // 记录失败的通知
        await db.collection('notifications').add({
          data: {
            userId: notification.userId,
            concertId: notification.concertId,
            type: notification.type,
            content: notification.content,
            platform: notification.platform,
            hours: notification.hours || 0,
            sent: false,
            error: err.message,
            sendTime: now
          }
        });
      }
    }

    return {
      code: 0,
      data: {
        total: notificationsToSend.length,
        sent: sentCount
      }
    };
  } catch (err) {
    console.error('sendNotification error:', err);
    return {
      code: -1,
      message: err.message || '发送通知失败'
    };
  }
};
