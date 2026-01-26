// cloudfunctions/saveConcert/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event, context) => {
  const { concertData, isDraft = false } = event;
  const { OPENID } = cloud.getWXContext();

  if (!concertData) {
    return {
      code: -1,
      message: '缺少演唱会数据'
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

    const now = new Date();
    const isUpdate = !!concertData._id;

    // 构建保存的数据
    const saveData = {
      title: concertData.title || '',
      artist: concertData.artist || '',
      artistId: concertData.artistId || '',
      city: concertData.city || '',
      venue: concertData.venue || '',
      province: concertData.province || '',
      dates: concertData.dates || [],
      stage: concertData.stage || '网传',
      platforms: concertData.platforms || {},
      priceRange: concertData.priceRange || '',
      poster: concertData.poster || '',
      status: isDraft ? 'draft' : 'published',
      verified: true,
      source: 'manual',
      lastEditor: OPENID,
      updateTime: now
    };

    if (isUpdate) {
      // 更新现有演唱会
      const concertId = concertData._id;

      // 获取旧数据以检测阶段变化
      const oldResult = await db.collection('concerts').doc(concertId).get();
      const oldStage = oldResult.data ? oldResult.data.stage : null;

      // 如果阶段发生变化，添加到历史记录
      if (oldStage && oldStage !== saveData.stage) {
        const stageHistory = oldResult.data.stageHistory || [];
        stageHistory.push({
          stage: saveData.stage,
          time: now.toISOString()
        });
        saveData.stageHistory = stageHistory;
      }

      await db.collection('concerts').doc(concertId).update({
        data: saveData
      });

      return {
        code: 0,
        data: { _id: concertId }
      };
    } else {
      // 新增演唱会
      saveData.createTime = now;
      saveData.subscribeCount = 0;
      saveData.stageHistory = [{
        stage: saveData.stage,
        time: now.toISOString()
      }];

      const addResult = await db.collection('concerts').add({
        data: saveData
      });

      return {
        code: 0,
        data: { _id: addResult._id }
      };
    }
  } catch (err) {
    console.error('saveConcert error:', err);
    return {
      code: -1,
      message: err.message || '保存失败'
    };
  }
};
