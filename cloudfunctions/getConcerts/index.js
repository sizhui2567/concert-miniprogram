// cloudfunctions/getConcerts/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
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
    const conditions = [];

    if (keyword) {
      conditions.push(
        _.or([
          { title: db.RegExp({ regexp: keyword, options: 'i' }) },
          { artist: db.RegExp({ regexp: keyword, options: 'i' }) },
          { city: db.RegExp({ regexp: keyword, options: 'i' }) }
        ])
      );
    }

    if (city) {
      conditions.push({ city });
    }

    if (stage) {
      conditions.push({ stage });
    }

    if (artistId) {
      conditions.push({ artistId });
    }

    if (!includeAll) {
      conditions.push(
        _.or([
          { status: 'published' },
          { status: _.exists(false) }
        ])
      );
    }

    let query = db.collection('concerts');
    if (conditions.length > 0) {
      query = query.where(_.and(conditions));
    }

    const countResult = await query.count();
    const total = countResult.total;

    let orderBy = 'dates';
    let orderDirection = 'asc';
    if (sortBy === 'hot') {
      orderBy = 'subscribeCount';
      orderDirection = 'desc';
    } else if (sortBy === 'update') {
      orderBy = 'updateTime';
      orderDirection = 'desc';
    }

    const skip = (page - 1) * pageSize;
    const listResult = await query
      .field({
        title: true,
        artist: true,
        artistId: true,
        city: true,
        venue: true,
        province: true,
        dates: true,
        stage: true,
        platforms: true,
        priceRange: true,
        poster: true,
        status: true,
        verified: true,
        source: true,
        subscribeCount: true,
        updateTime: true,
        createTime: true
      })
      .orderBy(orderBy, orderDirection)
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      code: 0,
      data: {
        list: listResult.data,
        total,
        page,
        pageSize
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
