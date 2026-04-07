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
    savingPrefs: false,
    overviewStats: {
      totalSubscriptions: 0,
      upcomingCount: 0,
      artistCount: 0
    }
  },

  formatTimeAxisLabel(openTime) {
    if (!openTime) return '待公布';
    const date = new Date(openTime);
    if (!Number.isFinite(date.getTime())) return '待公布';
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  },

  normalizeConcertCard(concert = {}) {
    const platformMap = concert.platforms || {};
    const platformKeys = Object.keys(platformMap);
    const openTime = platformKeys
      .map((key) => (platformMap[key] && platformMap[key].openTime) || '')
      .find((value) => !!value);

    const availablePlatforms = Array.isArray(concert.availablePlatforms) && concert.availablePlatforms.length
      ? concert.availablePlatforms
      : platformKeys.filter((key) => platformMap[key] && platformMap[key].available);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const isUpcoming = Array.isArray(concert.dates) && concert.dates.some((d) => {
      const t = new Date(d).getTime();
      return Number.isFinite(t) && t >= todayStart.getTime();
    });

    return {
      ...concert,
      openTimeDisplay: openTime || '待公布',
      timeAxisLabel: this.formatTimeAxisLabel(openTime),
      platformsDisplay: availablePlatforms.length ? availablePlatforms.join(' / ') : '待公布',
      stageLabel: concert.stage || '待更新',
      cityVenueDisplay: `${concert.city || '待定'} · ${concert.venue || '待定'}`,
      isUpcoming: isUpcoming || concert.stage !== '已结束'
    };
  },

  updateOverviewStats(partial = {}) {
    const concerts = partial.concerts || this.data.concerts || [];
    const artists = partial.artists || this.data.artists || [];
    const upcomingCount = concerts.filter((item) => !!item.isUpcoming).length;
    this.setData({
      overviewStats: {
        totalSubscriptions: concerts.length,
        upcomingCount,
        artistCount: artists.length
      }
    });
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
      const concerts = (result.list || []).map((item) => this.normalizeConcertCard(item));
      this.setData({
        concerts,
        page: 1,
        hasMore: concerts.length >= PAGE_SIZE,
        notificationPrefs: normalizeNotificationPrefs(result.notificationPrefs)
      });
      this.updateOverviewStats({ concerts });
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
      const newList = (result.list || []).map((item) => this.normalizeConcertCard(item));
      const merged = [...concerts, ...newList];
      this.setData({
        concerts: merged,
        page: page + 1,
        hasMore: newList.length >= PAGE_SIZE
      });
      this.updateOverviewStats({ concerts: merged });
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
      const nextArtists = artists || [];
      this.setData({ artists: nextArtists });
      this.updateOverviewStats({ artists: nextArtists });
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
    const fromDetail = e.detail && e.detail.concert;
    const fromDataset = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.concert;
    const concert = fromDetail || fromDataset;
    if (!concert || !concert._id) return;

    try {
      await api.subscribeConcert(concert._id, false);

      const concerts = this.data.concerts.filter(item => item._id !== concert._id);
      this.setData({ concerts });
      this.updateOverviewStats({ concerts });

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

      const artists = this.data.artists.filter(item => item._id !== artistId);
      this.setData({ artists });
      this.updateOverviewStats({ artists });

      showToast('已取消关注');
    } catch (err) {
      console.error('取消关注失败:', err);
      showToast('操作失败');
    }
  },

  // 查看艺人演唱会
  onTapArtist(e) {
    const { name } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/search/search?keyword=${name}`
    });
  },

  onTapConcert(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  }
});
