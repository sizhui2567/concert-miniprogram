// pages/index/index.js
const api = require('../../utils/api');
const { HOT_CITIES, PAGE_SIZE } = require('../../utils/constants');
const { showToast, debounce } = require('../../utils/util');


Page({
  data: {
    searchKeyword: '',
    hotCities: HOT_CITIES,
    selectedCity: '全部',
    concerts: [],
    page: 1,
    hasMore: true,
    loading: false,
    refreshing: false,
    initResult: '' // 用于显示初始化结果
  },

  onLoad() {
    // 创建防抖搜索函数
    this.debouncedSearch = debounce(this.doSearch.bind(this), 500);
    this.loadConcerts();

    // 调用 initDatabase 函数进行测试
    api.initDatabase('all') // 可选值：'all', 'artists', 'concerts', 'admin'
      .then(data => {
        console.log('数据库初始化成功：', data);
        this.setData({
          initResult: JSON.stringify(data, null, 2) // 格式化显示结果
        });
      })
      .catch(err => {
        console.error('数据库初始化失败：', err);
        this.setData({
          initResult: `初始化失败：${err.message}`
        });
      });
  },

  onShow() {
    // 刷新订阅状态
    if (this.data.concerts.length > 0) {
      this.refreshSubscriptionStatus();
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
      return item;
    });
  },

  // 加载演唱会列表
  async loadConcerts() {
    const { selectedCity, searchKeyword } = this.data;
    this.setData({ loading: true });

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
      this.setData({ concerts: [] });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载更多
  async loadMore() {
    const { selectedCity, searchKeyword, page, concerts } = this.data;
    this.setData({ loading: true });

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
  onTapConcert(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  }
});
