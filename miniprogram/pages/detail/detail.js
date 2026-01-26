// pages/detail/detail.js
const api = require('../../utils/api');
const { PLATFORMS, PLATFORM_LIST, STAGE_COLORS } = require('../../utils/constants');
const { formatDate, formatDateRange, showToast, copyToClipboard } = require('../../utils/util');

Page({
  data: {
    concertId: '',
    concert: null,
    loading: true,
    platforms: PLATFORMS,
    platformList: PLATFORM_LIST,
    stageColors: STAGE_COLORS,
    relatedConcerts: []
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ concertId: options.id });
      this.loadConcertDetail();
    }
  },

  // 加载演唱会详情
  async loadConcertDetail() {
    this.setData({ loading: true });

    try {
      const concert = await api.getConcertDetail(this.data.concertId);

      // 处理日期显示
      if (concert.dates) {
        concert.dateDisplay = formatDateRange(concert.dates);
        concert.datesFormatted = concert.dates.map(d => formatDate(d, 'YYYY年MM月DD日'));
      }

      // 处理阶段历史时间线
      if (concert.stageHistory) {
        concert.stageHistory = concert.stageHistory.map(item => ({
          ...item,
          timeFormatted: formatDate(item.time, 'MM-DD HH:mm')
        }));
      }

      this.setData({
        concert,
        loading: false
      });

      // 设置页面标题
      wx.setNavigationBarTitle({
        title: concert.title || '演唱会详情'
      });

      // 加载相关演唱会
      this.loadRelatedConcerts(concert.artistId);
    } catch (err) {
      console.error('加载详情失败:', err);
      showToast('加载失败');
      this.setData({ loading: false });
    }
  },

  // 加载相关演唱会
  async loadRelatedConcerts(artistId) {
    if (!artistId) return;

    try {
      const result = await api.getConcerts({
        artistId,
        pageSize: 5
      });

      // 过滤掉当前演唱会
      const relatedConcerts = (result.list || []).filter(
        item => item._id !== this.data.concertId
      );

      this.setData({ relatedConcerts });
    } catch (err) {
      console.error('加载相关演唱会失败:', err);
    }
  },

  // 点击平台购票
  onTapPlatform(e) {
    const { platform } = e.currentTarget.dataset;
    const platformData = this.data.concert.platforms[platform];

    if (!platformData || !platformData.available) {
      showToast('该平台暂未开售');
      return;
    }

    if (platformData.url) {
      // 复制链接
      copyToClipboard(platformData.url).then(() => {
        showToast('链接已复制，请在浏览器中打开');
      });
    } else {
      showToast('暂无购票链接');
    }
  },

  // 订阅/取消订阅
  async onToggleSubscribe() {
    const { concert } = this.data;
    const app = getApp();

    if (!app.globalData.openid) {
      showToast('请先登录');
      return;
    }

    try {
      const subscribed = !concert.subscribed;
      await api.subscribeConcert(concert._id, subscribed);

      this.setData({
        'concert.subscribed': subscribed
      });

      showToast(subscribed ? '订阅成功' : '已取消订阅');
    } catch (err) {
      console.error('订阅失败:', err);
      showToast('操作失败');
    }
  },

  // 分享
  onShareAppMessage() {
    const { concert } = this.data;
    return {
      title: concert ? concert.title : '演唱会查询',
      path: `/pages/detail/detail?id=${this.data.concertId}`,
      imageUrl: concert ? concert.poster : ''
    };
  },

  // 查看相关演唱会
  onTapRelated(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 预览海报
  onPreviewPoster() {
    const { concert } = this.data;
    if (concert && concert.poster) {
      wx.previewImage({
        urls: [concert.poster],
        current: concert.poster
      });
    }
  }
});
