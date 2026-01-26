// cloudfunctions/deleteConcert/index.js
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
    // 验证管理员权限
    const adminResult = await db.collection('admins')
      .where({ openid: OPENID })
      .get();

    if (adminResult.data.length === 0) {
      return {
        code: -1,
        message: '无权限操作'
      };
    }

    // 删除演唱会
    await db.collection('concerts').doc(concertId).remove();

    return {
      code: 0,
      data: { success: true }
    };
  } catch (err) {
    console.error('deleteConcert error:', err);
    return {
      code: -1,
      message: err.message || '删除失败'
    };
  }
};
