// cloudfunctions/importConcerts/index.js
// 批量导入演唱会数据 - 支持从爬虫脚本或JSON文件导入
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 导入演唱会数据
 * @param {Array} concerts - 演唱会数组
 * @param {Object} options - 导入选项
 * @param {boolean} options.updateExisting - 是否更新已存在的数据
 * @param {string} options.source - 数据来源标识
 */
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const {
    concerts = [],
    options = {}
  } = event;

  const {
    updateExisting = true,
    source = 'crawler'
  } = options;

  // 验证管理员权限
  const adminResult = await db.collection('admins')
    .where({ openid: OPENID })
    .get();

  if (adminResult.data.length === 0) {
    return {
      code: -1,
      message: '无权限操作，请先登录管理后台'
    };
  }

  if (!Array.isArray(concerts) || concerts.length === 0) {
    return {
      code: -1,
      message: '请提供有效的演唱会数据数组'
    };
  }

  const results = {
    total: concerts.length,
    added: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  const now = new Date();

  for (const concert of concerts) {
    try {
      // 数据验证
      if (!concert.title || !concert.artist || !concert.city) {
        results.skipped++;
        results.errors.push({
          title: concert.title || '未知',
          error: '缺少必要字段(title/artist/city)'
        });
        continue;
      }

      // 查找是否已存在（根据标题+城市）
      const existing = await db.collection('concerts')
        .where({
          title: concert.title,
          city: concert.city
        })
        .get();

      // 标准化数据格式
      const concertData = {
        title: concert.title,
        artist: concert.artist,
        artistId: concert.artistId || '',
        city: concert.city,
        venue: concert.venue || '',
        province: concert.province || '',
        dates: concert.dates || [],
        stage: concert.stage || '网传',
        platforms: {
          damai: {
            available: concert.platforms?.damai?.available || false,
            url: concert.platforms?.damai?.url || '',
            openTime: concert.platforms?.damai?.openTime || ''
          },
          maoyan: {
            available: concert.platforms?.maoyan?.available || false,
            url: concert.platforms?.maoyan?.url || '',
            openTime: concert.platforms?.maoyan?.openTime || ''
          },
          douyin: {
            available: concert.platforms?.douyin?.available || false,
            url: concert.platforms?.douyin?.url || '',
            openTime: concert.platforms?.douyin?.openTime || ''
          },
          xiecheng: {
            available: concert.platforms?.xiecheng?.available || false,
            url: concert.platforms?.xiecheng?.url || '',
            openTime: concert.platforms?.xiecheng?.openTime || ''
          },
          piaoxingqiu: {
            available: concert.platforms?.piaoxingqiu?.available || false,
            url: concert.platforms?.piaoxingqiu?.url || '',
            openTime: concert.platforms?.piaoxingqiu?.openTime || ''
          }
        },
        priceRange: concert.priceRange || '',
        poster: concert.poster || '',
        source: source,
        verified: false, // 爬虫数据默认未审核
        updateTime: now
      };

      if (existing.data.length > 0) {
        // 已存在
        if (updateExisting) {
          // 更新数据
          const oldConcert = existing.data[0];

          // 检测阶段变化
          let stageHistory = oldConcert.stageHistory || [];
          if (oldConcert.stage !== concertData.stage) {
            stageHistory.push({
              stage: concertData.stage,
              time: now.toISOString()
            });
            concertData.stageHistory = stageHistory;
          }

          await db.collection('concerts').doc(oldConcert._id).update({
            data: concertData
          });
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        // 新增
        concertData.createTime = now;
        concertData.subscribeCount = 0;
        concertData.status = 'published';
        concertData.stageHistory = [{
          stage: concertData.stage,
          time: now.toISOString()
        }];

        await db.collection('concerts').add({
          data: concertData
        });
        results.added++;
      }
    } catch (err) {
      results.failed++;
      results.errors.push({
        title: concert.title || '未知',
        error: err.message
      });
    }
  }

  return {
    code: 0,
    message: `导入完成：新增${results.added}条，更新${results.updated}条，跳过${results.skipped}条，失败${results.failed}条`,
    data: results
  };
};
