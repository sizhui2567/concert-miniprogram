// cloudfunctions/getConcerts/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const {
    keyword = '',
    city = '',
    stage = '',
    artistId = '',
    sortBy = 'date',
    page = 1,
    pageSize = 10,
    includeAll = false
  } = event;

  try {
    // 构建查询条件
    const conditions = [];

    // 关键词搜索（艺人名或标题）
    if (keyword) {
      conditions.push(_.or([
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { artist: db.RegExp({ regexp: keyword, options: 'i' }) },
        { city: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]));
    }

    // 城市筛选
    if (city) {
      conditions.push({ city: city });
    }

    // 阶段筛选
    if (stage) {
      conditions.push({ stage: stage });
    }

    // 艺人ID筛选
    if (artistId) {
      conditions.push({ artistId: artistId });
    }

    // 不包含草稿（除非是管理员查询）
    if (!includeAll) {
      conditions.push(_.or([
        { status: 'published' },
        { status: _.exists(false) }
      ]));
    }

    // 构建最终查询
    let query = db.collection('concerts');
    if (conditions.length > 0) {
      query = query.where(_.and(conditions));
    }

    // 获取总数
    const countResult = await query.count();
    const total = countResult.total;

    // 排序
    let orderBy = 'dates';
    let orderDirection = 'asc';
    if (sortBy === 'hot') {
      orderBy = 'subscribeCount';
      orderDirection = 'desc';
    } else if (sortBy === 'update') {
      orderBy = 'updateTime';
      orderDirection = 'desc';
    }

    // 分页查询
    const skip = (page - 1) * pageSize;
    const listResult = await query
      .orderBy(orderBy, orderDirection)
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      code: 0,
      data: {
        list: listResult.data,
        total: total,
        page: page,
        pageSize: pageSize
      }
    };
  } catch (err) {
    console.error('getConcerts error:', err);
    return {
      code: -1,
      message: err.message || '获取演唱会列表失败'
    };
  }
};
