// cloudfunctions/saveConcert/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event) => {
  const { concertData, isDraft = false } = event;
  const { OPENID } = cloud.getWXContext();

  if (!concertData) {
    return {
      code: -1,
      message: '缺少演唱会数据'
    };
  }

  try {
    const adminResult = await db.collection('admins').where({ openid: OPENID }).get();
    if (adminResult.data.length === 0) {
      return {
        code: -1,
        message: '无权限操作'
      };
    }

    const now = new Date();
    const isUpdate = !!concertData._id;

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
      seatMapSourceImage: concertData.seatMapSourceImage || '',
      seatMapConfig: concertData.seatMapConfig || {},
      seatMapQuality: concertData.seatMapQuality || null,
      seatMap: concertData.seatMap || null,
      status: isDraft ? 'draft' : 'published',
      verified: true,
      source: 'manual',
      lastEditor: OPENID,
      updateTime: now
    };

    if (isUpdate) {
      const concertId = concertData._id;
      const oldResult = await db.collection('concerts').doc(concertId).get();
      const oldStage = oldResult.data ? oldResult.data.stage : null;

      if (oldStage && oldStage !== saveData.stage) {
        const stageHistory = oldResult.data.stageHistory || [];
        stageHistory.push({
          stage: saveData.stage,
          time: now.toISOString()
        });
        saveData.stageHistory = stageHistory;
      }

      await db.collection('concerts').doc(concertId).update({ data: saveData });
      return {
        code: 0,
        data: { _id: concertId }
      };
    }

    saveData.createTime = now;
    saveData.subscribeCount = 0;
    saveData.stageHistory = [
      {
        stage: saveData.stage,
        time: now.toISOString()
      }
    ];

    const addResult = await db.collection('concerts').add({ data: saveData });
    return {
      code: 0,
      data: { _id: addResult._id }
    };
  } catch (err) {
    console.error('saveConcert error:', err);
    return {
      code: -1,
      message: err.message || '保存失败'
    };
  }
};
