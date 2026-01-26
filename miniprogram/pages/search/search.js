// pages/search/search.js
const api = require('../../utils/api');
const { HOT_CITIES, STAGES, PAGE_SIZE } = require('../../utils/constants');
const { showToast } = require('../../utils/util');

Page({
  data: {
    keyword: '',
    hotCities: HOT_CITIES.slice(1), // 不包含"全部"
    stages: Object.values(STAGES).filter(s => s !== '已结束'),
    selectedCity: '',
    selectedStage: '',
    sortBy: 'date', // date, hot
    concerts: [],
    page: 1,
    hasMore: true,
    loading: false,
    showFilter: false,
    searchHistory: []
  },

  onLoad(options) {
    // 加载搜索历史
    this.loadSearchHistory();

    // 如果有传入关键词
    if (options.keyword) {
      this.setData({ keyword: options.keyword });
      this.doSearch();
    }
  },

  // 加载搜索历史
  loadSearchHistory() {
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ searchHistory: history });
  },

  // 保存搜索历史
  saveSearchHistory(keyword) {
    if (!keyword.trim()) return;

    let history = wx.getStorageSync('searchHistory') || [];
    // 移除重复项
    history = history.filter(item => item !== keyword);
    // 添加到开头
    history.unshift(keyword);
    // 最多保留10条
    history = history.slice(0, 10);

    wx.setStorageSync('searchHistory', history);
    this.setData({ searchHistory: history });
  },

  // 清空搜索历史
  onClearHistory() {
    wx.setStorageSync('searchHistory', []);
    this.setData({ searchHistory: [] });
    showToast('已清空');
  },

  // 输入变化
  onSearch(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 确认搜索
  onConfirmSearch(e) {
    const keyword = e.detail.value || this.data.keyword;
    if (keyword.trim()) {
      this.saveSearchHistory(keyword.trim());
      this.doSearch();
    }
  },

  // 点击搜索历史
  onTapHistory(e) {
    const keyword = e.currentTarget.dataset.keyword;
    this.setData({ keyword });
    this.doSearch();
  },

  // 执行搜索
  async doSearch() {
    const { keyword, selectedCity, selectedStage, sortBy } = this.data;

    this.setData({
      page: 1,
      hasMore: true,
      loading: true,
      concerts: []
    });

    try {
      const result = await api.getConcerts({
        keyword,
        city: selectedCity,
        stage: selectedStage,
        sortBy,
        page: 1,
        pageSize: PAGE_SIZE
      });

      this.setData({
        concerts: result.list || [],
        hasMore: (result.list || []).length >= PAGE_SIZE
      });
    } catch (err) {
      console.error('搜索失败:', err);
      showToast('搜索失败，请重试');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载更多
  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return;

    const { keyword, selectedCity, selectedStage, sortBy, page, concerts } = this.data;
    this.setData({ loading: true });

    try {
      const result = await api.getConcerts({
        keyword,
        city: selectedCity,
        stage: selectedStage,
        sortBy,
        page: page + 1,
        pageSize: PAGE_SIZE
      });

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

  // 触底加载
  onReachBottom() {
    this.loadMore();
  },

  // 切换筛选面板
  onToggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  // 选择城市筛选
  onSelectCity(e) {
    const city = e.currentTarget.dataset.city;
    const selectedCity = this.data.selectedCity === city ? '' : city;
    this.setData({ selectedCity });
    this.doSearch();
  },

  // 选择阶段筛选
  onSelectStage(e) {
    const stage = e.currentTarget.dataset.stage;
    const selectedStage = this.data.selectedStage === stage ? '' : stage;
    this.setData({ selectedStage });
    this.doSearch();
  },

  // 切换排序
  onChangeSort(e) {
    const sortBy = e.currentTarget.dataset.sort;
    if (sortBy !== this.data.sortBy) {
      this.setData({ sortBy });
      this.doSearch();
    }
  },

  // 重置筛选
  onResetFilter() {
    this.setData({
      selectedCity: '',
      selectedStage: '',
      sortBy: 'date'
    });
    this.doSearch();
  },

  // 订阅演唱会
  async onSubscribe(e) {
    const { concert } = e.detail;
    const app = getApp();

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

      this.setData({ concerts });
      showToast(subscribed ? '订阅成功' : '已取消订阅');
    } catch (err) {
      console.error('订阅失败:', err);
      showToast('操作失败');
    }
  },

  // 返回上一页
  onBack() {
    wx.navigateBack();
  }
});
