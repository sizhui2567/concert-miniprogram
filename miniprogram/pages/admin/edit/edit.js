// pages/admin/edit/edit.js
const api = require('../../../utils/api');
const { STAGES, PLATFORM_LIST, HOT_CITIES } = require('../../../utils/constants');
const { showToast, showLoading, hideLoading, formatDate } = require('../../../utils/util');

Page({
  data: {
    isEdit: false,
    concertId: '',
    formData: {
      title: '',
      artist: '',
      artistId: '',
      city: '',
      venue: '',
      province: '',
      dates: [],
      stage: '网传',
      platforms: {
        damai: { available: false, url: '', openTime: '' },
        maoyan: { available: false, url: '', openTime: '' },
        douyin: { available: false, url: '', openTime: '' },
        xiecheng: { available: false, url: '', openTime: '' },
        piaoxingqiu: { available: false, url: '', openTime: '' }
      },
      priceRange: '',
      poster: ''
    },
    stages: Object.values(STAGES).filter(s => s !== '已结束'),
    stageIndex: 0,
    platformList: PLATFORM_LIST,
    cities: HOT_CITIES.slice(1),
    cityIndex: 0,
    artists: [],
    artistIndex: 0,
    selectedDates: [],
    showDatePicker: false,
    tempDate: ''
  },

  onLoad(options) {
    this.loadArtists();

    if (options.id) {
      this.setData({
        isEdit: true,
        concertId: options.id
      });
      this.loadConcertDetail(options.id);
      wx.setNavigationBarTitle({ title: '编辑演唱会' });
    } else {
      wx.setNavigationBarTitle({ title: '新增演唱会' });
    }
  },

  // 加载艺人列表
  async loadArtists() {
    try {
      const result = await api.getArtists({ pageSize: 100 });
      const artists = result.list || [];
      this.setData({ artists });
    } catch (err) {
      console.error('加载艺人失败:', err);
    }
  },

  // 加载演唱会详情
  async loadConcertDetail(id) {
    showLoading('加载中...');

    try {
      const concert = await api.getConcertDetail(id);

      // 找到对应的阶段索引
      const stageIndex = this.data.stages.indexOf(concert.stage);

      // 找到对应的城市索引
      const cityIndex = this.data.cities.indexOf(concert.city);

      // 找到对应的艺人索引
      const artistIndex = this.data.artists.findIndex(a => a._id === concert.artistId);

      this.setData({
        formData: {
          title: concert.title || '',
          artist: concert.artist || '',
          artistId: concert.artistId || '',
          city: concert.city || '',
          venue: concert.venue || '',
          province: concert.province || '',
          dates: concert.dates || [],
          stage: concert.stage || '网传',
          platforms: concert.platforms || this.data.formData.platforms,
          priceRange: concert.priceRange || '',
          poster: concert.poster || ''
        },
        selectedDates: concert.dates || [],
        stageIndex: stageIndex >= 0 ? stageIndex : 0,
        cityIndex: cityIndex >= 0 ? cityIndex : 0,
        artistIndex: artistIndex >= 0 ? artistIndex : 0
      });
    } catch (err) {
      console.error('加载详情失败:', err);
      showToast('加载失败');
    } finally {
      hideLoading();
    }
  },

  // 输入标题
  onInputTitle(e) {
    this.setData({ 'formData.title': e.detail.value });
  },

  // 选择艺人
  onSelectArtist(e) {
    const index = e.detail.value;
    const artist = this.data.artists[index];
    if (artist) {
      this.setData({
        artistIndex: index,
        'formData.artist': artist.name,
        'formData.artistId': artist._id
      });
    }
  },

  // 选择城市
  onSelectCity(e) {
    const index = e.detail.value;
    this.setData({
      cityIndex: index,
      'formData.city': this.data.cities[index]
    });
  },

  // 输入场馆
  onInputVenue(e) {
    this.setData({ 'formData.venue': e.detail.value });
  },

  // 选择日期
  onSelectDate(e) {
    const date = e.detail.value;
    const { selectedDates } = this.data;

    if (!selectedDates.includes(date)) {
      const newDates = [...selectedDates, date].sort();
      this.setData({
        selectedDates: newDates,
        'formData.dates': newDates
      });
    }
  },

  // 删除日期
  onRemoveDate(e) {
    const { date } = e.currentTarget.dataset;
    const selectedDates = this.data.selectedDates.filter(d => d !== date);
    this.setData({
      selectedDates,
      'formData.dates': selectedDates
    });
  },

  // 输入价格区间
  onInputPrice(e) {
    this.setData({ 'formData.priceRange': e.detail.value });
  },

  // 选择阶段
  onSelectStage(e) {
    const index = e.detail.value;
    this.setData({
      stageIndex: index,
      'formData.stage': this.data.stages[index]
    });
  },

  // 切换平台开售状态
  onTogglePlatform(e) {
    const { platform } = e.currentTarget.dataset;
    const key = `formData.platforms.${platform}.available`;
    const current = this.data.formData.platforms[platform].available;
    this.setData({ [key]: !current });
  },

  // 输入平台链接
  onInputPlatformUrl(e) {
    const { platform } = e.currentTarget.dataset;
    const key = `formData.platforms.${platform}.url`;
    this.setData({ [key]: e.detail.value });
  },

  // 输入平台开售时间
  onInputPlatformTime(e) {
    const { platform } = e.currentTarget.dataset;
    const key = `formData.platforms.${platform}.openTime`;
    this.setData({ [key]: e.detail.value });
  },

  // 选择海报图片
  async onChoosePoster() {
    try {
      const fileID = await api.chooseAndUploadImage('poster');
      this.setData({ 'formData.poster': fileID });
      showToast('上传成功');
    } catch (err) {
      console.error('上传失败:', err);
      if (err.errMsg !== 'chooseImage:fail cancel') {
        showToast('上传失败');
      }
    }
  },

  // 删除海报
  onRemovePoster() {
    this.setData({ 'formData.poster': '' });
  },

  // 保存草稿
  async onSaveDraft() {
    await this.saveConcert(true);
  },

  // 发布
  async onPublish() {
    if (!this.validateForm()) return;
    await this.saveConcert(false);
  },

  // 表单验证
  validateForm() {
    const { formData } = this.data;

    if (!formData.title.trim()) {
      showToast('请输入演唱会名称');
      return false;
    }
    if (!formData.artist) {
      showToast('请选择艺人');
      return false;
    }
    if (!formData.city) {
      showToast('请选择城市');
      return false;
    }
    if (!formData.venue.trim()) {
      showToast('请输入场馆');
      return false;
    }
    if (formData.dates.length === 0) {
      showToast('请选择演出日期');
      return false;
    }

    return true;
  },

  // 保存演唱会
  async saveConcert(isDraft) {
    showLoading('保存中...');

    try {
      const { formData, isEdit, concertId } = this.data;

      const concertData = {
        ...formData,
        _id: isEdit ? concertId : undefined,
        updateTime: new Date().toISOString()
      };

      await api.saveConcert(concertData, isDraft);
      showToast(isDraft ? '草稿已保存' : '发布成功');

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (err) {
      console.error('保存失败:', err);
      showToast('保存失败');
    } finally {
      hideLoading();
    }
  }
});
