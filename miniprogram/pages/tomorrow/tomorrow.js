// pages/tomorrow/tomorrow.js
const api = require('../../utils/api');
const { showToast, getCountdown, formatDate } = require('../../utils/util');

Page({
  data: {
    concerts: [],
    groupedConcerts: [],
    loading: true,
    refreshing: false,
    tomorrowDate: '',
    countdownTimers: {}
  },

  timer: null,

  onLoad() {
    this.setTomorrowDate();
    this.loadTomorrowConcerts();
  },

  onShow() {
    // 重新启动倒计时
    this.startCountdownTimer();
  },

  onHide() {
    // 清除定时器
    this.clearCountdownTimer();
  },

  onUnload() {
    this.clearCountdownTimer();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({ refreshing: true });
    this.loadTomorrowConcerts().then(() => {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
    });
  },

  // 设置明天日期
  setTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = formatDate(tomorrow, 'MM月DD日');
    this.setData({ tomorrowDate });
  },

  // 加载明天开售的演唱会
  async loadTomorrowConcerts() {
    this.setData({ loading: true });

    try {
      const result = await api.getTomorrowConcerts();
      const concerts = (result || []).map(concert => ({
        ...concert,
        countdown: this.calculateCountdown(concert.platforms)
      }));

      // 按开售时间排序
      concerts.sort((a, b) => {
        const timeA = this.getEarliestOpenTime(a.platforms);
        const timeB = this.getEarliestOpenTime(b.platforms);
        const tsA = Number.isFinite(new Date(timeA).getTime()) ? new Date(timeA).getTime() : Number.MAX_SAFE_INTEGER;
        const tsB = Number.isFinite(new Date(timeB).getTime()) ? new Date(timeB).getTime() : Number.MAX_SAFE_INTEGER;
        return tsA - tsB;
      });

      this.setData({
        concerts,
        groupedConcerts: this.groupConcertsByOpenTime(concerts)
      });
      this.startCountdownTimer();
    } catch (err) {
      console.error('加载失败:', err);
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 获取最早的开售时间
  getEarliestOpenTime(platforms) {
    if (!platforms) return null;

    let earliest = null;
    Object.values(platforms).forEach(platform => {
      if (platform.openTime) {
        if (!earliest || new Date(platform.openTime) < new Date(earliest)) {
          earliest = platform.openTime;
        }
      }
    });
    return earliest;
  },

  // 计算倒计时
  calculateCountdown(platforms) {
    const openTime = this.getEarliestOpenTime(platforms);
    if (!openTime) return null;
    return getCountdown(openTime);
  },

  formatTimeLabel(openTime) {
    if (!openTime) return '待公布';
    const date = new Date(openTime);
    if (!Number.isFinite(date.getTime())) return '待公布';
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  },

  groupConcertsByOpenTime(concerts = []) {
    const groups = {};
    concerts.forEach((concert) => {
      const openTime = this.getEarliestOpenTime(concert.platforms);
      const timeLabel = this.formatTimeLabel(openTime);
      if (!groups[timeLabel]) {
        groups[timeLabel] = {
          timeLabel,
          sortTime: openTime ? new Date(openTime).getTime() : Number.MAX_SAFE_INTEGER,
          list: []
        };
      }
      groups[timeLabel].list.push({
        ...concert,
        openTimeLabel: timeLabel
      });
    });

    return Object.values(groups)
      .sort((a, b) => a.sortTime - b.sortTime)
      .map((group) => ({
        timeLabel: group.timeLabel,
        list: group.list
      }));
  },

  // 启动倒计时定时器
  startCountdownTimer() {
    this.clearCountdownTimer();

    this.timer = setInterval(() => {
      const concerts = this.data.concerts.map(concert => ({
        ...concert,
        countdown: this.calculateCountdown(concert.platforms)
      }));
      this.setData({
        concerts,
        groupedConcerts: this.groupConcertsByOpenTime(concerts)
      });
    }, 1000);
  },

  // 清除倒计时定时器
  clearCountdownTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 订阅演唱会
  async onSubscribe(e) {
    const fromDetail = e.detail && e.detail.concert;
    const fromDataset = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.concert;
    const concert = fromDetail || fromDataset;
    const app = getApp();

    if (!concert || !concert._id) {
      return;
    }

    if (!app.globalData.openid) {
      showToast('请先登录');
      return;
    }

    try {
      const subscribed = !concert.subscribed;
      await api.subscribeConcert(concert._id, subscribed);

      const concerts = this.data.concerts.map(item => {
        if (item._id === concert._id) {
          return { ...item, subscribed };
        }
        return item;
      });

      this.setData({
        concerts,
        groupedConcerts: this.groupConcertsByOpenTime(concerts)
      });
      showToast(subscribed ? '订阅成功，开售前会提醒您' : '已取消订阅');
    } catch (err) {
      console.error('订阅失败:', err);
      showToast('操作失败');
    }
  },

  // 查看详情
  onTapConcert(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 请求订阅消息授权
  async onRequestSubscribe(e) {
    const { concertId } = e.currentTarget.dataset;

    try {
      // 请求订阅消息授权
      const res = await wx.requestSubscribeMessage({
        tmplIds: ['your-template-id'] // 替换为实际的模板ID
      });

      if (res['your-template-id'] === 'accept') {
        showToast('订阅成功');
      }
    } catch (err) {
      console.error('订阅消息授权失败:', err);
    }
  }
});
