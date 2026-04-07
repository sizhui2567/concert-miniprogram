// pages/index/index.js - 优化版本
// 使用 optimize-api 替代 api，添加缓存和更好的错误处理

const api = require('../../utils/optimize-api');
const { HOT_CITIES, PAGE_SIZE } = require('../../utils/constants');
const { showToast, debounce } = require('../../utils/util');
const { ErrorHandler } = require('../../utils/error-handler');

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
    refreshing: false,
    isDev: false,
    initLoading: false,
    initResult: '',
    // 新增：骨架屏显示状态
    showSkeleton: true
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

  // 下拉刷新
  onPullDownRefresh() {
    // 清除缓存，强制刷新
    api.clearCache();
    
    this.setData({
      page: 1,
      hasMore: true,
      refreshing: true
    });
    this.loadConcerts().then(() => {
      wx.stopPullDownRefresh();
      this.setData({ refreshing: false });
      showToast('刷新成功', 'success');
    }).catch(() => {
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
      PLATFORM_KEYS.forEach(key => {
        item.platforms[key] = item.platforms[key] || { ...defaultPlatform };
      });
      
      // 确保dates数组存在
      if (!item.dates) {
        item.dates = [];
      }
      
      item.availablePlatforms = PLATFORM_KEYS
        .filter(key => item.platforms[key]?.available)
        .map(key => PLATFORM_NAME_MAP[key]);
        
      item.stageClass = STAGE_CLASS_MAP[item.stage] || 'unknown';
      return item;
    });
  },

  getEnvVersion() {
    let envVersion = 'release';
    try {
      const accountInfo = wx.getAccountInfoSync();
      if (accountInfo?.miniProgram?.envVersion) {
        envVersion = accountInfo.miniProgram.envVersion;
      }
    } catch (err) {
      console.warn('无法获取运行环境版本:', err);
    }
    return envVersion;
  },

  // 优化：分批初始化数据，避免超时（根据数据库字段规范）
  async onInitDatabase() {
    if (!this.data.isDev || this.data.initLoading) {
      return;
    }

    this.setData({ initLoading: true, initResult: '' });
    wx.showLoading({ title: '步骤 1/4...' });
    
    // 根据数据库字段规范的4个步骤
    const steps = [
      { name: '艺人数据', step: 1 },
      { name: '演唱会数据', step: 2 },
      { name: '管理员设置', step: 3 },
      { name: '用户数据', step: 4 }
    ];
    
    const results = [];

    try {
      for (const s of steps) {
        wx.showLoading({ title: `步骤 ${s.step}/4: ${s.name}...` });
        
        const { result } = await wx.cloud.callFunction({
          name: 'init-simple',
          data: { step: s.step }
        });

        if (result.success) {
          results.push(`${s.name}: ${result.message}`);
          console.log(`步骤${s.step}完成:`, result.message);
        } else {
          throw new Error(`${s.name}失败: ${result.message}`);
        }

        // 每步之间稍微延迟，避免请求过快
        if (s.step < 4) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      wx.hideLoading();
      
      this.setData({
        initResult: results.join('\n')
      });
      showToast('初始化成功', 'success');
      
      // 刷新列表
      this.loadConcerts();
    } catch (err) {
      wx.hideLoading();
      console.error('数据库初始化失败：', err);
      this.setData({
        initResult: `初始化失败：${err.message}\n\n建议：\n1. 检查 init-simple 云函数是否已部署\n2. 重新点击按钮重试`
      });
      ErrorHandler.handle(err, 'initDatabase');
    } finally {
      this.setData({ initLoading: false });
    }
  },

  // 优化：加载演唱会列表（带缓存）
  async loadConcerts() {
    const { selectedCity, searchKeyword } = this.data;
    
    this.setData({ 
      loading: true,
      showSkeleton: this.data.concerts.length === 0 // 只在首次显示骨架屏
    });

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
      const list = result?.list || [];
      const concerts = this.processConcertData(list);
      
      this.setData({
        concerts: concerts,
        page: 1,
        hasMore: concerts.length >= PAGE_SIZE,
        showSkeleton: false
      });
    } catch (err) {
      // 使用错误处理器显示友好的错误提示
      ErrorHandler.handle(err, 'loadConcerts');
      
      this.setData({ 
        concerts: [],
        showSkeleton: false
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 优化：加载更多（带缓存）
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

      const list = result?.list || [];
      const newList = this.processConcertData(list);
      
      this.setData({
        concerts: [...concerts, ...newList],
        page: page + 1,
        hasMore: newList.length >= PAGE_SIZE
      });
    } catch (err) {
      ErrorHandler.handle(err, 'loadMore');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 刷新订阅状态
  async refreshSubscriptionStatus() {
    // 可以在这里调用API获取用户订阅状态并更新
    // 使用缓存的 API 避免重复请求
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

  // 订阅演唱会
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
      showToast(subscribed ? '订阅成功' : '已取消订阅', 'success');
    } catch (err) {
      ErrorHandler.handle(err, 'onSubscribe');
    }
  },

  // 查看详情
  onTapConcert(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 新增：分享功能
  onShareAppMessage() {
    const { selectedCity, searchKeyword } = this.data;
    let title = '发现热门演唱会';
    
    if (searchKeyword) {
      title = `搜索：${searchKeyword}`;
    } else if (selectedCity !== '全部') {
      title = `${selectedCity}的演唱会`;
    }
    
    return {
      title,
      path: `/pages/index/index?city=${selectedCity}&keyword=${searchKeyword}`
    };
  }
});
