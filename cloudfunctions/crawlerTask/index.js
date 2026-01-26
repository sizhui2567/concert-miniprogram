// cloudfunctions/crawlerTask/index.js
// 爬虫定时任务 - 定时抓取各平台演唱会数据
// 注意：实际使用时需要根据各平台的接口进行调整

const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 模拟爬虫函数（实际使用时需要实现具体的爬取逻辑）
async function crawlDamai() {
  // 这里应该实现大麦网的爬取逻辑
  // 由于大麦有反爬机制，实际实现需要考虑：
  // 1. 使用合适的请求头
  // 2. 控制请求频率
  // 3. 处理登录态
  console.log('Crawling Damai...');
  return [];
}

async function crawlMaoyan() {
  // 猫眼爬取逻辑
  console.log('Crawling Maoyan...');
  return [];
}

async function crawlDouyin() {
  // 抖音爬取逻辑
  console.log('Crawling Douyin...');
  return [];
}

// 判断演唱会阶段
function determineStage(concert) {
  if (!concert.officialAnnounced) return '网传';
  if (!concert.ticketOpen) return '上架';
  if (concert.openCount === 1) return '一开';
  if (concert.openCount === 2) return '二开';
  if (concert.openCount >= 3) return '三开';
  return '上架';
}

// 更新或插入演唱会数据
async function upsertConcert(concertData) {
  try {
    // 查找是否已存在
    const existing = await db.collection('concerts')
      .where({
        title: concertData.title,
        city: concertData.city
      })
      .get();

    const now = new Date();

    if (existing.data.length > 0) {
      const oldConcert = existing.data[0];
      const newStage = determineStage(concertData);

      // 检查阶段是否变化
      let stageHistory = oldConcert.stageHistory || [];
      if (oldConcert.stage !== newStage) {
        stageHistory.push({
          stage: newStage,
          time: now.toISOString()
        });
      }

      // 更新演唱会
      await db.collection('concerts').doc(oldConcert._id).update({
        data: {
          ...concertData,
          stage: newStage,
          stageHistory: stageHistory,
          source: 'crawler',
          verified: false,
          updateTime: now
        }
      });

      return { updated: true, id: oldConcert._id, stageChanged: oldConcert.stage !== newStage };
    } else {
      // 新增演唱会
      const stage = determineStage(concertData);
      const result = await db.collection('concerts').add({
        data: {
          ...concertData,
          stage: stage,
          stageHistory: [{
            stage: stage,
            time: now.toISOString()
          }],
          source: 'crawler',
          verified: false,
          status: 'published',
          subscribeCount: 0,
          createTime: now,
          updateTime: now
        }
      });

      return { updated: false, id: result._id, isNew: true };
    }
  } catch (err) {
    console.error('upsertConcert error:', err);
    throw err;
  }
}

exports.main = async (event, context) => {
  try {
    console.log('Starting crawler task...');

    const results = {
      damai: { success: 0, failed: 0 },
      maoyan: { success: 0, failed: 0 },
      douyin: { success: 0, failed: 0 }
    };

    // 爬取大麦
    try {
      const damaiConcerts = await crawlDamai();
      for (const concert of damaiConcerts) {
        try {
          await upsertConcert(concert);
          results.damai.success++;
        } catch (err) {
          results.damai.failed++;
        }
      }
    } catch (err) {
      console.error('Damai crawl error:', err);
    }

    // 爬取猫眼
    try {
      const maoyanConcerts = await crawlMaoyan();
      for (const concert of maoyanConcerts) {
        try {
          await upsertConcert(concert);
          results.maoyan.success++;
        } catch (err) {
          results.maoyan.failed++;
        }
      }
    } catch (err) {
      console.error('Maoyan crawl error:', err);
    }

    // 爬取抖音
    try {
      const douyinConcerts = await crawlDouyin();
      for (const concert of douyinConcerts) {
        try {
          await upsertConcert(concert);
          results.douyin.success++;
        } catch (err) {
          results.douyin.failed++;
        }
      }
    } catch (err) {
      console.error('Douyin crawl error:', err);
    }

    console.log('Crawler task completed:', results);

    return {
      code: 0,
      data: results
    };
  } catch (err) {
    console.error('crawlerTask error:', err);
    return {
      code: -1,
      message: err.message || '爬虫任务执行失败'
    };
  }
};
