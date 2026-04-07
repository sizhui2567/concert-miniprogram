// cloudfunctions/reportContent/index.js
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

const AUTO_OFFLINE_THRESHOLD = 3;

exports.main = async (event) => {
  const {
    contentType = '',
    contentId = '',
    reasonType = 'other',
    detail = ''
  } = event;

  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { code: -1, message: '请先登录' };
  }

  const normalizedType = String(contentType || '').trim();
  const normalizedContentId = String(contentId || '').trim();
  const collectionName = CONTENT_MAP[normalizedType];
  if (!collectionName) {
    return { code: -1, message: '无效的举报类型' };
  }
  if (!normalizedContentId) {
    return { code: -1, message: '缺少举报内容 ID' };
  }

  const normalizedReasonType = String(reasonType || 'other').trim().slice(0, 40) || 'other';
  const normalizedDetail = String(detail || '').trim().slice(0, 180);

  try {
    const targetRes = await db.collection(collectionName).doc(normalizedContentId).get();
    const target = targetRes.data;
    if (!target) {
      return { code: -1, message: '举报内容不存在' };
    }
    if (target.openid === OPENID) {
      return { code: -1, message: '不能举报自己发布的内容' };
    }

    let existRes = { data: [] };
    try {
      existRes = await db.collection('contentReports')
        .where({
          reporterOpenid: OPENID,
          contentType: normalizedType,
          contentId: normalizedContentId,
          status: _.in(['pending', 'handled'])
        })
        .limit(1)
        .get();
    } catch (err) {
      existRes = { data: [] };
    }

    if ((existRes.data || []).length > 0) {
      return { code: -1, message: '你已举报过该内容，请勿重复提交' };
    }

    const now = new Date();
    const addRes = await db.collection('contentReports').add({
      data: {
        reporterOpenid: OPENID,
        targetOpenid: target.openid || '',
        concertId: target.concertId || '',
        contentType: normalizedType,
        contentId: normalizedContentId,
        reasonType: normalizedReasonType,
        detail: normalizedDetail,
        status: 'pending',
        createTime: now,
        updateTime: now
      }
    });

    const reportCount = Number(target.reportCount || 0) + 1;
    await db.collection(collectionName).doc(normalizedContentId).update({
      data: {
        reportCount: _.inc(1),
        lastReportTime: now,
        updateTime: now
      }
    });

    let autoOffline = false;
    if (reportCount >= AUTO_OFFLINE_THRESHOLD && target.status === 'approved') {
      await db.collection(collectionName).doc(normalizedContentId).update({
        data: {
          status: 'offline',
          reviewReason: '多人举报自动下线',
          autoOfflineAt: now,
          updateTime: now
        }
      });
      autoOffline = true;
    }

    return {
      code: 0,
      data: {
        reportId: addRes._id,
        contentType: normalizedType,
        contentId: normalizedContentId,
        reportCount,
        autoOffline
      },
      message: autoOffline ? '举报成功，内容已自动下线' : '举报成功，我们会尽快处理'
    };
  } catch (err) {
    console.error('reportContent error:', err);
    return {
      code: -1,
      message: err.message || '举报失败'
    };
  }
};
