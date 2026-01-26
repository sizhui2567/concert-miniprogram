// cloudfunctions/saveArtist/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { artistData } = event;
  const { OPENID } = cloud.getWXContext();

  if (!artistData) {
    return {
      code: -1,
      message: '缺少艺人数据'
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

    const isUpdate = !!artistData._id;

    const saveData = {
      name: artistData.name || '',
      alias: artistData.alias || [],
      avatar: artistData.avatar || '',
      updateTime: new Date()
    };

    if (isUpdate) {
      // 更新现有艺人
      await db.collection('artists').doc(artistData._id).update({
        data: saveData
      });

      return {
        code: 0,
        data: { _id: artistData._id }
      };
    } else {
      // 新增艺人
      saveData.createTime = new Date();
      saveData.followerCount = 0;

      const addResult = await db.collection('artists').add({
        data: saveData
      });

      return {
        code: 0,
        data: { _id: addResult._id }
      };
    }
  } catch (err) {
    console.error('saveArtist error:', err);
    return {
      code: -1,
      message: err.message || '保存失败'
    };
  }
};
