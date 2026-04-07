// pages/admin/edit/edit.js
const api = require('../../../utils/api');
const { STAGES, PLATFORM_LIST, HOT_CITIES } = require('../../../utils/constants');
const { showToast, showLoading, hideLoading } = require('../../../utils/util');
const {
  DEFAULT_OPTIONS,
  SEAT_MAP_PRESETS,
  resolveSeatMapOptions,
  generateSeatMapWithGuard,
  validateSeatMapQuality
} = require('../../../utils/seat-map-generator');

const PLATFORM_LABEL_MAP = {
  damai: '大麦',
  maoyan: '猫眼',
  douyin: '抖音',
  xiecheng: '携程',
  piaoxingqiu: '票星球'
};

const AREA_TYPE_OPTIONS = [
  { label: 'VIP', value: 'vip' },
  { label: '看台', value: 'premium' },
  { label: '普通', value: 'standard' },
  { label: '不可选', value: 'disabled' }
];

function buildDefaultPlatforms() {
  return {
    damai: { available: false, url: '', openTime: '' },
    maoyan: { available: false, url: '', openTime: '' },
    douyin: { available: false, url: '', openTime: '' },
    xiecheng: { available: false, url: '', openTime: '' },
    piaoxingqiu: { available: false, url: '', openTime: '' }
  };
}

function getPresetIndexByKey(key) {
  const index = SEAT_MAP_PRESETS.findIndex((item) => item.key === key);
  return index >= 0 ? index : 0;
}

function getDefaultGeneratorOptions() {
  const resolved = resolveSeatMapOptions({ presetKey: DEFAULT_OPTIONS.presetKey });
  return {
    presetKey: resolved.presetKey,
    fallbackPresetKey: 'arena_end',
    ringCount: resolved.ringCount,
    sectorCount: resolved.sectorCount,
    startAngle: resolved.startAngle,
    endAngle: resolved.endAngle,
    overlayOpacity: resolved.overlayOpacity,
    stageCenterYRatio: resolved.stageCenterYRatio,
    stageRxRatio: resolved.stageRxRatio,
    stageRyRatio: resolved.stageRyRatio,
    boundaryRxRatio: resolved.boundaryRxRatio,
    boundaryRyRatio: resolved.boundaryRyRatio
  };
}

function chooseLocalImage() {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => resolve(res.tempFilePaths[0]),
      fail: (err) => reject(err)
    });
  });
}

function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: (res) => resolve(res),
      fail: (err) => reject(err)
    });
  });
}

function getTempFileURL(fileID) {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.getTempFileURL) {
      reject(new Error('云开发能力未初始化'));
      return;
    }

    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (res) => {
        const first = (res.fileList || [])[0];
        const tempFileURL = first && first.tempFileURL;
        if (!tempFileURL) {
          reject(new Error('获取临时链接失败'));
          return;
        }
        resolve(tempFileURL);
      },
      fail: (err) => reject(err)
    });
  });
}

async function getImageInfoBySource(src) {
  if (typeof src === 'string' && src.indexOf('cloud://') === 0) {
    const tempURL = await getTempFileURL(src);
    const info = await getImageInfo(tempURL);
    return {
      ...info,
      source: tempURL
    };
  }
  const info = await getImageInfo(src);
  return {
    ...info,
    source: src
  };
}

