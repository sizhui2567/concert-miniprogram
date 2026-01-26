// cloudfunctions/getConcertDetail/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { concertId } = event;
  const { OPENID } = cloud.getWXContext();

  if (!concertId) {
    return {
      code: -1,
      message: '缺少演唱会ID'
    };
  }

  try {
    // 获取演唱会详情
    const concertResult = await db.collection('concerts')
      .doc(concertId)
      .get();

    if (!concertResult.data) {
      return {
        code: -1,
        message: '演唱会不存在'
      };
    }

    const concert = concertResult.data;

    // 检查用户是否订阅
    if (OPENID) {
      const userResult = await db.collection('users')
        .where({ _id: OPENID })
        .get();

      if (userResult.data.length > 0) {
        const user = userResult.data[0];
        concert.subscribed = (user.subscriptions || []).includes(concertId);
      }
    }

    return {
      code: 0,
      data: concert
    };
  } catch (err) {
    console.error('getConcertDetail error:', err);
    return {
      code: -1,
      message: err.message || '获取详情失败'
    };
  }
};
