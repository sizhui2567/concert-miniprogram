// cloudfunctions/getSeatViews/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const VALID_RATINGS = ['clear', 'side', 'blocked'];

function buildAreaSummary(list = []) {
  const map = new Map();
  list.forEach((item) => {
    const areaId = String(item.areaId || 'unknown');
    if (!map.has(areaId)) {
      map.set(areaId, {
        areaId,
        areaName: item.areaName || areaId,
        total: 0,
        clear: 0,
        side: 0,
        blocked: 0
      });
    }
    const row = map.get(areaId);
    row.total += 1;
    if (item.rating === 'side') row.side += 1;
    else if (item.rating === 'blocked') row.blocked += 1;
    else row.clear += 1;
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

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
    areaId = '',
    rating = '',
    page = 1,
    pageSize = 20,
    sortBy = 'time',
    status = 'approved'
  } = event;

  const { OPENID } = cloud.getWXContext();

  if (!concertId) {
    return {
      code: -1,
      message: '缺少演唱会 ID'
    };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 20));
  const skip = (safePage - 1) * safePageSize;
  const normalizedSortBy = String(sortBy || 'time') === 'hot' ? 'hot' : 'time';
  const normalizedStatus = String(status || 'approved');
  const normalizedAreaId = String(areaId || '').trim();
  const normalizedRating = String(rating || '').trim();

  try {
    const admin = await isAdmin(OPENID);
    if (!admin && normalizedStatus !== 'approved') {
      return { code: -1, message: '无权限查看该状态内容' };
    }

    const where = {
      concertId,
      status: normalizedStatus
    };

    if (normalizedAreaId) {
      where.areaId = normalizedAreaId;
    }
    if (normalizedRating && VALID_RATINGS.includes(normalizedRating)) {
      where.rating = normalizedRating;
    }

    const blockedOpenids = await getBlockedOpenids(OPENID);
    if (blockedOpenids.length > 0) {
      where.openid = _.nin(blockedOpenids.slice(0, 100));
    }

    const base = db.collection('seatViews').where(where);
    const countRes = await base.count();

    let query = base;
    if (normalizedSortBy === 'hot') {
      query = query.orderBy('helpfulScore', 'desc').orderBy('createTime', 'desc');
    } else {
      query = query.orderBy('createTime', 'desc');
    }

    const listRes = await query
      .skip(skip)
      .limit(safePageSize)
      .field({
        concertId: true,
        openid: true,
        userName: true,
        userAvatar: true,
        seatInput: true,
        areaId: true,
        areaName: true,
        row: true,
        seat: true,
        coordKey: true,
        note: true,
        rating: true,
        status: true,
        images: true,
        reportCount: true,
        helpfulScore: true,
        createTime: true,
        updateTime: true
      })
      .get();

    const stats = {};
    for (const r of VALID_RATINGS) {
      const statRes = await db.collection('seatViews').where({
        ...where,
        rating: r
      }).count();
      stats[r] = statRes.total || 0;
    }

    return {
      code: 0,
      data: {
        list: listRes.data || [],
        total: countRes.total || 0,
        page: safePage,
        pageSize: safePageSize,
        sortBy: normalizedSortBy,
        stats,
        areaSummary: buildAreaSummary(listRes.data || [])
      }
    };
  } catch (err) {
    console.error('getSeatViews error:', err);
    return {
      code: -1,
      message: err.message || '获取视野图失败'
    };
  }
};
