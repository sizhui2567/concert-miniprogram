// pages/detail/detail.js
const api = require('../../utils/api');
const { PLATFORMS, PLATFORM_LIST, STAGE_COLORS } = require('../../utils/constants');
const {
  formatDate,
  formatDateRange,
  showToast,
  showLoading,
  hideLoading,
  copyToClipboard,
  showModal
} = require('../../utils/util');
const { locateSeat, toUserDot } = require('../../utils/seat-locator');

function chooseImageList(count) {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => resolve(res.tempFilePaths || []),
      fail: (err) => reject(err)
    });
  });
}

function buildCloudPath(prefix, filePath) {
  const ext = (String(filePath).split('.').pop() || 'jpg').toLowerCase();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${Date.now()}_${rand}.${ext}`;
}

Page({
  data: {
    concertId: '',
    concert: null,
    focusTarget: '',
    loading: true,
    isAdmin: false,
    platforms: PLATFORMS,
    platformList: PLATFORM_LIST,
    stageColors: STAGE_COLORS,
    relatedConcerts: [],

    selectedAreaId: '',
    selectedSeatArea: null,

    seatInput: '',
    seatLocateError: '',
    seatLocateResult: null,
    lastLocatedAreaId: '',

    seatViewNote: '',
    seatViewImages: [],
    seatViewUploading: false,
    seatViewSaving: false,
    seatViewRatingOptions: [
      { label: '无遮挡', value: 'clear' },
      { label: '偏侧', value: 'side' },
      { label: '被挡', value: 'blocked' }
    ],
    seatViewRatingIndex: 0,
    seatViews: [],
    seatViewsLoading: false,
    seatViewsTotal: 0,
    seatViewStats: {
      clear: 0,
      side: 0,
      blocked: 0
    },

    buddyTypeOptions: [
      { label: '一起拍照', value: 'photo' },
      { label: '一起拼住', value: 'stay' },
      { label: '散场一起玩', value: 'afterparty' }
    ],
    buddyTypeIndex: 0,
    buddyExpectedCountOptions: [2, 3, 4, 5, 6],
    buddyExpectedCountIndex: 0,
    buddyContent: '',
    buddyContact: '',
    buddyLoading: false,
    buddySaving: false,
    buddyPosts: [],
    buddyPostsTotal: 0,

    announcementSortOptions: [
      { label: '按时间', value: 'time' },
      { label: '按热度', value: 'hot' }
    ],
    announcementSortIndex: 0,
    announcementStatusOptions: [
      { label: '已通过', value: 'approved' },
      { label: '待审核', value: 'pending' },
      { label: '已下线', value: 'offline' },
      { label: '全部', value: 'all' }
    ],
    announcementStatusIndex: 0,
    announcementAsOfficial: false,
    announcementContent: '',
    announcementSaving: false,
    announcementLoading: false,
    announcementMessages: [],
    announcementTotal: 0
  },

  onLoad(options) {
    if (!options.id) return;
    this.syncAdminState();
    this.setData({
      concertId: options.id,
      focusTarget: options.focus || ''
    });
    this.loadConcertDetail();
  },

  onShow() {
    this.syncAdminState();
  },

  syncAdminState() {
    const app = getApp();
    const isAdmin = !!((app.globalData && app.globalData.isAdmin) || wx.getStorageSync('isAdmin'));
    if (isAdmin !== this.data.isAdmin) {
      this.setData({ isAdmin });
    }
  },

  getCurrentOpenid() {
    const app = getApp();
    return (app.globalData && app.globalData.openid) || '';
  },

  async loadConcertDetail() {
    this.setData({
      loading: true,
      selectedAreaId: '',
      selectedSeatArea: null,
      seatInput: '',
      seatLocateError: '',
      seatLocateResult: null,
      lastLocatedAreaId: '',
      seatViewNote: '',
      seatViewImages: [],
      seatViewRatingIndex: 0,
      buddyTypeIndex: 0,
      buddyExpectedCountIndex: 0,
      buddyContent: '',
      buddyContact: '',
      buddyPosts: [],
      buddyPostsTotal: 0,
      announcementSortIndex: 0,
      announcementStatusIndex: 0,
      announcementAsOfficial: false,
      announcementContent: '',
      announcementSaving: false,
      announcementLoading: false,
      announcementMessages: [],
      announcementTotal: 0
    });

    try {
      const concert = await api.getConcertDetail(this.data.concertId);

      if (concert.dates) {
        concert.dateDisplay = formatDateRange(concert.dates);
        concert.datesFormatted = concert.dates.map((d) => formatDate(d, 'YYYY年M月D日'));
      }

      if (Array.isArray(concert.availablePlatforms) && concert.availablePlatforms.length > 0) {
        concert.availablePlatformsDisplay = concert.availablePlatforms.join(' / ');
      } else {
        concert.availablePlatformsDisplay = '';
      }

      if (concert.stageHistory) {
        concert.stageHistory = concert.stageHistory.map((item) => ({
          ...item,
          timeFormatted: formatDate(item.time, 'MM-DD HH:mm')
        }));
      }

      this.setData({
        concert,
        loading: false
      });

      if (this.data.focusTarget === 'seatMap') {
        this.tryFocusSeatMap(concert);
      }

      wx.setNavigationBarTitle({
        title: concert.title || '演唱会详情'
      });

      this.loadRelatedConcerts(concert.artistId);
      this.loadSeatViews();
      this.loadBuddyPosts();
      this.loadAnnouncementMessages();
    } catch (err) {
      console.error('loadConcertDetail failed:', err);
      showToast('加载失败');
      this.setData({ loading: false });
    }
  },

  tryFocusSeatMap(concert) {
    const hasSeatMap = !!(
      concert &&
      concert.seatMap &&
      Array.isArray(concert.seatMap.areas) &&
      concert.seatMap.areas.length
    );

    if (!hasSeatMap) {
      showToast('当前演出暂无座位图');
      this.setData({ focusTarget: '' });
      return;
    }

    setTimeout(() => {
      wx.pageScrollTo({
        selector: '#seatMapSection',
        duration: 260
      });
      this.setData({ focusTarget: '' });
    }, 120);
  },

  async loadRelatedConcerts(artistId) {
    if (!artistId) return;
    try {
      const result = await api.getConcerts({
        artistId,
        pageSize: 5
      });
      const relatedConcerts = (result.list || []).filter((item) => item._id !== this.data.concertId);
      this.setData({ relatedConcerts });
    } catch (err) {
      console.error('loadRelatedConcerts failed:', err);
    }
  },

  formatSeatRatingLabel(rating) {
    if (rating === 'side') return '偏侧';
    if (rating === 'blocked') return '被挡';
    return '无遮挡';
  },

  formatContentStatusLabel(status) {
    if (status === 'pending') return '待审核';
    if (status === 'offline') return '已下线';
    return '已通过';
  },

  formatSeatViewTime(value) {
    try {
      return formatDate(value, 'MM-DD HH:mm');
    } catch (e) {
      return '';
    }
  },

  formatBuddyTypeLabel(type) {
    if (type === 'stay') return '一起拼住';
    if (type === 'afterparty') return '散场活动';
    return '一起拍照';
  },

  formatBuddyTime(value) {
    try {
      return formatDate(value, 'MM-DD HH:mm');
    } catch (e) {
      return '';
    }
  },

  formatAnnouncementTime(value) {
    try {
      return formatDate(value, 'MM-DD HH:mm');
    } catch (e) {
      return '';
    }
  },

  async loadSeatViews() {
    if (!this.data.concertId) return;
    this.setData({ seatViewsLoading: true });
    try {
      const result = await api.getSeatViews(this.data.concertId, {
        page: 1,
        pageSize: 30,
        sortBy: 'time',
        status: 'approved'
      });

      const myOpenid = this.getCurrentOpenid();
      const list = (result.list || []).map((item) => ({
        ...item,
        showTime: this.formatSeatViewTime(item.createTime),
        ratingLabel: this.formatSeatRatingLabel(item.rating),
        statusLabel: this.formatContentStatusLabel(item.status),
        isMine: item.openid === myOpenid
      }));

      this.setData({
        seatViews: list,
        seatViewsTotal: result.total || 0,
        seatViewsLoading: false,
        seatViewStats: result.stats || { clear: 0, side: 0, blocked: 0 }
      });
    } catch (err) {
      console.error('loadSeatViews failed:', err);
      this.setData({ seatViewsLoading: false });
    }
  },

  async loadBuddyPosts() {
    if (!this.data.concertId) return;
    this.setData({ buddyLoading: true });
    try {
      const result = await api.getBuddyPosts(this.data.concertId, {
        page: 1,
        pageSize: 30,
        status: 'approved'
      });

      const myOpenid = this.getCurrentOpenid();
      const list = (result.list || []).map((item) => ({
        ...item,
        showTime: this.formatBuddyTime(item.createTime),
        typeLabel: this.formatBuddyTypeLabel(item.type),
        statusLabel: this.formatContentStatusLabel(item.status),
        isMine: item.openid === myOpenid
      }));

      this.setData({
        buddyPosts: list,
        buddyPostsTotal: result.total || 0,
        buddyLoading: false
      });
    } catch (err) {
      console.error('loadBuddyPosts failed:', err);
      this.setData({ buddyLoading: false });
    }
  },

  getAnnouncementSortValue() {
    return (this.data.announcementSortOptions[this.data.announcementSortIndex] || {}).value || 'time';
  },

  getAnnouncementStatusValue() {
    return (this.data.announcementStatusOptions[this.data.announcementStatusIndex] || {}).value || 'approved';
  },

  async loadAnnouncementMessages() {
    if (!this.data.concertId) return;
    this.setData({ announcementLoading: true });
    try {
      const sortBy = this.getAnnouncementSortValue();
      const status = this.data.isAdmin ? this.getAnnouncementStatusValue() : 'approved';
      const result = await api.getAnnouncementMessages(this.data.concertId, {
        page: 1,
        pageSize: 40,
        sortBy,
        status
      });

      const myOpenid = this.getCurrentOpenid();
      const list = (result.list || []).map((item) => ({
        ...item,
        showTime: this.formatAnnouncementTime(item.createTime),
        statusLabel: this.formatContentStatusLabel(item.status),
        isMine: item.openid === myOpenid
      }));

      this.setData({
        announcementMessages: list,
        announcementTotal: result.total || 0,
        announcementLoading: false,
        isAdmin: this.data.isAdmin || !!result.isAdmin
      });
    } catch (err) {
      console.error('loadAnnouncementMessages failed:', err);
      this.setData({ announcementLoading: false });
    }
  },

  onTapPlatform(e) {
    const { platform } = e.currentTarget.dataset;
    const allPlatforms = (this.data.concert && this.data.concert.platforms) || {};
    const platformData = allPlatforms[platform];

    if (!platformData || !platformData.available) {
      showToast('该平台暂未开售');
      return;
    }

    if (platformData.url) {
      copyToClipboard(platformData.url).then(() => {
        showToast('链接已复制，请在浏览器中打开');
      });
      return;
    }

    showToast('暂无购票链接');
  },

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

      this.setData({ 'concert.subscribed': subscribed });
      showToast(subscribed ? '订阅成功' : '已取消订阅');
    } catch (err) {
      console.error('onToggleSubscribe failed:', err);
      showToast('操作失败');
    }
  },

  onSeatAreaSelect(e) {
    const area = e.detail.area;
    try {
      wx.vibrateShort({ type: 'light' });
    } catch (err) {
      // vibrate is optional on some devices
    }
    this.setData({
      selectedAreaId: e.detail.areaId || '',
      selectedSeatArea: area || null
    });
  },

  onSeatAreaConfirm(e) {
    const area = e.detail.area;
    if (!area) return;
    showToast(`已选中 ${area.name}`);
  },

  onSeatInputChange(e) {
    this.setData({
      seatInput: e.detail.value || '',
      seatLocateError: ''
    });
  },

  onLocateSeat() {
    const seatInput = (this.data.seatInput || '').trim();
    this.locateByInput(seatInput, true);
  },

  locateByInput(seatInput, showSuccessToast = false) {
    const seatMap = this.data.concert && this.data.concert.seatMap;

    if (!seatMap || !Array.isArray(seatMap.areas) || !seatMap.areas.length) {
      if (showSuccessToast) showToast('当前演出暂无可定位座位图');
      return null;
    }

    if (!seatInput) {
      if (showSuccessToast) showToast('请输入座位号');
      return null;
    }

    const result = locateSeat(seatMap, seatInput);
    if (!result.ok) {
      this.setData({
        seatLocateResult: null,
        seatLocateError: result.error || '定位失败'
      });
      return null;
    }

    this.applyLocateResult(result, showSuccessToast);
    return result;
  },

  applyLocateResult(result, showSuccessToast = false) {
    const selectedArea = this.getSeatAreaById(result.areaId);
    this.setData({
      selectedAreaId: result.areaId,
      selectedSeatArea: selectedArea,
      seatLocateResult: result,
      seatLocateError: '',
      seatInput: result.rawInput || this.data.seatInput
    });

    wx.nextTick(() => {
      const comp = this.selectComponent('#seatMapComp');
      if (!comp || typeof comp.updateUserDots !== 'function') return;

      const oldAreaId = this.data.lastLocatedAreaId;
      if (oldAreaId && oldAreaId !== result.areaId) {
        comp.updateUserDots(oldAreaId, []);
      }

      const dot = toUserDot(result, {
        id: 'my-seat-dot',
        color: '#ff4f6a',
        r: 5,
        isMe: true
      });
      comp.updateUserDots(result.areaId, dot ? [dot] : []);

      this.setData({ lastLocatedAreaId: result.areaId });
    });

    if (showSuccessToast) {
      showToast(`已定位：${result.areaName} ${result.row}排${result.seat}座`);
    }
  },

  onClearSeatLocate() {
    this.clearLocatedDot();
    this.setData({
      seatLocateResult: null,
      seatLocateError: '',
      selectedAreaId: '',
      selectedSeatArea: null
    });
  },

  clearLocatedDot() {
    const oldAreaId = this.data.lastLocatedAreaId;
    const comp = this.selectComponent('#seatMapComp');
    if (oldAreaId && comp && typeof comp.updateUserDots === 'function') {
      comp.updateUserDots(oldAreaId, []);
    }
    this.setData({ lastLocatedAreaId: '' });
  },

  getSeatAreaById(areaId) {
    const seatMap = this.data.concert && this.data.concert.seatMap;
    const areas = (seatMap && seatMap.areas) || [];
    return areas.find((item) => item.id === areaId) || null;
  },

  onInputSeatViewNote(e) {
    this.setData({ seatViewNote: e.detail.value || '' });
  },

  onSeatViewRatingChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      seatViewRatingIndex: Number.isNaN(idx) ? 0 : idx
    });
  },

  async onChooseSeatViewImages() {
    const maxCount = 3;
    const currentCount = this.data.seatViewImages.length;
    const remain = maxCount - currentCount;
    if (remain <= 0) {
      showToast('最多上传 3 张图片');
      return;
    }

    try {
      const files = await chooseImageList(remain);
      if (!files.length) return;

      this.setData({ seatViewUploading: true });
      showLoading('图片上传中...');

      const uploaded = [];
      for (const path of files) {
        const cloudPath = buildCloudPath(`seatviews/${this.data.concertId}`, path);
        const fileID = await api.uploadImage(path, cloudPath);
        uploaded.push(fileID);
      }

      this.setData({
        seatViewImages: [...this.data.seatViewImages, ...uploaded]
      });
      showToast('上传成功');
    } catch (err) {
      if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) {
        return;
      }
      console.error('onChooseSeatViewImages failed:', err);
      showToast('上传失败');
    } finally {
      hideLoading();
      this.setData({ seatViewUploading: false });
    }
  },

  onRemoveSeatViewImage(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const list = [...this.data.seatViewImages];
    if (idx < 0 || idx >= list.length) return;
    list.splice(idx, 1);
    this.setData({ seatViewImages: list });
  },

  onPreviewUploadImage(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const list = this.data.seatViewImages || [];
    if (idx < 0 || idx >= list.length) return;
    wx.previewImage({
      urls: list,
      current: list[idx]
    });
  },

  async onSubmitSeatView() {
    const app = getApp();
    if (!app.globalData.openid) {
      showToast('请先登录后再分享');
      return;
    }

    if (this.data.seatViewSaving) return;

    const seatInput = (this.data.seatInput || '').trim();
    if (!seatInput) {
      showToast('请先输入并定位座位号');
      return;
    }

    const locateResult = this.locateByInput(seatInput, false);
    if (!locateResult) {
      showToast('请先定位有效座位号');
      return;
    }

    const images = this.data.seatViewImages || [];
    if (!images.length) {
      showToast('请至少上传 1 张视野图');
      return;
    }

    const rating = (this.data.seatViewRatingOptions[this.data.seatViewRatingIndex] || {}).value || 'clear';

    this.setData({ seatViewSaving: true });
    try {
      const result = await api.saveSeatView({
        concertId: this.data.concertId,
        seatInput,
        areaId: locateResult.areaId,
        areaName: locateResult.areaName,
        row: locateResult.row,
        seat: locateResult.seat,
        rating,
        note: (this.data.seatViewNote || '').trim(),
        images
      });

      this.setData({
        seatViewNote: '',
        seatViewImages: [],
        seatViewRatingIndex: 0
      });
      await this.loadSeatViews();
      showToast(result && result.status === 'pending' ? '已提交，等待审核通过后展示' : '分享成功，感谢你的帮助');
    } catch (err) {
      console.error('onSubmitSeatView failed:', err);
      showToast(err.message || '分享失败');
    } finally {
      this.setData({ seatViewSaving: false });
    }
  },

  onTapSeatViewLocate(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const item = (this.data.seatViews || [])[idx];
    if (!item) return;

    const input = item.seatInput || `${item.areaName || ''}${item.row || ''}排${item.seat || ''}座`;
    this.setData({ seatInput: input });
    this.locateByInput(input, true);
  },

  onPreviewSeatViewImage(e) {
    const viewIndex = Number(e.currentTarget.dataset.viewIndex);
    const imgIndex = Number(e.currentTarget.dataset.imgIndex);
    const item = (this.data.seatViews || [])[viewIndex];
    if (!item || !Array.isArray(item.images) || !item.images.length) return;

    const current = item.images[imgIndex] || item.images[0];
    wx.previewImage({
      urls: item.images,
      current
    });
  },

  onBuddyTypeChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      buddyTypeIndex: Number.isNaN(idx) ? 0 : idx
    });
  },

  onBuddyExpectedCountChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      buddyExpectedCountIndex: Number.isNaN(idx) ? 0 : idx
    });
  },

  onInputBuddyContent(e) {
    this.setData({
      buddyContent: e.detail.value || ''
    });
  },

  onInputBuddyContact(e) {
    this.setData({
      buddyContact: e.detail.value || ''
    });
  },

  async onSubmitBuddyPost() {
    const app = getApp();
    if (!app.globalData.openid) {
      showToast('请先登录后再发布');
      return;
    }

    if (this.data.buddySaving) return;

    const content = (this.data.buddyContent || '').trim();
    const contact = (this.data.buddyContact || '').trim();
    if (!content) {
      showToast('请先写下你的同好需求');
      return;
    }
    if (!contact) {
      showToast('请填写联系方式');
      return;
    }

    const type = (this.data.buddyTypeOptions[this.data.buddyTypeIndex] || {}).value || 'photo';
    const expectedCount =
      this.data.buddyExpectedCountOptions[this.data.buddyExpectedCountIndex] || 2;

    this.setData({ buddySaving: true });
    try {
      const result = await api.saveBuddyPost({
        concertId: this.data.concertId,
        type,
        content,
        contact,
        expectedCount
      });
      this.setData({
        buddyContent: '',
        buddyContact: ''
      });
      await this.loadBuddyPosts();
      showToast(result && result.status === 'pending' ? '已提交，等待审核后展示' : '发布成功，祝你找到同好');
    } catch (err) {
      console.error('onSubmitBuddyPost failed:', err);
      showToast(err.message || '发布失败');
    } finally {
      this.setData({ buddySaving: false });
    }
  },

  async onCopyBuddyContact(e) {
    const contact = String(e.currentTarget.dataset.contact || '').trim();
    if (!contact) {
      showToast('暂无联系方式');
      return;
    }

    try {
      await copyToClipboard(contact);
      showToast('联系方式已复制');
    } catch (err) {
      console.error('onCopyBuddyContact failed:', err);
      showToast('复制失败');
    }
  },

  onAnnouncementSortChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      announcementSortIndex: Number.isNaN(idx) ? 0 : idx
    });
    this.loadAnnouncementMessages();
  },

  onAnnouncementStatusChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      announcementStatusIndex: Number.isNaN(idx) ? 0 : idx
    });
    this.loadAnnouncementMessages();
  },

  onAnnouncementOfficialSwitch(e) {
    this.setData({
      announcementAsOfficial: !!e.detail.value
    });
  },

  onInputAnnouncementContent(e) {
    this.setData({
      announcementContent: e.detail.value || ''
    });
  },

  async onSubmitAnnouncementMessage() {
    const app = getApp();
    if (!app.globalData.openid) {
      showToast('请先登录后留言');
      return;
    }

    if (this.data.announcementSaving) return;

    const content = (this.data.announcementContent || '').trim();
    if (!content) {
      showToast('请先写下留言内容');
      return;
    }

    this.setData({ announcementSaving: true });
    try {
      const result = await api.saveAnnouncementMessage({
        concertId: this.data.concertId,
        content,
        asOfficial: this.data.isAdmin ? this.data.announcementAsOfficial : false
      });
      this.setData({ announcementContent: '' });
      await this.loadAnnouncementMessages();
      showToast(result && result.status === 'pending' ? '已提交，等待审核后展示' : '留言发布成功');
    } catch (err) {
      console.error('onSubmitAnnouncementMessage failed:', err);
      showToast(err.message || '留言发布失败');
    } finally {
      this.setData({ announcementSaving: false });
    }
  },

  async onReportContent(e) {
    const { contentType, contentId } = e.currentTarget.dataset || {};
    if (!contentType || !contentId) return;

    const app = getApp();
    if (!app.globalData.openid) {
      showToast('请先登录后再举报');
      return;
    }

    try {
      const res = await showModal({
        title: '举报内容',
        content: '确认举报这条内容吗？我们会尽快处理。'
      });
      if (!res.confirm) return;

      await api.reportContent({
        contentType,
        contentId,
        reasonType: 'abuse'
      });
      showToast('举报已提交');

      if (contentType === 'announcement') {
        this.loadAnnouncementMessages();
      } else if (contentType === 'buddy') {
        this.loadBuddyPosts();
      } else if (contentType === 'seatView') {
        this.loadSeatViews();
      }
    } catch (err) {
      console.error('onReportContent failed:', err);
      showToast(err.message || '举报失败');
    }
  },

  async onBlockUser(e) {
    const targetOpenid = String((e.currentTarget.dataset || {}).openid || '').trim();
    if (!targetOpenid) return;

    const myOpenid = this.getCurrentOpenid();
    if (!myOpenid) {
      showToast('请先登录后再拉黑');
      return;
    }
    if (myOpenid === targetOpenid) {
      showToast('不能拉黑自己');
      return;
    }

    try {
      const res = await showModal({
        title: '拉黑用户',
        content: '拉黑后你将不再看到该用户的内容，确认继续？'
      });
      if (!res.confirm) return;

      await api.blockUser(targetOpenid, 'block');
      showToast('已拉黑该用户');
      this.loadSeatViews();
      this.loadBuddyPosts();
      this.loadAnnouncementMessages();
    } catch (err) {
      console.error('onBlockUser failed:', err);
      showToast(err.message || '拉黑失败');
    }
  },

  async onAdminModerateAnnouncement(e) {
    if (!this.data.isAdmin) return;
    const action = String((e.currentTarget.dataset || {}).action || '').trim();
    const contentId = String((e.currentTarget.dataset || {}).id || '').trim();
    const openid = String((e.currentTarget.dataset || {}).openid || '').trim();
    if (!action || !contentId) return;

    const payload = {
      contentType: 'announcement',
      contentId,
      action
    };

    try {
      if (action === 'mute_user') {
        payload.targetOpenid = openid;
        payload.scope = 'announcement';
        payload.hours = 24;
      }
      await api.moderateContent(payload);
      showToast('操作成功');
      this.loadAnnouncementMessages();
    } catch (err) {
      console.error('onAdminModerateAnnouncement failed:', err);
      showToast(err.message || '操作失败');
    }
  },

  onShareAppMessage() {
    const { concert } = this.data;
    return {
      title: concert ? concert.title : '演唱会查询',
      path: `/pages/detail/detail?id=${this.data.concertId}`,
      imageUrl: concert ? concert.poster : ''
    };
  },

  onTapRelated(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  onPreviewPoster() {
    const { concert } = this.data;
    if (!concert || !concert.poster) return;
    wx.previewImage({
      urls: [concert.poster],
      current: concert.poster
    });
  }
});
