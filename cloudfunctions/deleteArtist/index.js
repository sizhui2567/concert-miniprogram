// cloudfunctions/deleteArtist/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { artistId } = event;
  const { OPENID } = cloud.getWXContext();

  if (!artistId) {
    return {
      code: -1,
      message: '缺少艺人ID'
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

    // 删除艺人
    await db.collection('artists').doc(artistId).remove();

    return {
      code: 0,
      data: { success: true }
    };
  } catch (err) {
    console.error('deleteArtist error:', err);
    return {
      code: -1,
      message: err.message || '删除失败'
    };
  }
};
