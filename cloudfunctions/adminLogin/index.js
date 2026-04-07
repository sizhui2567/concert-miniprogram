// cloudfunctions/adminLogin/index.js
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 管理员密码从环境变量读取，避免硬编码到仓库
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

exports.main = async (event, context) => {
  const { password } = event;
  const { OPENID } = cloud.getWXContext();

  if (!password) {
    return {
      code: -1,
      message: '请输入密码'
    };
  }

  if (!ADMIN_PASSWORD) {
    return {
      code: -1,
      message: '管理员密码未配置，请联系维护者设置 ADMIN_PASSWORD',
      data: { success: false }
    };
  }

  try {
    // 验证密码
    if (password !== ADMIN_PASSWORD) {
      return {
        code: -1,
        message: '密码错误',
        data: { success: false }
      };
    }

    // 检查是否已是管理员
    const adminResult = await db.collection('admins')
      .where({ openid: OPENID })
      .get();

    // 如果不是管理员，添加到管理员列表
    if (adminResult.data.length === 0) {
      await db.collection('admins').add({
        data: {
          openid: OPENID,
          role: 'admin',
          createTime: new Date()
        }
      });
    }

    return {
      code: 0,
      data: {
        success: true
      }
    };
  } catch (err) {
    console.error('adminLogin error:', err);
    return {
      code: -1,
      message: err.message || '登录失败'
    };
  }
};
