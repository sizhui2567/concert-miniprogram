// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID, UNIONID } = cloud.getWXContext();

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
          unionId: UNIONID || '',
          subscriptions: [],
          followArtists: [],
          createTime: new Date()
        }
      });
    }

    // 检查是否是管理员
    const adminResult = await db.collection('admins')
      .where({ openid: OPENID })
      .get();

    const isAdmin = adminResult.data.length > 0;

    return {
      code: 0,
      data: {
        openid: OPENID,
        unionid: UNIONID,
        isAdmin: isAdmin
      }
    };
  } catch (err) {
    console.error('login error:', err);
    return {
      code: -1,
      message: err.message || '登录失败'
    };
  }
};
