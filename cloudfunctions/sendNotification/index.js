// cloudfunctions/sendNotification/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // 查找即将开售的演唱会（1小时内）
    const concerts = await db.collection('concerts')
      .where(_.or([
        { status: 'published' },
        { status: _.exists(false) }
      ]))
      .get();

    const notificationsToSend = [];

    for (const concert of concerts.data) {
      if (!concert.platforms) continue;

      for (const [platform, data] of Object.entries(concert.platforms)) {
        if (data.openTime) {
          const openTime = new Date(data.openTime);

          // 检查是否在未来1小时内开售
          if (openTime > now && openTime <= oneHourLater) {
            // 获取订阅该演唱会的用户
            const users = await db.collection('users')
              .where({
                subscriptions: concert._id
              })
              .get();

            for (const user of users.data) {
              // 检查是否已发送过通知
              const existingNotification = await db.collection('notifications')
                .where({
                  userId: user._id,
                  concertId: concert._id,
                  type: 'open_remind',
                  sent: true
                })
                .get();

              if (existingNotification.data.length === 0) {
                notificationsToSend.push({
                  userId: user._id,
                  concertId: concert._id,
                  concertTitle: concert.title,
                  openTime: data.openTime,
                  platform: platform
                });
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
            time2: { value: notification.openTime },
            thing3: { value: `即将在${notification.platform}开售` }
          }
        });

        // 记录通知
        await db.collection('notifications').add({
          data: {
            userId: notification.userId,
            concertId: notification.concertId,
            type: 'open_remind',
            content: `您关注的"${notification.concertTitle}"即将开售`,
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
            type: 'open_remind',
            content: `您关注的"${notification.concertTitle}"即将开售`,
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
