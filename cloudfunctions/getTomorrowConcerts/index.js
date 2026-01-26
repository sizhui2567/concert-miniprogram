// cloudfunctions/getTomorrowConcerts/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  try {
    // 计算明天的日期范围
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0)).toISOString();
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999)).toISOString();

    // 查询明天开售的演唱会
    // 这里需要根据platforms中的openTime来筛选
    const result = await db.collection('concerts')
      .where(_.or([
        { status: 'published' },
        { status: _.exists(false) }
      ]))
      .orderBy('updateTime', 'desc')
      .limit(100)
      .get();

    // 过滤出明天开售的演唱会
    const tomorrowConcerts = result.data.filter(concert => {
      if (!concert.platforms) return false;

      for (const platform of Object.values(concert.platforms)) {
        if (platform.openTime) {
          const openDate = new Date(platform.openTime);
          const openDateStr = openDate.toISOString().split('T')[0];
          const tomorrowStr = new Date(tomorrow).toISOString().split('T')[0];

          if (openDateStr === tomorrowStr) {
            return true;
          }
        }
      }
      return false;
    });

    // 检查用户订阅状态
    if (OPENID && tomorrowConcerts.length > 0) {
      const userResult = await db.collection('users')
        .where({ _id: OPENID })
        .get();

      if (userResult.data.length > 0) {
        const subscriptions = userResult.data[0].subscriptions || [];
        tomorrowConcerts.forEach(concert => {
          concert.subscribed = subscriptions.includes(concert._id);
        });
      }
    }

    return {
      code: 0,
      data: tomorrowConcerts
    };
  } catch (err) {
    console.error('getTomorrowConcerts error:', err);
    return {
      code: -1,
      message: err.message || '获取失败'
    };
  }
};
