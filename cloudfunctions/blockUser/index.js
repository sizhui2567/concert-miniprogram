// cloudfunctions/blockUser/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

exports.main = async (event) => {
  const {
    targetOpenid = '',
    action = 'block',
    reason = ''
  } = event;

  const { OPENID } = cloud.getWXContext();
  if (!OPENID) {
    return { code: -1, message: '请先登录' };
  }

  const normalizedTarget = String(targetOpenid || '').trim();
  if (!normalizedTarget) {
    return { code: -1, message: '缺少目标用户' };
  }
  if (normalizedTarget === OPENID) {
    return { code: -1, message: '不能拉黑自己' };
  }

  const normalizedAction = String(action || 'block').trim();
  if (!['block', 'unblock'].includes(normalizedAction)) {
    return { code: -1, message: '无效的操作类型' };
  }

  try {
    const now = new Date();
    const existRes = await db.collection('userBlocks')
      .where({
        ownerOpenid: OPENID,
        targetOpenid: normalizedTarget
      })
      .limit(1)
      .get();

    if (normalizedAction === 'block') {
      const payload = {
        ownerOpenid: OPENID,
        targetOpenid: normalizedTarget,
        status: 'active',
        reason: String(reason || '').trim().slice(0, 80),
        updateTime: now
      };

      if (existRes.data.length > 0) {
        await db.collection('userBlocks').doc(existRes.data[0]._id).update({ data: payload });
      } else {
        payload.createTime = now;
        await db.collection('userBlocks').add({ data: payload });
      }
    } else if (existRes.data.length > 0) {
      await db.collection('userBlocks').doc(existRes.data[0]._id).update({
        data: {
          status: 'inactive',
          updateTime: now
        }
      });
    }

    return {
      code: 0,
      data: {
        targetOpenid: normalizedTarget,
        blocked: normalizedAction === 'block'
      },
      message: normalizedAction === 'block' ? '已拉黑该用户' : '已取消拉黑'
    };
  } catch (err) {
    console.error('blockUser error:', err);
    return {
      code: -1,
      message: err.message || '操作失败'
    };
  }
};
