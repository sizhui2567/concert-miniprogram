// cloudfunctions/getArtists/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { keyword = '', page = 1, pageSize = 20 } = event;

  try {
    let query = db.collection('artists');

    // 关键词搜索
    if (keyword) {
      query = query.where(_.or([
        { name: db.RegExp({ regexp: keyword, options: 'i' }) },
        { alias: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]));
    }

    // 获取总数
    const countResult = await query.count();
    const total = countResult.total;

    // 分页查询
    const skip = (page - 1) * pageSize;
    const listResult = await query
      .orderBy('followerCount', 'desc')
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
    console.error('getArtists error:', err);
    return {
      code: -1,
      message: err.message || '获取艺人列表失败'
    };
  }
};
