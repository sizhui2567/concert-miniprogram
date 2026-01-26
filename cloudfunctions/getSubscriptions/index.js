// cloudfunctions/getSubscriptions/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { page = 1, pageSize = 10 } = event;
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return {
      code: -1,
      message: '未登录'
    };
  }

  try {
    // 获取用户订阅列表
    const userResult = await db.collection('users')
      .where({ _id: OPENID })
      .get();

    if (userResult.data.length === 0) {
      return {
        code: 0,
        data: {
          list: [],
          total: 0,
          page: page,
          pageSize: pageSize
        }
      };
    }

    const subscriptions = userResult.data[0].subscriptions || [];

    if (subscriptions.length === 0) {
      return {
        code: 0,
        data: {
          list: [],
          total: 0,
          page: page,
          pageSize: pageSize
        }
      };
    }

    // 分页获取订阅的演唱会
    const skip = (page - 1) * pageSize;
    const paginatedIds = subscriptions.slice(skip, skip + pageSize);

    const concertsResult = await db.collection('concerts')
      .where({
        _id: _.in(paginatedIds)
      })
      .get();

    // 标记为已订阅
    const concerts = concertsResult.data.map(concert => ({
      ...concert,
      subscribed: true
    }));

    return {
      code: 0,
      data: {
        list: concerts,
        total: subscriptions.length,
        page: page,
        pageSize: pageSize
      }
    };
  } catch (err) {
    console.error('getSubscriptions error:', err);
    return {
      code: -1,
      message: err.message || '获取订阅列表失败'
    };
  }
};
