// cloudfunctions/getBuddyPosts/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

async function isAdmin(openid) {
  if (!openid) return false;
  try {
    const adminRes = await db.collection('admins').where({ openid }).limit(1).get();
    return adminRes.data.length > 0;
  } catch (err) {
    return false;
  }
}

async function getBlockedOpenids(ownerOpenid) {
  if (!ownerOpenid) return [];
  try {
    const res = await db.collection('userBlocks')
      .where({
        ownerOpenid,
        status: 'active'
      })
      .limit(200)
      .get();
    return (res.data || []).map((item) => item.targetOpenid).filter(Boolean);
  } catch (err) {
    return [];
  }
}

exports.main = async (event) => {
  const {
    concertId,
    type = '',
    page = 1,
    pageSize = 20,
    sortBy = 'time',
    status = 'approved'
  } = event;

  const { OPENID } = cloud.getWXContext();

  if (!concertId) {
    return { code: -1, message: '缺少演唱会 ID' };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 20));
  const skip = (safePage - 1) * safePageSize;
  const normalizedSortBy = String(sortBy || 'time') === 'hot' ? 'hot' : 'time';
  const normalizedStatus = String(status || 'approved');

  const where = { concertId };
  if (type) {
    where.type = String(type);
  }

  try {
    const admin = await isAdmin(OPENID);
    if (!admin && normalizedStatus !== 'approved') {
      return { code: -1, message: '无权限查看该状态内容' };
    }
    where.status = normalizedStatus;

    const blockedOpenids = await getBlockedOpenids(OPENID);
    if (blockedOpenids.length > 0) {
      where.openid = _.nin(blockedOpenids.slice(0, 100));
    }

    const base = db.collection('buddyPosts').where(where);
    const countRes = await base.count();

    let query = base;
    if (normalizedSortBy === 'hot') {
      query = query.orderBy('hotScore', 'desc').orderBy('createTime', 'desc');
    } else {
      query = query.orderBy('createTime', 'desc');
    }

    const listRes = await query
      .skip(skip)
      .limit(safePageSize)
      .field({
        openid: true,
        userName: true,
        userAvatar: true,
        type: true,
        content: true,
        contact: true,
        expectedCount: true,
        joinedCount: true,
        status: true,
        reportCount: true,
        hotScore: true,
        createTime: true,
        updateTime: true
      })
      .get();

    return {
      code: 0,
      data: {
        list: listRes.data || [],
        total: countRes.total || 0,
        page: safePage,
        pageSize: safePageSize,
        sortBy: normalizedSortBy
      }
    };
  } catch (err) {
    console.error('getBuddyPosts error:', err);
    return {
      code: -1,
      message: err.message || '获取同好列表失败'
    };
  }
};
