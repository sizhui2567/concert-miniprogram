// pages/admin/list/list.js
const api = require('../../../utils/api');
const { PAGE_SIZE, STAGES } = require('../../../utils/constants');
const { showToast, showModal, formatDate } = require('../../../utils/util');

Page({
  data: {
    concerts: [],
    stages: Object.values(STAGES),
    selectedStage: '',
    keyword: '',
    page: 1,
    hasMore: true,
    loading: false
  },

  onLoad() {
    this.checkAdminAuth();
    this.loadConcerts();
  },

  onShow() {
    // 从编辑页返回时刷新列表
    this.loadConcerts();
  },

  // 检查管理员权限
  checkAdminAuth() {
    const isAdmin = wx.getStorageSync('isAdmin');
    if (!isAdmin) {
      wx.redirectTo({
        url: '/pages/admin/login/login'
      });
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadConcerts().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 触底加载
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMore();
    }
  },

  // 加载演唱会列表
  async loadConcerts() {
    const { keyword, selectedStage } = this.data;
    this.setData({ loading: true, page: 1 });

    try {
      const result = await api.getConcerts({
        keyword,
        stage: selectedStage,
        page: 1,
        pageSize: PAGE_SIZE,
        includeAll: true // 包含草稿
      });

      const concerts = (result.list || []).map(item => ({
        ...item,
        updateTimeFormatted: formatDate(item.updateTime, 'MM-DD HH:mm')
      }));

      this.setData({
        concerts,
        hasMore: concerts.length >= PAGE_SIZE
      });
    } catch (err) {
      console.error('加载失败:', err);
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载更多
  async loadMore() {
    const { keyword, selectedStage, page, concerts } = this.data;
    this.setData({ loading: true });

    try {
      const result = await api.getConcerts({
        keyword,
        stage: selectedStage,
        page: page + 1,
        pageSize: PAGE_SIZE,
        includeAll: true
      });

      const newList = (result.list || []).map(item => ({
        ...item,
        updateTimeFormatted: formatDate(item.updateTime, 'MM-DD HH:mm')
      }));

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

  // 搜索
  onSearch(e) {
    this.setData({ keyword: e.detail.value });
    this.loadConcerts();
  },

  // 筛选阶段
  onSelectStage(e) {
    const stage = e.currentTarget.dataset.stage;
    const selectedStage = this.data.selectedStage === stage ? '' : stage;
    this.setData({ selectedStage });
    this.loadConcerts();
  },

  // 新增演唱会
  onAddConcert() {
    wx.navigateTo({
      url: '/pages/admin/edit/edit'
    });
  },

  // 编辑演唱会
  onEditConcert(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/admin/edit/edit?id=${id}`
    });
  },

  // 删除演唱会
  async onDeleteConcert(e) {
    const { id, title } = e.currentTarget.dataset;

    const res = await showModal({
      title: '确认删除',
      content: `确定要删除"${title}"吗？此操作不可恢复。`
    });

    if (!res.confirm) return;

    try {
      await api.deleteConcert(id);
      showToast('删除成功');
      this.loadConcerts();
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败');
    }
  },

  // 艺人管理
  onGoArtists() {
    wx.navigateTo({
      url: '/pages/admin/artists/artists'
    });
  },

  // 退出登录
  async onLogout() {
    const res = await showModal({
      title: '确认退出',
      content: '确定要退出管理后台吗？'
    });

    if (res.confirm) {
      wx.removeStorageSync('isAdmin');
      wx.redirectTo({
        url: '/pages/admin/login/login'
      });
    }
  }
});
