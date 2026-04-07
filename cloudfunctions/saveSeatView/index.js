// cloudfunctions/saveSeatView/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const VALID_RATINGS = ['clear', 'side', 'blocked'];
const SENSITIVE_WORDS = [
  'vx',
  '微信',
  'v信',
  'qq',
  '加我',
  '约炮',
  '嫖',
  '外围',
  '代抢',
  '黄牛',
  '返现',
  '刷单',
  '赌博',
  '毒品'
];

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 4;

function buildUserName(openid, userDoc) {
  if (userDoc && (userDoc.nickName || userDoc.nickname)) {
    return userDoc.nickName || userDoc.nickname;
  }
  if (!openid) return '用户';
  return `用户${String(openid).slice(-4)}`;
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  const list = [];
  const seen = new Set();
  for (const raw of images) {
    const val = String(raw || '').trim();
    if (!val) continue;
    if (!(val.startsWith('cloud://') || val.startsWith('http://') || val.startsWith('https://'))) {
      continue;
    }
    if (seen.has(val)) continue;
    seen.add(val);
    list.push(val);
  }
  return list;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function findSensitiveWord(...texts) {
  const merged = normalizeText(texts.filter(Boolean).join(' '));
  if (!merged) return '';
  return SENSITIVE_WORDS.find((word) => merged.includes(normalizeText(word))) || '';
}

async function isUserMuted(openid, scopes) {
  try {
    const now = new Date();
    const muteRes = await db.collection('userMutes')
      .where({
        userId: openid,
        status: 'active',
        scope: _.in(scopes),
        endTime: _.gt(now)
      })
      .limit(1)
      .get();

    return muteRes.data.length > 0;
  } catch (err) {
    return false;
  }
}

async function checkRateLimit(openid) {
  try {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const res = await db.collection('seatViews')
      .where({
        openid,
        createTime: _.gte(since),
        status: _.in(['approved', 'pending'])
      })
      .count();
    return (res.total || 0) < RATE_LIMIT_MAX;
  } catch (err) {
    return true;
  }
}

exports.main = async (event) => {
  const {
    concertId,
    seatInput = '',
    areaId = '',
    areaName = '',
    row = null,
    seat = null,
    note = '',
    images = [],
    rating = 'clear'
  } = event;

  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { code: -1, message: '请先登录' };
  }

  if (!concertId) {
    return { code: -1, message: '缺少演唱会 ID' };
  }

  if (await isUserMuted(OPENID, ['all', 'seatView'])) {
    return { code: -1, message: '你当前被禁言，暂时无法发布视野图' };
  }

  const passRateLimit = await checkRateLimit(OPENID);
  if (!passRateLimit) {
    return { code: -1, message: '发布过于频繁，请稍后再试' };
  }

  const normalizedSeatInput = String(seatInput || '').trim();
  if (!normalizedSeatInput) {
    return { code: -1, message: '请先输入座位号' };
  }

  const normalizedImages = normalizeImages(images);
  if (!normalizedImages.length) {
    return { code: -1, message: '请至少上传 1 张视野图' };
  }
  if (normalizedImages.length > 6) {
    return { code: -1, message: '最多上传 6 张视野图' };
  }

  const normalizedNote = String(note || '').trim().slice(0, 220);
  const normalizedAreaId = String(areaId || '').trim();
  const normalizedAreaName = String(areaName || '').trim();
  const rowNum = Number.isFinite(Number(row)) ? Number(row) : null;
  const seatNum = Number.isFinite(Number(seat)) ? Number(seat) : null;
  const normalizedRating = VALID_RATINGS.includes(String(rating)) ? String(rating) : 'clear';

  const hitWord = findSensitiveWord(normalizedNote);
  const contentStatus = hitWord ? 'pending' : 'approved';

  try {
    const concertRes = await db.collection('concerts').doc(concertId).get();
    if (!concertRes.data) {
      return { code: -1, message: '演唱会不存在' };
    }

    let userDoc = null;
    try {
      const userRes = await db.collection('users').doc(OPENID).get();
      userDoc = userRes.data || null;
    } catch (e) {
      userDoc = null;
    }

    const now = new Date();
    const payload = {
      concertId,
      openid: OPENID,
      userName: buildUserName(OPENID, userDoc),
      userAvatar: (userDoc && userDoc.avatarUrl) || '',
      seatInput: normalizedSeatInput,
      areaId: normalizedAreaId,
      areaName: normalizedAreaName,
      row: rowNum,
      seat: seatNum,
      note: normalizedNote,
      rating: normalizedRating,
      images: normalizedImages,
      status: contentStatus,
      reviewReason: hitWord ? `命中敏感词:${hitWord}` : '',
      reportCount: 0,
      helpfulScore: 0,
      updateTime: now
    };

    const existRes = await db.collection('seatViews').where({
      concertId,
      openid: OPENID,
      areaId: normalizedAreaId,
      row: rowNum,
      seat: seatNum
    }).limit(1).get();

    if (existRes.data.length > 0) {
      const docId = existRes.data[0]._id;
      await db.collection('seatViews').doc(docId).update({ data: payload });
      return {
        code: 0,
        data: {
          _id: docId,
          updated: true,
          status: contentStatus
        },
        message: contentStatus === 'pending' ? '已提交，等待审核' : '保存成功'
      };
    }

    payload.createTime = now;
    const addRes = await db.collection('seatViews').add({ data: payload });
    return {
      code: 0,
      data: {
        _id: addRes._id,
        updated: false,
        status: contentStatus
      },
      message: contentStatus === 'pending' ? '已提交，等待审核' : '保存成功'
    };
  } catch (err) {
    console.error('saveSeatView error:', err);
    return {
      code: -1,
      message: err.message || '保存失败'
    };
  }
};
