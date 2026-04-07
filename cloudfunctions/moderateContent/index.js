// cloudfunctions/moderateContent/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

const CONTENT_MAP = {
  announcement: 'concertAnnouncements',
  buddy: 'buddyPosts',
  seatView: 'seatViews'
};

async function ensureAdmin(openid) {
  try {
    const adminRes = await db.collection('admins').where({ openid }).limit(1).get();
    return adminRes.data.length > 0;
  } catch (err) {
    return false;
  }
}

async function upsertMuteUser({ targetOpenid, scope, hours, operatorOpenid }) {
  const now = new Date();
  const endTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
  const existRes = await db.collection('userMutes')
    .where({
      userId: targetOpenid,
      scope,
      status: 'active'
    })
    .limit(1)
    .get();

  if (existRes.data.length > 0) {
    await db.collection('userMutes').doc(existRes.data[0]._id).update({
      data: {
        endTime,
        updateTime: now,
        operatorOpenid
      }
    });
  } else {
    await db.collection('userMutes').add({
      data: {
        userId: targetOpenid,
        scope,
        status: 'active',
        endTime,
        operatorOpenid,
        createTime: now,
        updateTime: now
      }
    });
  }
  return endTime;
}

exports.main = async (event) => {
  const {
    contentType = '',
    contentId = '',
    action = '',
    targetOpenid = '',
    scope = '',
    hours = 24,
    hotDelta = 20,
    reason = ''
  } = event;

  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { code: -1, message: '请先登录' };
  }

  const admin = await ensureAdmin(OPENID);
  if (!admin) {
    return { code: -1, message: '仅管理员可操作' };
  }

  const normalizedType = String(contentType || '').trim();
  const normalizedContentId = String(contentId || '').trim();
  const normalizedAction = String(action || '').trim();
  const collectionName = CONTENT_MAP[normalizedType];
  if (!collectionName) {
    return { code: -1, message: '无效的内容类型' };
  }
  if (!normalizedContentId) {
    return { code: -1, message: '缺少内容 ID' };
  }

  try {
    const targetRes = await db.collection(collectionName).doc(normalizedContentId).get();
    const target = targetRes.data;
    if (!target) {
      return { code: -1, message: '内容不存在' };
    }

    const now = new Date();
    const updateData = {
      updateTime: now,
      reviewBy: OPENID
    };
    let extra = {};

    if (normalizedAction === 'approve') {
      updateData.status = 'approved';
      updateData.reviewReason = '';
      updateData.reviewTime = now;
    } else if (normalizedAction === 'offline') {
      updateData.status = 'offline';
      updateData.reviewReason = String(reason || '').trim().slice(0, 120) || '管理员下线';
      updateData.reviewTime = now;
    } else if (normalizedAction === 'delete') {
      updateData.status = 'offline';
      updateData.isDeleted = true;
      updateData.reviewReason = String(reason || '').trim().slice(0, 120) || '管理员删除';
      updateData.reviewTime = now;
    } else if (normalizedAction === 'pin') {
      if (normalizedType !== 'announcement') {
        return { code: -1, message: '仅公告支持置顶' };
      }
      updateData.isPinned = true;
    } else if (normalizedAction === 'unpin') {
      if (normalizedType !== 'announcement') {
        return { code: -1, message: '仅公告支持置顶' };
      }
      updateData.isPinned = false;
    } else if (normalizedAction === 'official_on') {
      if (normalizedType !== 'announcement') {
        return { code: -1, message: '仅公告支持官方标识' };
      }
      updateData.isOfficial = true;
    } else if (normalizedAction === 'official_off') {
      if (normalizedType !== 'announcement') {
        return { code: -1, message: '仅公告支持官方标识' };
      }
      updateData.isOfficial = false;
    } else if (normalizedAction === 'boost_hot') {
      if (normalizedType !== 'announcement') {
        return { code: -1, message: '仅公告支持热度操作' };
      }
      const delta = Math.max(-200, Math.min(200, Number(hotDelta) || 0));
      updateData.hotScore = _.inc(delta);
      extra.hotDelta = delta;
    } else if (normalizedAction === 'mute_user') {
      const muteTarget = String(targetOpenid || target.openid || '').trim();
      if (!muteTarget) {
        return { code: -1, message: '缺少禁言目标用户' };
      }
      const muteHours = Math.max(1, Math.min(720, Number(hours) || 24));
      const muteScope = String(scope || normalizedType || 'all').trim() || 'all';
      const endTime = await upsertMuteUser({
        targetOpenid: muteTarget,
        scope: muteScope,
        hours: muteHours,
        operatorOpenid: OPENID
      });
      return {
        code: 0,
        data: {
          action: normalizedAction,
          targetOpenid: muteTarget,
          scope: muteScope,
          endTime
        },
        message: `已禁言 ${muteHours} 小时`
      };
    } else if (normalizedAction === 'unmute_user') {
      const muteTarget = String(targetOpenid || target.openid || '').trim();
      if (!muteTarget) {
        return { code: -1, message: '缺少解除禁言目标用户' };
      }
      const muteScope = String(scope || normalizedType || 'all').trim() || 'all';
      await db.collection('userMutes').where({
        userId: muteTarget,
        scope: muteScope,
        status: 'active'
      }).update({
        data: {
          status: 'inactive',
          updateTime: now,
          operatorOpenid: OPENID
        }
      });
      return {
        code: 0,
        data: {
          action: normalizedAction,
          targetOpenid: muteTarget,
          scope: muteScope
        },
        message: '已解除禁言'
      };
    } else {
      return { code: -1, message: '不支持的操作' };
    }

    await db.collection(collectionName).doc(normalizedContentId).update({
      data: updateData
    });

    if (['approve', 'offline', 'delete'].includes(normalizedAction)) {
      await db.collection('contentReports').where({
        contentType: normalizedType,
        contentId: normalizedContentId,
        status: 'pending'
      }).update({
        data: {
          status: 'handled',
          handledBy: OPENID,
          handledTime: now,
          updateTime: now
        }
      });
    }

    return {
      code: 0,
      data: {
        action: normalizedAction,
        contentType: normalizedType,
        contentId: normalizedContentId,
        ...extra
      },
      message: '操作成功'
    };
  } catch (err) {
    console.error('moderateContent error:', err);
    return {
      code: -1,
      message: err.message || '操作失败'
    };
  }
};
