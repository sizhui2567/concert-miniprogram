// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-2gw1ruue291212e5', // 替换为你的云开发环境ID
        traceUser: true,
      });
    }

    this.globalData = {
      userInfo: null,
      openid: null,
      isAdmin: false
    };

    // 获取用户登录状态（不阻塞页面加载）
    this.checkLoginStatus();
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
        if (res.result && res.result.openid) {
          that.globalData.openid = res.result.openid;
          // 获取用户信息
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
    const db = wx.cloud.database();
    db.collection('users').where({
      _id: that.globalData.openid
    }).get({
      success: res => {
        if (res.data.length > 0) {
          that.globalData.userInfo = res.data[0];
        }
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
