// cloudfunctions/getAnnouncementMessages/index.js
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
    page = 1,
    pageSize = 30,
    sortBy = 'time',
    status = 'approved'
  } = event;

  const { OPENID } = cloud.getWXContext();

  if (!concertId) {
    return { code: -1, message: '缺少演唱会 ID' };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(80, Math.max(1, Number(pageSize) || 30));
  const skip = (safePage - 1) * safePageSize;
  const normalizedSortBy = String(sortBy || 'time') === 'hot' ? 'hot' : 'time';
  const normalizedStatus = String(status || 'approved');

  try {
    const admin = await isAdmin(OPENID);
    const where = { concertId };

    if (admin && normalizedStatus === 'all') {
      where.status = _.in(['approved', 'pending', 'offline']);
    } else if (admin && ['approved', 'pending', 'offline'].includes(normalizedStatus)) {
      where.status = normalizedStatus;
    } else {
      where.status = 'approved';
    }

    const blockedOpenids = await getBlockedOpenids(OPENID);
    if (blockedOpenids.length > 0) {
      where.openid = _.nin(blockedOpenids.slice(0, 100));
    }

    const base = db.collection('concertAnnouncements').where(where);
    const countRes = await base.count();

    let query = base.orderBy('isPinned', 'desc');
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
        content: true,
        isOfficial: true,
        isPinned: true,
        status: true,
        hotScore: true,
        reportCount: true,
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
        sortBy: normalizedSortBy,
        isAdmin: admin
      }
    };
  } catch (err) {
    console.error('getAnnouncementMessages error:', err);
    return {
      code: -1,
      message: err.message || '获取公告频道失败'
    };
  }
};
