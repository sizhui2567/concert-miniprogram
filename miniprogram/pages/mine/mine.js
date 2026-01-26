// pages/mine/mine.js
const { showToast, showModal } = require('../../utils/util');

Page({
  data: {
    userInfo: null,
    isAdmin: false,
    subscribeCount: 0,
    followCount: 0
  },

  onLoad() {
    this.checkLoginStatus();
  },

  onShow() {
    this.loadUserStats();
  },

  // 检查登录状态
  checkLoginStatus() {
    const app = getApp();
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        isAdmin: app.globalData.isAdmin
      });
    }
  },

  // 加载用户统计数据
  async loadUserStats() {
    const app = getApp();
    if (!app.globalData.openid) return;

    try {
      const db = wx.cloud.database();
      const userRes = await db.collection('users').where({
        _id: app.globalData.openid
      }).get();

      if (userRes.data.length > 0) {
        const user = userRes.data[0];
        this.setData({
          userInfo: user,
          subscribeCount: (user.subscriptions || []).length,
          followCount: (user.followArtists || []).length
        });
      }
    } catch (err) {
      console.error('加载用户数据失败:', err);
    }
  },

  // 获取用户头像（微信头像获取）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    // 这里可以上传头像到云存储
    this.setData({
      'userInfo.avatarUrl': avatarUrl
    });
  },

  // 获取用户昵称
  onInputNickname(e) {
    this.setData({
      'userInfo.nickname': e.detail.value
    });
  },

  // 跳转到订阅页面
  onGoSubscribe() {
    wx.switchTab({
      url: '/pages/subscribe/subscribe'
    });
  },

  // 跳转到管理后台
  onGoAdmin() {
    wx.navigateTo({
      url: '/pages/admin/login/login'
    });
  },

  // 清除缓存
  async onClearCache() {
    const res = await showModal({
      title: '提示',
      content: '确定要清除本地缓存吗？'
    });

    if (res.confirm) {
      wx.clearStorageSync();
      showToast('缓存已清除');
    }
  },

  // 关于我们
  onAbout() {
    wx.showModal({
      title: '关于我们',
      content: '演唱会查询小程序 v1.0.0\n\n帮助您快速查询演唱会信息，订阅追更，不错过每一场精彩演出！',
      showCancel: false
    });
  },

  // 意见反馈
  onFeedback() {
    // 可以跳转到反馈页面或打开客服
  },

  // 联系客服
  onContact() {
    // 使用微信客服功能
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '演唱会查询 - 不错过每一场精彩演出',
      path: '/pages/index/index'
    };
  }
});
