// cloudfunctions/subscribe/index.js
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

exports.main = async (event, context) => {
  const { concertId, subscribe = true } = event;
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return {
      code: -1,
      message: '未登录'
    };
  }

  if (!concertId) {
    return {
      code: -1,
      message: '缺少演唱会ID'
    };
  }

  try {
    // 检查用户是否存在
    const userResult = await db.collection('users')
      .where({ _id: OPENID })
      .get();

    if (userResult.data.length === 0) {
      // 创建新用户
      await db.collection('users').add({
        data: {
          _id: OPENID,
          subscriptions: subscribe ? [concertId] : [],
          followArtists: [],
          notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
          createTime: new Date()
        }
      });
    } else {
      // 更新订阅列表
      if (subscribe) {
        await db.collection('users')
          .where({ _id: OPENID })
          .update({
            data: {
              subscriptions: _.addToSet(concertId)
            }
          });
      } else {
        await db.collection('users')
          .where({ _id: OPENID })
          .update({
            data: {
              subscriptions: _.pull(concertId)
            }
          });
      }

      if (!userResult.data[0].notificationPrefs) {
        await db.collection('users')
          .where({ _id: OPENID })
          .update({
            data: {
              notificationPrefs: DEFAULT_NOTIFICATION_PREFS
            }
          });
      }
    }

    // 更新演唱会订阅数
    const increment = subscribe ? 1 : -1;
    await db.collection('concerts')
      .doc(concertId)
      .update({
        data: {
          subscribeCount: _.inc(increment)
        }
      });

    return {
      code: 0,
      data: {
        subscribed: subscribe
      }
    };
  } catch (err) {
    console.error('subscribe error:', err);
    return {
      code: -1,
      message: err.message || '操作失败'
    };
  }
};
