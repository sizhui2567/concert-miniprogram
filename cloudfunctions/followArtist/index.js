// cloudfunctions/followArtist/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { artistId, follow = true } = event;
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return {
      code: -1,
      message: '未登录'
    };
  }

  if (!artistId) {
    return {
      code: -1,
      message: '缺少艺人ID'
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
          subscriptions: [],
          followArtists: follow ? [artistId] : [],
          createTime: new Date()
        }
      });
    } else {
      // 更新关注列表
      if (follow) {
        await db.collection('users')
          .where({ _id: OPENID })
          .update({
            data: {
              followArtists: _.addToSet(artistId)
            }
          });
      } else {
        await db.collection('users')
          .where({ _id: OPENID })
          .update({
            data: {
              followArtists: _.pull(artistId)
            }
          });
      }
    }

    // 更新艺人关注数
    const increment = follow ? 1 : -1;
    await db.collection('artists')
      .doc(artistId)
      .update({
        data: {
          followerCount: _.inc(increment)
        }
      });

    return {
      code: 0,
      data: {
        followed: follow
      }
    };
  } catch (err) {
    console.error('followArtist error:', err);
    return {
      code: -1,
      message: err.message || '操作失败'
    };
  }
};
