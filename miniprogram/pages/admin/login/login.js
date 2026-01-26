// pages/admin/login/login.js
const api = require('../../../utils/api');
const { showToast, showLoading, hideLoading } = require('../../../utils/util');

Page({
  data: {
    password: '',
    isLoggedIn: false
  },

  onLoad() {
    this.checkAdminStatus();
  },

  // 检查管理员状态
  checkAdminStatus() {
    const isAdmin = wx.getStorageSync('isAdmin');
    if (isAdmin) {
      this.setData({ isLoggedIn: true });
      this.goToList();
    }
  },

  // 输入密码
  onInputPassword(e) {
    this.setData({ password: e.detail.value });
  },

  // 登录
  async onLogin() {
    const { password } = this.data;

    if (!password.trim()) {
      showToast('请输入密码');
      return;
    }

    showLoading('验证中...');

    try {
      const result = await api.adminLogin(password);

      if (result && result.success) {
        wx.setStorageSync('isAdmin', true);
        this.setData({ isLoggedIn: true });
        showToast('登录成功');
        this.goToList();
      } else {
        showToast('密码错误');
      }
    } catch (err) {
      console.error('登录失败:', err);
      showToast('登录失败');
    } finally {
      hideLoading();
    }
  },

  // 跳转到列表页
  goToList() {
    wx.redirectTo({
      url: '/pages/admin/list/list'
    });
  },

  // 退出登录
  onLogout() {
    wx.removeStorageSync('isAdmin');
    this.setData({
      isLoggedIn: false,
      password: ''
    });
    showToast('已退出');
  }
});
