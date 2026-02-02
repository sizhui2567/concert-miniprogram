// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: '', // 替换为你的云开发环境ID
        traceUser: true,
      });
    }

    this.globalData = {
      userInfo: null,
      openid: null,
      isAdmin: false
    };

    // 获取用户登录状态（不阻塞页面加载）
    if (wx.cloud) {
      this.checkLoginStatus();
    }
  },

  globalData: {
    userInfo: null,
    openid: null,
    isAdmin: false
  },

  // 检查登录状态（带超时处理）
  checkLoginStatus: function() {
    const that = this;

    // 设置超时，5秒后如果还没返回就放弃
    const timeoutId = setTimeout(() => {
      console.warn('登录超时，云函数可能未部署');
    }, 5000);

    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        clearTimeout(timeoutId);
        console.log('登录结果:', res.result);

        // 修复：正确读取返回数据
        if (res.result && res.result.code === 0 && res.result.data) {
          const { openid, isAdmin } = res.result.data;
          that.globalData.openid = openid;
          that.globalData.isAdmin = isAdmin || false;
          // 获取用户信息
          that.getUserInfo();
        } else if (res.result && res.result.openid) {
          // 兼容旧格式
          that.globalData.openid = res.result.openid;
          that.getUserInfo();
        }
      },
      fail: err => {
        clearTimeout(timeoutId);
        console.error('登录失败，云函数可能未部署:', err);
      }
    });
  },

  // 获取用户信息
  getUserInfo: function() {
    const that = this;
    if (!that.globalData.openid) return;

    const db = wx.cloud.database();
    // 修复：使用 doc 直接查询，并添加错误处理
    db.collection('users').doc(that.globalData.openid).get({
      success: res => {
        if (res.data) {
          that.globalData.userInfo = res.data;
          console.log('用户信息已加载:', res.data);
        }
      },
      fail: err => {
        console.error('获取用户信息失败:', err);
      }
    });
  },

  // 云函数调用封装
  callCloudFunction: function(name, data) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: name,
        data: data,
        success: res => {
          resolve(res.result);
        },
        fail: err => {
          reject(err);
        }
      });
    });
  }
});