function getCloudPath(prefix, filePath) {
  const ext = filePath.split('.').pop() || 'jpg';
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}/${Date.now()}_${random}.${ext}`;
}

function cloneDeep(value) {
  return JSON.parse(JSON.stringify(value || null));
}

function parseRingByAreaId(areaId) {
  const match = /^r(\d+)s\d+$/i.exec(String(areaId || ''));
  return match ? Number(match[1]) : null;
}

function normalizeNumber(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function sanitizeGeneratorOptions(rawOptions = {}) {
  const resolved = resolveSeatMapOptions({ presetKey: rawOptions.presetKey || DEFAULT_OPTIONS.presetKey });
  return {
    ...resolved,
    fallbackPresetKey: rawOptions.fallbackPresetKey || 'arena_end',
    ringCount: normalizeNumber(rawOptions.ringCount, resolved.ringCount),
    sectorCount: normalizeNumber(rawOptions.sectorCount, resolved.sectorCount),
    startAngle: normalizeNumber(rawOptions.startAngle, resolved.startAngle),
    endAngle: normalizeNumber(rawOptions.endAngle, resolved.endAngle),
    overlayOpacity: normalizeNumber(rawOptions.overlayOpacity, resolved.overlayOpacity),
    stageCenterYRatio: normalizeNumber(rawOptions.stageCenterYRatio, resolved.stageCenterYRatio),
    stageRxRatio: normalizeNumber(rawOptions.stageRxRatio, resolved.stageRxRatio),
    stageRyRatio: normalizeNumber(rawOptions.stageRyRatio, resolved.stageRyRatio),
    boundaryRxRatio: normalizeNumber(rawOptions.boundaryRxRatio, resolved.boundaryRxRatio),
    boundaryRyRatio: normalizeNumber(rawOptions.boundaryRyRatio, resolved.boundaryRyRatio)
  };
}

function buildQualityState(quality, extras = {}) {
  if (!quality) return null;
  return {
    ok: !!quality.ok,
    score: Number(quality.score || 0),
    warnings: Array.isArray(quality.warnings) ? quality.warnings : [],
    fatals: Array.isArray(quality.fatals) ? quality.fatals : [],
    metrics: quality.metrics || {},
    ...extras
  };
}

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
      platforms: buildDefaultPlatforms(),
      priceRange: '',
      poster: '',
      seatMapSourceImage: '',
      seatMapConfig: getDefaultGeneratorOptions(),
      seatMap: null,
      seatMapQuality: null
    },
    stages: Object.values(STAGES).filter((stage) => stage !== '已结束'),
    stageIndex: 0,
    platformList: PLATFORM_LIST,
    platformLabelMap: PLATFORM_LABEL_MAP,
    cities: HOT_CITIES.slice(1),
    cityIndex: 0,
    artists: [],
    artistIndex: 0,
    selectedDates: [],

    seatMapPresets: SEAT_MAP_PRESETS,
    presetIndex: getPresetIndexByKey(DEFAULT_OPTIONS.presetKey),
    fallbackPresetIndex: getPresetIndexByKey('arena_end'),
    generatorOptions: getDefaultGeneratorOptions(),
    seatMapImageMeta: null,
    qualityReport: null,

    areaTypeOptions: AREA_TYPE_OPTIONS,
    areaTypeLabels: AREA_TYPE_OPTIONS.map((item) => item.label),
    areaTypeIndex: 2,
    areaEditor: {
      name: '',
      price: '',
      type: 'standard',
      disabled: false
    },

    selectedPreviewAreaId: '',
    selectedPreviewArea: null,
    generatingSeatMap: false
  },

  onLoad(options) {
    this.initialize(options);
  },

  async initialize(options) {
    await this.loadArtists();

    if (options.id) {
      this.setData({
        isEdit: true,
        concertId: options.id
      });
      await this.loadConcertDetail(options.id);
      wx.setNavigationBarTitle({ title: '编辑演唱会' });
      return;
    }

    wx.setNavigationBarTitle({ title: '新增演唱会' });
  },

  async loadArtists() {
    try {
      const result = await api.getArtists({ pageSize: 100 });
      const artists = result.list || [];
      this.setData({ artists });
    } catch (err) {
      console.error('loadArtists failed:', err);
    }
  },

  async loadConcertDetail(id) {
    showLoading('加载中...');
    try {
      const concert = await api.getConcertDetail(id);
      const stageIndex = this.data.stages.indexOf(concert.stage);
      const cityIndex = this.data.cities.indexOf(concert.city);
      const artistIndex = this.data.artists.findIndex((artist) => artist._id === concert.artistId);
      const seatMap = concert.seatMap || null;
      const seatMapSourceImage = concert.seatMapSourceImage || (seatMap && seatMap.sourceImage) || '';

      const generatorOptions = sanitizeGeneratorOptions({
        ...getDefaultGeneratorOptions(),
        ...(concert.seatMapConfig || {})
      });

      const quality = seatMap
        ? validateSeatMapQuality(seatMap, generatorOptions)
        : null;

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
          platforms: concert.platforms || buildDefaultPlatforms(),
          priceRange: concert.priceRange || '',
          poster: concert.poster || '',
          seatMapSourceImage,
          seatMapConfig: generatorOptions,
          seatMap,
          seatMapQuality: concert.seatMapQuality || quality
        },
        selectedDates: concert.dates || [],
        stageIndex: stageIndex >= 0 ? stageIndex : 0,
        cityIndex: cityIndex >= 0 ? cityIndex : 0,
        artistIndex: artistIndex >= 0 ? artistIndex : 0,

        generatorOptions,
        presetIndex: getPresetIndexByKey(generatorOptions.presetKey),
        fallbackPresetIndex: getPresetIndexByKey(generatorOptions.fallbackPresetKey || 'arena_end'),
        seatMapImageMeta: seatMap
          ? {
              width: seatMap.width || 620,
              height: seatMap.height || 570,
              fileID: seatMapSourceImage
            }
          : null,
        qualityReport: buildQualityState(quality)
      });
    } catch (err) {
      console.error('loadConcertDetail failed:', err);
      showToast('加载失败');
    } finally {
      hideLoading();
    }
  },

  onInputTitle(e) {
    this.setData({ 'formData.title': e.detail.value });
  },

  onSelectArtist(e) {
    const index = Number(e.detail.value);
    const artist = this.data.artists[index];
    if (!artist) return;
    this.setData({
      artistIndex: index,
      'formData.artist': artist.name,
      'formData.artistId': artist._id
    });
  },

  onSelectCity(e) {
    const index = Number(e.detail.value);
    this.setData({
      cityIndex: index,
      'formData.city': this.data.cities[index]
    });
  },

  onInputVenue(e) {
    this.setData({ 'formData.venue': e.detail.value });
  },

  onSelectDate(e) {
    const date = e.detail.value;
    const selectedDates = this.data.selectedDates || [];
    if (selectedDates.includes(date)) return;

    const nextDates = [...selectedDates, date].sort();
    this.setData({
      selectedDates: nextDates,
      'formData.dates': nextDates
    });
  },

  onRemoveDate(e) {
    const { date } = e.currentTarget.dataset;
    const nextDates = this.data.selectedDates.filter((item) => item !== date);
    this.setData({
      selectedDates: nextDates,
      'formData.dates': nextDates
    });
  },

  onInputPrice(e) {
    this.setData({ 'formData.priceRange': e.detail.value });
  },

  onSelectStage(e) {
    const index = Number(e.detail.value);
    this.setData({
      stageIndex: index,
      'formData.stage': this.data.stages[index]
    });
  },

  onTogglePlatform(e) {
    const { platform } = e.currentTarget.dataset;
    const key = `formData.platforms.${platform}.available`;
    const current = !!this.data.formData.platforms[platform].available;
    this.setData({ [key]: !current });
  },

  onInputPlatformUrl(e) {
    const { platform } = e.currentTarget.dataset;
    this.setData({ [`formData.platforms.${platform}.url`]: e.detail.value });
  },

  onInputPlatformTime(e) {
    const { platform } = e.currentTarget.dataset;
    this.setData({ [`formData.platforms.${platform}.openTime`]: e.detail.value });
  },

  async onChoosePoster() {
    try {
      const fileID = await api.chooseAndUploadImage('poster');
      this.setData({ 'formData.poster': fileID });
      showToast('上传成功');
    } catch (err) {
      console.error('upload poster failed:', err);
      if (err.errMsg !== 'chooseImage:fail cancel') {
        showToast('上传失败');
      }
    }
  },

  onRemovePoster() {
    this.setData({ 'formData.poster': '' });
  },

  onSelectSeatMapPreset(e) {
    const index = Number(e.detail.value);
    const preset = this.data.seatMapPresets[index];
    if (!preset) return;

    const next = sanitizeGeneratorOptions({
      ...this.data.generatorOptions,
      presetKey: preset.key,
      ...preset.options
    });

    this.setData({
      presetIndex: index,
      generatorOptions: next,
      'formData.seatMapConfig': next
    });
  },

  onSelectFallbackPreset(e) {
    const index = Number(e.detail.value);
    const preset = this.data.seatMapPresets[index];
    if (!preset) return;

    const next = {
      ...this.data.generatorOptions,
      fallbackPresetKey: preset.key
    };

    this.setData({
      fallbackPresetIndex: index,
      generatorOptions: next,
      'formData.seatMapConfig': next
    });
  },

  onInputGeneratorOption(e) {
    const { key } = e.currentTarget.dataset;
    const rawValue = e.detail.value;
    const value = rawValue === '' ? '' : Number(rawValue);

    this.setData({
      [`generatorOptions.${key}`]: value
    });
  },

  async onChooseSeatMapSourceImage() {
    try {
      showLoading('上传座位图...');
      const tempFilePath = await chooseLocalImage();
      const imageInfo = await getImageInfo(tempFilePath);
      const cloudPath = getCloudPath('seatmap', tempFilePath);
      const fileID = await api.uploadImage(tempFilePath, cloudPath);

      this.setData({
        'formData.seatMapSourceImage': fileID,
        'formData.seatMap': null,
        'formData.seatMapQuality': null,
        seatMapImageMeta: {
          width: imageInfo.width,
          height: imageInfo.height,
          path: tempFilePath,
          fileID
        },
        qualityReport: null,
        selectedPreviewAreaId: '',
        selectedPreviewArea: null
      });
      showToast('座位图上传成功');
    } catch (err) {
      console.error('onChooseSeatMapSourceImage failed:', err);
      if (err.errMsg !== 'chooseImage:fail cancel') {
        showToast('座位图上传失败');
      }
    } finally {
      hideLoading();
    }
  },

  async onGenerateSeatMap() {
    const sourceImage = this.data.formData.seatMapSourceImage;
    if (!sourceImage) {
      showToast('请先上传座位图');
      return;
    }

    this.setData({ generatingSeatMap: true });
    try {
      let imageMeta = this.data.seatMapImageMeta;
      if (!imageMeta || !imageMeta.width || !imageMeta.height) {
        const info = await getImageInfoBySource(sourceImage);
        imageMeta = {
          width: info.width,
          height: info.height,
          fileID: sourceImage,
          path: info.path || info.source
        };
      }

      const options = sanitizeGeneratorOptions(this.data.generatorOptions);
      const result = generateSeatMapWithGuard(
        {
          width: imageMeta.width,
          height: imageMeta.height,
          fileID: sourceImage,
          path: imageMeta.path
        },
        options
      );

      const quality = buildQualityState(result.quality, {
        usedFallback: !!result.usedFallback,
        fallbackPresetKey: result.fallbackPresetKey || '',
        originalQuality: result.originalQuality || null
      });

      this.setData({
        'formData.seatMap': result.seatMap,
        'formData.seatMapConfig': result.finalOptions,
        'formData.seatMapQuality': quality,
        generatorOptions: result.finalOptions,
        presetIndex: getPresetIndexByKey(result.finalOptions.presetKey),
        fallbackPresetIndex: getPresetIndexByKey(result.finalOptions.fallbackPresetKey || 'arena_end'),
        seatMapImageMeta: imageMeta,
        qualityReport: quality,
        selectedPreviewAreaId: '',
        selectedPreviewArea: null
      });

      if (result.usedFallback) {
        showToast(`质量未达标，已回退到 ${result.fallbackPresetKey || '默认模板'}`);
      } else {
        showToast(`生成成功：${result.seatMap.areas.length} 个可交互分区`);
      }
    } catch (err) {
      console.error('onGenerateSeatMap failed:', err);
      showToast('生成失败，请重试');
    } finally {
      this.setData({ generatingSeatMap: false });
    }
  },

  onClearSeatMap() {
    this.setData({
      'formData.seatMap': null,
      'formData.seatMapQuality': null,
      qualityReport: null,
      selectedPreviewAreaId: '',
      selectedPreviewArea: null
    });
  },

  onPreviewSeatAreaSelect(e) {
    const area = e.detail.area || null;
    const typeIndex = Math.max(
      0,
      this.data.areaTypeOptions.findIndex((item) => item.value === (area && area.type))
    );

    this.setData({
      selectedPreviewAreaId: e.detail.areaId || '',
      selectedPreviewArea: area,
      areaTypeIndex: typeIndex,
      areaEditor: {
        name: (area && area.name) || '',
        price: area && Number.isFinite(Number(area.price)) ? String(area.price) : '',
        type: (area && area.type) || this.data.areaTypeOptions[typeIndex].value,
        disabled: !!(area && area.disabled)
      }
    });
  },

  onPreviewSeatAreaConfirm(e) {
    const area = e.detail.area;
    if (!area) return;
    showToast(`已选择 ${area.name}`);
  },

  onInputAreaName(e) {
    this.setData({ 'areaEditor.name': e.detail.value });
  },

  onInputAreaPrice(e) {
    this.setData({ 'areaEditor.price': e.detail.value });
  },

  onSelectAreaType(e) {
    const index = Number(e.detail.value);
    const option = this.data.areaTypeOptions[index] || this.data.areaTypeOptions[0];
    this.setData({
      areaTypeIndex: index,
      'areaEditor.type': option.value
    });
  },

  onSwitchAreaDisabled(e) {
    this.setData({ 'areaEditor.disabled': !!e.detail.value });
  },

  applyAreaEditor(targetMode = 'selected') {
    const seatMap = cloneDeep(this.data.formData.seatMap);
    const selectedId = this.data.selectedPreviewAreaId;
    if (!seatMap || !selectedId) {
      showToast('请先选择一个分区');
      return;
    }

    const selected = (seatMap.areas || []).find((item) => item.id === selectedId);
    if (!selected) {
      showToast('未找到已选分区');
      return;
    }

    const ringNo = parseRingByAreaId(selectedId);
    const name = this.data.areaEditor.name;
    const type = this.data.areaEditor.type;
    const disabled = !!this.data.areaEditor.disabled;
    const price = Number(this.data.areaEditor.price);
    const hasPrice = Number.isFinite(price) && price > 0;

    seatMap.areas = (seatMap.areas || []).map((area) => {
      const shouldApply =
        targetMode === 'selected'
          ? area.id === selectedId
          : parseRingByAreaId(area.id) === ringNo;

      if (!shouldApply) return area;

      return {
        ...area,
        name: name || area.name,
        type: type || area.type,
        disabled,
        price: hasPrice ? price : area.price,
        bubblePrice: hasPrice ? price : area.bubblePrice
      };
    });

    const picked = seatMap.areas.find((item) => item.id === selectedId) || null;
    this.commitSeatMapUpdate(seatMap, picked, selectedId);
    showToast(targetMode === 'selected' ? '已更新当前分区' : '已更新同环分区');
  },

  onApplyAreaToSelected() {
    this.applyAreaEditor('selected');
  },

  onApplyAreaToRing() {
    this.applyAreaEditor('ring');
  },

  onNudgeStage(e) {
    const axis = e.currentTarget.dataset.axis;
    const delta = Number(e.currentTarget.dataset.delta || 0);
    this.applyGeometryPatch((seatMap) => {
      if (!seatMap || !seatMap.stage) return;
      if (axis === 'x') seatMap.stage.cx = Number(seatMap.stage.cx || 0) + delta;
      if (axis === 'y') seatMap.stage.cy = Number(seatMap.stage.cy || 0) + delta;
    });
  },

  onScaleStage(e) {
    const factor = Number(e.currentTarget.dataset.factor || 1);
    this.applyGeometryPatch((seatMap) => {
      if (!seatMap || !seatMap.stage) return;
      seatMap.stage.rx = Math.max(10, Number(seatMap.stage.rx || 0) * factor);
      seatMap.stage.ry = Math.max(6, Number(seatMap.stage.ry || 0) * factor);
    });
  },

  onScaleBoundary(e) {
    const factor = Number(e.currentTarget.dataset.factor || 1);
    this.applyGeometryPatch((seatMap) => {
      if (!seatMap || !seatMap.boundary) return;
      seatMap.boundary.rx = Math.max(30, Number(seatMap.boundary.rx || 0) * factor);
      seatMap.boundary.ry = Math.max(24, Number(seatMap.boundary.ry || 0) * factor);
    });
  },

  applyGeometryPatch(mutator) {
    const seatMap = cloneDeep(this.data.formData.seatMap);
    if (!seatMap) {
      showToast('请先生成座位图');
      return;
    }

    mutator(seatMap);
    const selectedId = this.data.selectedPreviewAreaId;
    const selectedArea = (seatMap.areas || []).find((item) => item.id === selectedId) || null;
    this.commitSeatMapUpdate(seatMap, selectedArea, selectedId);
  },

  commitSeatMapUpdate(nextSeatMap, selectedArea = null, selectedId = '') {
    const options = sanitizeGeneratorOptions(this.data.generatorOptions);
    const quality = buildQualityState(validateSeatMapQuality(nextSeatMap, options));

    this.setData({
      'formData.seatMap': nextSeatMap,
      'formData.seatMapConfig': options,
      'formData.seatMapQuality': quality,
      qualityReport: quality,
      selectedPreviewAreaId: selectedId || '',
      selectedPreviewArea: selectedArea
    });
  },

  async onSaveDraft() {
    await this.saveConcert(true);
  },

  async onPublish() {
    if (!this.validateForm()) return;
    await this.saveConcert(false);
  },

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
      showToast('请输入场馆名称');
      return false;
    }
    if (!formData.dates.length) {
      showToast('请选择演出日期');
      return false;
    }
    return true;
  },

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
      }, 1200);
    } catch (err) {
      console.error('saveConcert failed:', err);
      showToast('保存失败');
    } finally {
      hideLoading();
    }
  }
});
