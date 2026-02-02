// pages/subscribe/subscribe.js
const api = require('../../utils/api');
const { PAGE_SIZE } = require('../../utils/constants');
const { showToast } = require('../../utils/util');

const DEFAULT_NOTIFICATION_PREFS = {
  onListed: false,
  oneDayBefore: false,
  customHoursEnabled: true,
  customHours: 1
};

const normalizeNotificationPrefs = (prefs = {}) => {
  const merged = { ...DEFAULT_NOTIFICATION_PREFS, ...prefs };
  let customHours = Number(merged.customHours);
  if (!Number.isFinite(customHours)) {
    customHours = DEFAULT_NOTIFICATION_PREFS.customHours;
  }
  customHours = Math.min(Math.max(Math.round(customHours), 1), 168);
  return {
    onListed: !!merged.onListed,
    oneDayBefore: !!merged.oneDayBefore,
    customHoursEnabled: !!merged.customHoursEnabled,
    customHours
  };
};

Page({
  data: {
    activeTab: 'concerts', // concerts, artists
    concerts: [],
    artists: [],
    page: 1,
    hasMore: true,
    loading: false,
    refreshing: false,
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
    savingPrefs: false
  },

  onLoad() {
    this.checkLogin();
  },

  onShow() {
    this.loadData();
  },

  // 检查登录状态
  checkLogin() {
    const app = getApp();
    if (!app.globalData.openid) {
      // 可以在这里引导用户登录
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
    });
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.activeTab === 'concerts' && this.data.hasMore && !this.data.loading) {
      this.loadMoreConcerts();
    }
  },

  // 加载数据
  async loadData() {
    const { activeTab } = this.data;
    if (activeTab === 'concerts') {
      await this.loadSubscribedConcerts();
    } else {
      await this.loadFollowingArtists();
    }
  },

  // 加载订阅的演唱会
  async loadSubscribedConcerts() {
    this.setData({ loading: true });

    try {
      const result = await api.getSubscriptions(1, PAGE_SIZE);
      this.setData({
        concerts: result.list || [],
        page: 1,
        hasMore: (result.list || []).length >= PAGE_SIZE,
        notificationPrefs: normalizeNotificationPrefs(result.notificationPrefs)
      });
    } catch (err) {
      console.error('加载订阅失败:', err);
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载更多订阅的演唱会
  async loadMoreConcerts() {
    const { page, concerts } = this.data;
    this.setData({ loading: true });

    try {
      const result = await api.getSubscriptions(page + 1, PAGE_SIZE);
      const newList = result.list || [];
      this.setData({
        concerts: [...concerts, ...newList],
        page: page + 1,
        hasMore: newList.length >= PAGE_SIZE
      });
    } catch (err) {
      console.error('加载更多失败:', err);
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  async saveNotificationPrefs(nextPrefs) {
    if (this.data.savingPrefs) return;
    this.setData({ savingPrefs: true });
    try {
      await api.updateNotificationPrefs(nextPrefs);
      showToast('已保存');
    } catch (err) {
      console.error('保存通知设置失败:', err);
      showToast('保存失败');
    } finally {
      this.setData({ savingPrefs: false });
    }
  },

  onToggleNotifyListed(e) {
    const prefs = {
      ...this.data.notificationPrefs,
      onListed: !!e.detail.value
    };
    this.setData({ notificationPrefs: prefs });
    this.saveNotificationPrefs(prefs);
  },

  onToggleNotifyOneDay(e) {
    const prefs = {
      ...this.data.notificationPrefs,
      oneDayBefore: !!e.detail.value
    };
    this.setData({ notificationPrefs: prefs });
    this.saveNotificationPrefs(prefs);
  },

  onToggleNotifyCustom(e) {
    const enabled = !!e.detail.value;
    const prefs = {
      ...this.data.notificationPrefs,
      customHoursEnabled: enabled,
      customHours: enabled ? this.data.notificationPrefs.customHours || 1 : this.data.notificationPrefs.customHours
    };
    this.setData({ notificationPrefs: prefs });
    this.saveNotificationPrefs(prefs);
  },

  onCustomHoursInput(e) {
    const raw = e.detail.value;
    const value = Number(raw);
    const prefs = {
      ...this.data.notificationPrefs,
      customHours: Number.isFinite(value) ? value : this.data.notificationPrefs.customHours
    };
    this.setData({ notificationPrefs: prefs });
  },

  onCustomHoursBlur() {
    const prefs = normalizeNotificationPrefs(this.data.notificationPrefs);
    this.setData({ notificationPrefs: prefs });
    this.saveNotificationPrefs(prefs);
  },

  // 加载关注的艺人
  async loadFollowingArtists() {
    this.setData({ loading: true });

    try {
      const artists = await api.getFollowingArtists();
      this.setData({ artists: artists || [] });
    } catch (err) {
      console.error('加载关注艺人失败:', err);
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 切换标签
  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab !== this.data.activeTab) {
      this.setData({
        activeTab: tab,
        page: 1,
        hasMore: true
      });
      this.loadData();
    }
  },

  // 取消订阅演唱会
  async onCancelSubscribe(e) {
    const { concert } = e.detail;

    try {
      await api.subscribeConcert(concert._id, false);

      // 从列表中移除
      const concerts = this.data.concerts.filter(item => item._id !== concert._id);
      this.setData({ concerts });

      showToast('已取消订阅');
    } catch (err) {
      console.error('取消订阅失败:', err);
      showToast('操作失败');
    }
  },

  // 取消关注艺人
  async onUnfollowArtist(e) {
    const { artistId } = e.currentTarget.dataset;

    try {
      await api.followArtist(artistId, false);

      // 从列表中移除
      const artists = this.data.artists.filter(item => item._id !== artistId);
      this.setData({ artists });

      showToast('已取消关注');
    } catch (err) {
      console.error('取消关注失败:', err);
      showToast('操作失败');
    }
  },

  // 查看艺人演唱会
  onTapArtist(e) {
    const { artistId, name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/search/search?keyword=${name}`
    });
  }
});
