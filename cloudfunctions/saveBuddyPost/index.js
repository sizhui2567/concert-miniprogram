// cloudfunctions/saveBuddyPost/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const VALID_TYPES = ['photo', 'stay', 'afterparty'];
const SENSITIVE_WORDS = [
  '约炮',
  '外围',
  '嫖',
  '赌博',
  '毒品',
  '黄牛',
  '代抢',
  '返现',
  '刷单'
];
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

function buildUserName(openid, userDoc) {
  if (userDoc && (userDoc.nickName || userDoc.nickname)) {
    return userDoc.nickName || userDoc.nickname;
  }
  if (!openid) return '用户';
  return `用户${String(openid).slice(-4)}`;
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
    const res = await db.collection('buddyPosts')
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
    type = 'photo',
    content = '',
    contact = '',
    expectedCount = 2
  } = event;

  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { code: -1, message: '请先登录' };
  }

  if (!concertId) {
    return { code: -1, message: '缺少演唱会 ID' };
  }

  if (await isUserMuted(OPENID, ['all', 'buddy'])) {
    return { code: -1, message: '你当前被禁言，暂时无法发布组队信息' };
  }

  const passRateLimit = await checkRateLimit(OPENID);
  if (!passRateLimit) {
    return { code: -1, message: '发布过于频繁，请稍后再试' };
  }

  const normalizedType = VALID_TYPES.includes(type) ? type : 'photo';
  const normalizedContent = String(content || '').trim().slice(0, 260);
  const normalizedContact = String(contact || '').trim().slice(0, 80);
  const normalizedExpectedCount = Math.max(2, Math.min(10, Number(expectedCount) || 2));

  if (!normalizedContent) {
    return { code: -1, message: '请先填写你的组队说明' };
  }

  if (!normalizedContact) {
    return { code: -1, message: '请填写联系方式（如微信号）' };
  }

  const hitWord = findSensitiveWord(normalizedContent, normalizedContact);
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
      type: normalizedType,
      content: normalizedContent,
      contact: normalizedContact,
      expectedCount: normalizedExpectedCount,
      joinedCount: 1,
      status: contentStatus,
      reviewReason: hitWord ? `命中敏感词:${hitWord}` : '',
      reportCount: 0,
      hotScore: 0,
      updateTime: now,
      createTime: now
    };

    const addRes = await db.collection('buddyPosts').add({ data: payload });
    return {
      code: 0,
      data: {
        _id: addRes._id,
        status: contentStatus
      },
      message: contentStatus === 'pending' ? '已提交，等待审核' : '发布成功'
    };
  } catch (err) {
    console.error('saveBuddyPost error:', err);
    return {
      code: -1,
      message: err.message || '发布失败'
    };
  }
};
