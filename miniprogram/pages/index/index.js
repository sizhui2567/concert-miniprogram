// pages/index/index.js
const api = require('../../utils/api');
const { HOT_CITIES, PAGE_SIZE } = require('../../utils/constants');
const { showToast, debounce } = require('../../utils/util');

const PLATFORM_KEYS = ['damai', 'maoyan', 'douyin', 'xiecheng', 'piaoxingqiu'];
const PLATFORM_NAME_MAP = {
  damai: '大麦',
  maoyan: '猫眼',
  douyin: '抖音',
  xiecheng: '携程',
  piaoxingqiu: '票星球'
};

const STAGE_CLASS_MAP = {
  '网传': 'rumor',
  '上架': 'listed',
  '一开': 'first',
  '二开': 'second',
  '三开': 'third',
  '已结束': 'ended'
};

Page({
  data: {
    searchKeyword: '',
    hotCities: HOT_CITIES,
    selectedCity: '全部',
    concerts: [],
    page: 1,
    hasMore: true,
    loading: false,
    isShowLoading: false,
    loadError: '',
    refreshing: false,
    isDev: false,
    initLoading: false,
    initResult: ''
  },

  onLoad() {
    // 创建防抖搜索函数
    this.debouncedSearch = debounce(this.doSearch.bind(this), 500);
    this.setData({
      isDev: this.getEnvVersion() === 'develop'
    });
    this.loadConcerts();
  },

  onShow() {
    // 刷新订阅状态
    if (this.data.concerts.length > 0) {
      this.refreshSubscriptionStatus();
    }
  },

  onUnload() {
    this.clearLoadingTimer();
  },

  // 防闪烁：请求超过300ms再显示骨架
  startLoadingGuard() {
    this.clearLoadingTimer();
    this.loadingTimer = setTimeout(() => {
      if (this.data.loading) {
        this.setData({ isShowLoading: true });
      }
    }, 300);
  },

  clearLoadingGuard() {
    this.clearLoadingTimer();
    if (this.data.isShowLoading) {
      this.setData({ isShowLoading: false });
    }
  },

  clearLoadingTimer() {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
      this.loadingTimer = null;
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true,
      refreshing: true
    });
    this.loadConcerts().then(() => {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
    });
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  // 处理演唱会数据，确保platforms字段完整
  processConcertData(list) {
    const defaultPlatform = { available: false, url: '', openTime: '' };
    return (list || []).map(item => {
      // 确保platforms对象存在
      if (!item.platforms) {
        item.platforms = {};
      }
      // 确保每个平台的数据都存在
      item.platforms.damai = item.platforms.damai || defaultPlatform;
      item.platforms.maoyan = item.platforms.maoyan || defaultPlatform;
      item.platforms.douyin = item.platforms.douyin || defaultPlatform;
      item.platforms.xiecheng = item.platforms.xiecheng || defaultPlatform;
      item.platforms.piaoxingqiu = item.platforms.piaoxingqiu || defaultPlatform;
      // 确保dates数组存在
      if (!item.dates) {
        item.dates = [];
      }
      item.availablePlatforms = PLATFORM_KEYS.filter((key) => {
        return item.platforms[key] && item.platforms[key].available;
      }).map((key) => PLATFORM_NAME_MAP[key]);
      item.stageClass = STAGE_CLASS_MAP[item.stage] || 'unknown';
      return item;
    });
  },

  getEnvVersion() {
    let envVersion = 'release';
    try {
      const accountInfo = wx.getAccountInfoSync();
      if (accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion) {
        envVersion = accountInfo.miniProgram.envVersion;
      }
    } catch (err) {
      console.warn('无法获取运行环境版本:', err);
    }
    return envVersion;
  },

  async onInitDatabase() {
    if (!this.data.isDev || this.data.initLoading) {
      return;
    }

    this.setData({ initLoading: true, initResult: '' });
    try {
      const data = await api.initDatabase('all');
      console.log('数据库初始化成功：', data);
      this.setData({
        initResult: JSON.stringify(data, null, 2)
      });
      showToast('初始化成功');
    } catch (err) {
      console.error('数据库初始化失败：', err);
      this.setData({
        initResult: `初始化失败：${err.message}`
      });
      showToast('初始化失败');
    } finally {
      this.setData({ initLoading: false });
    }
  },

  // 加载演唱会列表
  async loadConcerts() {
    const { selectedCity, searchKeyword } = this.data;
    this.setData({
      loading: true,
      loadError: ''
    });
    this.startLoadingGuard();

    try {
      const city = selectedCity === '全部' ? '' : selectedCity;
      const result = await api.getConcerts({
        keyword: searchKeyword,
        city,
        page: 1,
        pageSize: PAGE_SIZE
      });

      console.log('加载演唱会结果:', result);

      // 安全处理返回结果
      const list = (result && result.list) ? result.list : [];
      const concerts = this.processConcertData(list);
      this.setData({
        concerts: concerts,
        page: 1,
        hasMore: concerts.length >= PAGE_SIZE
      });
    } catch (err) {
      console.error('加载演唱会失败:', err);
      showToast('加载失败，请重试');
      // 确保错误时也设置空数组，避免页面空白
      this.setData({
        concerts: [],
        loadError: (err && err.message) ? err.message : '网络异常，请稍后重试'
      });
    } finally {
      this.setData({ loading: false });
      this.clearLoadingGuard();
    }
  },

  // 加载更多
  async loadMore() {
    const { selectedCity, searchKeyword, page, concerts } = this.data;
    this.setData({ loading: true, loadError: '' });

    try {
      const city = selectedCity === '全部' ? '' : selectedCity;
      const result = await api.getConcerts({
        keyword: searchKeyword,
        city,
        page: page + 1,
        pageSize: PAGE_SIZE
      });

      // 安全处理返回结果
      const list = (result && result.list) ? result.list : [];
      const newList = this.processConcertData(list);
      this.setData({
        concerts: [...concerts, ...newList],
        page: page + 1,
        hasMore: newList.length >= PAGE_SIZE
      });
    } catch (err) {
      console.error('加载更多失败:', err);
      showToast('加载失败，请重试');
      this.setData({
        loadError: (err && err.message) ? err.message : '加载更多失败'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 刷新订阅状态
  async refreshSubscriptionStatus() {
    // 这里可以调用API获取用户订阅状态并更新
  },

  // 搜索输入变化
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.debouncedSearch();
  },

  // 执行搜索
  doSearch() {
    this.setData({
      page: 1,
      hasMore: true
    });
    this.loadConcerts();
  },

  // 清除搜索
  onClearSearch() {
    this.setData({ searchKeyword: '' });
    this.loadConcerts();
  },

  // 搜索确认
  onSearchConfirm(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.loadConcerts();
  },

  // 城市筛选
  onSelectCity(e) {
    const city = e.currentTarget.dataset.city;
    if (city !== this.data.selectedCity) {
      this.setData({
        selectedCity: city,
        page: 1,
        hasMore: true
      });
      this.loadConcerts();
    }
  },

  // 订阅演唱会 - 修复：使用currentTarget.dataset获取数据
  async onSubscribe(e) {
    const concert = e.currentTarget.dataset.concert;
    const app = getApp();

    if (!concert) {
      console.error('concert数据为空');
      return;
    }

    if (!app.globalData.openid) {
      showToast('请先登录');
      return;
    }

    try {
      const subscribed = !concert.subscribed;
      await api.subscribeConcert(concert._id, subscribed);

      // 更新本地状态
      const concerts = this.data.concerts.map(item => {
        if (item._id === concert._id) {
          return { ...item, subscribed };
        }
        return item;
      });

      this.setData({ concerts });
      showToast(subscribed ? '订阅成功' : '已取消订阅');
    } catch (err) {
      console.error('订阅失败:', err);
      showToast('操作失败，请重试');
    }
  },

  // 查看详情
  onTapTomorrowFast() {
    wx.switchTab({
      url: '/pages/tomorrow/tomorrow'
    });
  },

  onTapSubscribeFast() {
    wx.switchTab({
      url: '/pages/subscribe/subscribe'
    });
  },

  onTapHeatFast() {
    showToast('热度榜功能设计中');
  },

  onTapSeatMap(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      showToast('演出信息异常');
      return;
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}&focus=seatMap`
    });
  },

  onRetryLoad() {
    this.setData({
      page: 1,
      hasMore: true,
      loadError: ''
    });
    this.loadConcerts();
  },

  onTapConcert(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  }
});
