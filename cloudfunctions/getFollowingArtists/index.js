// cloudfunctions/getFollowingArtists/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return {
      code: -1,
      message: '未登录'
    };
  }

  try {
    // 获取用户关注的艺人列表
    const userResult = await db.collection('users')
      .where({ _id: OPENID })
      .get();

    if (userResult.data.length === 0) {
      return {
        code: 0,
        data: []
      };
    }

    const followArtists = userResult.data[0].followArtists || [];

    if (followArtists.length === 0) {
      return {
        code: 0,
        data: []
      };
    }

    // 获取艺人信息
    const artistsResult = await db.collection('artists')
      .where({
        _id: _.in(followArtists)
      })
      .get();

    return {
      code: 0,
      data: artistsResult.data
    };
  } catch (err) {
    console.error('getFollowingArtists error:', err);
    return {
      code: -1,
      message: err.message || '获取关注列表失败'
    };
  }
};
