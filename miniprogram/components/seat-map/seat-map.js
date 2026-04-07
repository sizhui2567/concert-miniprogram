// components/seat-map/seat-map.js
const DEFAULT_VIEWBOX = '0 0 620 570';
const DEFAULT_WIDTH = 620;
const DEFAULT_HEIGHT = 570;

Component({
  properties: {
    venueName: {
      type: String,
      value: '场馆'
    },
    userCount: {
      type: Number,
      value: 0
    },
    seatData: {
      type: Object,
      value: null,
      observer(newVal) {
        this.processSeatData(newVal);
      }
    },
    selectedAreaId: {
      type: String,
      value: '',
      observer(newVal) {
        this.updateSelectedArea(newVal);
      }
    },
    showLegend: {
      type: Boolean,
      value: true
    },
    interactive: {
      type: Boolean,
      value: true
    }
  },

  data: {
    viewBox: DEFAULT_VIEWBOX,
    svgHeight: 420,
    stage: {
      cx: 310,
      cy: 285,
      rx: 90,
      ry: 50,
      label: '舞台'
    },
    boundary: {
      cx: 310,
      cy: 285,
      rx: 300,
      ry: 255
    },
    levels: [],
    activeLevelId: 'all',
    allAreas: [],
    areas: [],
    priceBubbles: [],
    selectedArea: null,
    scale: 1,
    translateX: 0,
    translateY: 0,
    lodMode: 'area',
    selectedSeat: null,
    seatDetail: null,
    overlayImage: '',
    overlayOpacity: 0.42,
    legend: [],
    canvasReady: false,
    canvasError: '',
    areaSeatMode: false,
    focusedAreaId: '',
    focusedAreaName: ''
  },

  lifetimes: {
    attached() {
      if (this.properties.seatData) {
        this.processSeatData(this.properties.seatData);
      } else {
        this.processSeatData(this.getDefaultSeatData());
      }
    },
    ready() {
      this.scheduleCanvasDraw();
    },
    detached() {
      if (this._drawTimer) {
        clearTimeout(this._drawTimer);
        this._drawTimer = null;
      }
    }
  },

  methods: {
    processSeatData(seatData) {
      if (!seatData || typeof seatData !== 'object') {
        return;
      }

      const rawAreas = Array.isArray(seatData.areas) ? seatData.areas : [];
      const selectedId = this.properties.selectedAreaId || '';
      const normalizedAreas = rawAreas.map((area, index) => this.normalizeArea(area, index, selectedId));

      const levels = this.normalizeLevels(seatData.levels || []);
      const activeLevelId = this.pickActiveLevelId(levels, this.data.activeLevelId);
      const visibleAreas = this.filterAreasByLevel(normalizedAreas, activeLevelId);

      const selectedArea = visibleAreas.find((area) => area.id === selectedId) || null;
      const priceBubbles = visibleAreas
        .filter((area) => area.bubblePosition && area.bubblePrice)
        .map((area) => ({
          id: `bubble-${area.id}`,
          areaId: area.id,
          x: area.bubblePosition.x,
          y: area.bubblePosition.y,
          price: area.bubblePrice
        }));

      const viewBox = seatData.viewBox || `0 0 ${seatData.width || DEFAULT_WIDTH} ${seatData.height || DEFAULT_HEIGHT}`;
      const svgHeight = this.calculateSvgHeight(viewBox);

      this.setData({
        viewBox,
        svgHeight,
        stage: seatData.stage || this.data.stage,
        boundary: seatData.boundary || this.data.boundary,
        levels,
        activeLevelId,
        allAreas: normalizedAreas,
        areas: visibleAreas,
        priceBubbles,
        selectedArea,
        selectedSeat: null,
        seatDetail: seatData.seatDetail || null,
        overlayImage: seatData.backgroundImage || seatData.sourceImage || '',
        overlayOpacity: this.normalizeOpacity(seatData.overlayOpacity),
        legend: this.buildLegend(visibleAreas),
        areaSeatMode: false,
        focusedAreaId: '',
        focusedAreaName: ''
      }, () => {
        this.scheduleCanvasDraw();
      });
    },

    normalizeLevels(levels) {
      const list = Array.isArray(levels) ? levels : [];
      const normalized = list
        .filter((item) => item && item.id)
        .map((item) => ({ id: String(item.id), name: item.name || String(item.id), default: !!item.default }));
      if (!normalized.length) {
        return [{ id: 'all', name: '全场', default: true }];
      }
      if (!normalized.some((item) => item.id === 'all')) {
        normalized.unshift({ id: 'all', name: '全场', default: false });
      }
      return normalized;
    },

    pickActiveLevelId(levels, currentId) {
      const ids = new Set(levels.map((item) => item.id));
      if (currentId && ids.has(currentId)) return currentId;
      const preferred = levels.find((item) => item.default) || levels[0];
      return preferred ? preferred.id : 'all';
    },

    filterAreasByLevel(areas, levelId) {
      if (!levelId || levelId === 'all') return areas;
      return areas.filter((area) => String(area.levelId || 'all') === String(levelId));
    },

    normalizeArea(area, index, selectedId) {
      const normalizedId = area.id || `area-${index}`;
      const type = this.normalizeAreaType(area.type, area.price);
      const shapeType = this.normalizeShapeType(area.shapeType || area.shape || area.typeValue);
      const isSelected = normalizedId === selectedId;
      const bubblePrice = area.bubblePrice || (area.bubble && area.bubble.price) || area.price || null;
      const bubblePosition = area.bubblePosition || null;

      return {
        ...area,
        id: normalizedId,
        name: area.name || normalizedId,
        type,
        shapeType,
        disabled: !!area.disabled,
        selected: isSelected,
        users: Array.isArray(area.users) ? area.users : [],
        fillColor: area.fillColor || this.getAreaColor(type, area.price),
        strokeColor: isSelected ? '#ff4f6a' : '#ffffff',
        strokeWidth: isSelected ? 3 : 1,
        labelColor: area.labelColor || this.getLabelColor(type),
        labelSize: area.labelSize || (type === 'vip' ? 12 : 10),
        labelX: Number(area.labelX) || 0,
        labelY: Number(area.labelY) || 0,
        bubblePrice,
        bubblePosition
      };
    },

    normalizeAreaType(type, price) {
      if (type === 'vip' || type === 'premium' || type === 'standard' || type === 'disabled') {
        return type;
      }
      if (price >= 1500) return 'vip';
      if (price >= 800) return 'premium';
      return 'standard';
    },

    normalizeShapeType(shapeType) {
      if (shapeType === 'path' || shapeType === 'rect' || shapeType === 'polygon') {
        return shapeType;
      }
      return 'polygon';
    },

    normalizeOpacity(value) {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return 0.42;
      }
      if (value < 0.08) return 0.08;
      if (value > 1) return 1;
      return value;
    },

    calculateSvgHeight(viewBox) {
      const fallbackHeight = 420;
      const parts = (viewBox || DEFAULT_VIEWBOX).split(' ');
      if (parts.length !== 4) return fallbackHeight;

      const width = Number(parts[2]);
      const height = Number(parts[3]);
      if (!width || !height) return fallbackHeight;

      const windowWidth = wx.getSystemInfoSync().windowWidth || 375;
      const targetWidth = windowWidth - 32;
      return Math.round((targetWidth * height) / width);
    },

    getAreaColor(type) {
      const colorMap = {
        vip: '#8f98ff',
        premium: '#ffcf7f',
        standard: '#e9ecf2',
        disabled: '#d6d8de'
      };
      return colorMap[type] || colorMap.standard;
    },

    getLabelColor(type) {
      return type === 'standard' ? '#49515f' : '#2f3642';
    },

    buildLegend(areas) {
      const hasType = (type) => areas.some((area) => area.type === type);
      const items = [];

      if (hasType('vip')) items.push({ color: '#8f98ff', label: 'VIP' });
      if (hasType('premium')) items.push({ color: '#ffcf7f', label: '看台' });
      if (hasType('standard')) items.push({ color: '#e9ecf2', label: '普通' });
      if (hasType('disabled')) items.push({ color: '#d6d8de', label: '不可选' });

      return items;
    },

    scheduleCanvasDraw() {
      if (this._drawTimer) {
        clearTimeout(this._drawTimer);
      }
      this._drawTimer = setTimeout(() => {
        this._drawTimer = null;
        this.drawSeatMapCanvas();
      }, 16);
    },

    ensureCanvasReady(done) {
      if (this._canvas && this._ctx && this._canvasWidth && this._canvasHeight) {
        done();
        return;
      }

      const query = this.createSelectorQuery();
      query.select('#seatCanvas').fields({ node: true, size: true }, (res) => {
        if (!res || !res.node || !res.width || !res.height) {
          const retry = (this._canvasInitRetry || 0) + 1;
          this._canvasInitRetry = retry;
          if (retry <= 6) {
            setTimeout(() => this.scheduleCanvasDraw(), 60);
          } else if (!this.data.canvasError) {
            this.setData({ canvasError: '座位图初始化失败，请下拉刷新重试' });
          }
          return;
        }

        const dpr = (wx.getSystemInfoSync().pixelRatio || 1);
        const canvas = res.node;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.round(res.width * dpr);
        canvas.height = Math.round(res.height * dpr);
        ctx.scale(dpr, dpr);

        this._canvas = canvas;
        this._ctx = ctx;
        this._canvasWidth = res.width;
        this._canvasHeight = res.height;
        this._canvasInitRetry = 0;
        this.setData({ canvasReady: true, canvasError: '' });
        done();
      }).exec();
    },

    parseViewBox() {
      const parts = String(this.data.viewBox || DEFAULT_VIEWBOX).split(' ').map((v) => Number(v));
      if (parts.length !== 4 || parts.some((v) => Number.isNaN(v))) {
        return { minX: 0, minY: 0, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
      }
      return {
        minX: parts[0],
        minY: parts[1],
        width: parts[2],
        height: parts[3]
      };
    },

    getRenderMeta() {
      const vb = this.parseViewBox();
      const cw = this._canvasWidth || 1;
      const ch = this._canvasHeight || 1;
      const fitScale = Math.min(cw / vb.width, ch / vb.height);
      const drawScale = fitScale * (this.data.scale || 1);
      const drawWidth = vb.width * drawScale;
      const drawHeight = vb.height * drawScale;
      const offsetX = (cw - drawWidth) / 2 + Number(this.data.translateX || 0);
      const offsetY = (ch - drawHeight) / 2 + Number(this.data.translateY || 0);

      return {
        minX: vb.minX,
        minY: vb.minY,
        width: vb.width,
        height: vb.height,
        drawScale,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      };
    },

    clampTranslate(scale, tx, ty) {
      const vb = this.parseViewBox();
      const cw = this._canvasWidth || 1;
      const ch = this._canvasHeight || 1;
      const fitScale = Math.min(cw / vb.width, ch / vb.height);
      const drawWidth = vb.width * fitScale * scale;
      const drawHeight = vb.height * fitScale * scale;
      const maxX = Math.max(0, (drawWidth - cw) / 2 + 12);
      const maxY = Math.max(0, (drawHeight - ch) / 2 + 12);
      return {
        x: Math.min(maxX, Math.max(-maxX, Number(tx || 0))),
        y: Math.min(maxY, Math.max(-maxY, Number(ty || 0)))
      };
    },

    getLodMode(scale) {
      if (scale >= 2.4) return 'seat';
      if (scale >= 1.4) return 'row';
      return 'area';
    },

    buildSelectedAreas(areaList, selectedId) {
      return (areaList || []).map((item) => {
        const selected = item.id === selectedId;
        return {
          ...item,
          selected,
          strokeColor: selected ? '#ff4f6a' : '#ffffff',
          strokeWidth: selected ? 3 : 1
        };
      });
    },

    getAreaCenter(area) {
      if (!area || typeof area !== 'object') {
        return { x: 0, y: 0 };
      }
      if (area.shapeType === 'rect') {
        const x = Number(area.x || 0);
        const y = Number(area.y || 0);
        const width = Number(area.width || 0);
        const height = Number(area.height || 0);
        return { x: x + width / 2, y: y + height / 2 };
      }
      if (area.shapeType === 'polygon') {
        const pts = this.parsePolygonPoints(area.points);
        if (pts.length) {
          const sum = pts.reduce((acc, point) => ({
            x: acc.x + point[0],
            y: acc.y + point[1]
          }), { x: 0, y: 0 });
          return {
            x: sum.x / pts.length,
            y: sum.y / pts.length
          };
        }
      }
      return {
        x: Number(area.labelX || 0),
        y: Number(area.labelY || 0)
      };
    },

    calcTranslateForMapPoint(scale, mapX, mapY) {
      if (!Number.isFinite(mapX) || !Number.isFinite(mapY)) {
        return this.clampTranslate(scale, this.data.translateX, this.data.translateY);
      }
      const vb = this.parseViewBox();
      const cw = this._canvasWidth || 1;
      const ch = this._canvasHeight || 1;
      const fitScale = Math.min(cw / vb.width, ch / vb.height);
      const drawScale = fitScale * scale;
      const drawWidth = vb.width * drawScale;
      const drawHeight = vb.height * drawScale;
      const baseOffsetX = (cw - drawWidth) / 2;
      const baseOffsetY = (ch - drawHeight) / 2;
      const tx = cw / 2 - baseOffsetX - (mapX - vb.minX) * drawScale;
      const ty = ch / 2 - baseOffsetY - (mapY - vb.minY) * drawScale;
      return this.clampTranslate(scale, tx, ty);
    },

    enterAreaSeatMode(area, options = {}) {
      if (!area) return;
      const sourceArea = (this.data.allAreas || []).find((item) => item.id === area.id) || area;
      if (sourceArea.disabled) {
        wx.showToast({ title: '该区域不可选', icon: 'none' });
        return;
      }

      const targetLevelId = String(sourceArea.levelId || 'all');
      const visibleAreas = this.filterAreasByLevel(this.data.allAreas || [], targetLevelId);
      const areas = this.buildSelectedAreas(visibleAreas, sourceArea.id);
      const selectedArea = areas.find((item) => item.id === sourceArea.id) || { ...sourceArea, selected: true };
      const priceBubbles = visibleAreas
        .filter((item) => item.bubblePosition && item.bubblePrice)
        .map((item) => ({
          id: `bubble-${item.id}`,
          areaId: item.id,
          x: item.bubblePosition.x,
          y: item.bubblePosition.y,
          price: item.bubblePrice
        }));

      const center = options.targetPoint || this.getAreaCenter(sourceArea);
      const requestedScale = Number(options.scale);
      const nextScale = Number.isFinite(requestedScale)
        ? Math.min(3.2, Math.max(2.2, requestedScale))
        : Math.min(3.2, Math.max(2.6, Number(this.data.scale || 1)));
      const translated = this.calcTranslateForMapPoint(nextScale, Number(center.x), Number(center.y));

      const updateData = {
        activeLevelId: targetLevelId,
        areas,
        priceBubbles,
        selectedArea,
        legend: this.buildLegend(visibleAreas),
        areaSeatMode: true,
        focusedAreaId: sourceArea.id,
        focusedAreaName: sourceArea.name || '',
        scale: nextScale,
        lodMode: 'seat',
        translateX: translated.x,
        translateY: translated.y
      };

      if (options.selectedSeat) {
        updateData.selectedSeat = options.selectedSeat;
      } else if (!options.keepSelectedSeat) {
        updateData.selectedSeat = null;
      }

      this.setData(updateData, () => {
        this.scheduleCanvasDraw();
      });

      if (!options.silent) {
        this.triggerEvent('areaSelect', {
          areaId: sourceArea.id,
          area: selectedArea
        });
      }
    },

    exitAreaSeatMode(options = {}) {
      const keepTransform = !!options.keepTransform;
      const scale = keepTransform ? Number(this.data.scale || 1) : 1;
      const translateX = keepTransform ? Number(this.data.translateX || 0) : 0;
      const translateY = keepTransform ? Number(this.data.translateY || 0) : 0;
      const updateData = {
        areaSeatMode: false,
        focusedAreaId: '',
        focusedAreaName: '',
        scale,
        translateX,
        translateY,
        lodMode: this.getLodMode(scale)
      };
      if (!keepTransform) {
        updateData.selectedSeat = null;
      }
      this.setData(updateData, () => {
        this.scheduleCanvasDraw();
      });
    },

    toCanvasPoint(meta, x, y) {
      return {
        x: meta.offsetX + (x - meta.minX) * meta.drawScale,
        y: meta.offsetY + (y - meta.minY) * meta.drawScale
      };
    },

    toMapPoint(meta, x, y) {
      return {
        x: (x - meta.offsetX) / meta.drawScale + meta.minX,
        y: (y - meta.offsetY) / meta.drawScale + meta.minY
      };
    },

    parsePolygonPoints(points) {
      if (Array.isArray(points)) {
        return points
          .map((pair) => {
            if (Array.isArray(pair)) return pair;
            if (pair && typeof pair === 'object') return [Number(pair.x), Number(pair.y)];
            return [];
          })
          .filter((pair) => pair.length === 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]));
      }
      return String(points || '')
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map((v) => Number(v)))
        .filter((pair) => pair.length === 2 && Number.isFinite(pair[0]) && Number.isFinite(pair[1]));
    },

    drawEllipsePath(ctx, x, y, rx, ry) {
      if (typeof ctx.ellipse === 'function') {
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        return;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(Math.max(rx, 1), Math.max(ry, 1));
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.restore();
    },

    safeFillText(ctx, text, x, y) {
      try {
        ctx.fillText(text, x, y);
      } catch (err) {
        // Some runtimes can throw for font issues; avoid breaking the full draw.
      }
    },

    drawSeatMapCanvas() {
      this.ensureCanvasReady(() => {
        try {
          const ctx = this._ctx;
          if (!ctx) return;

          const meta = this.getRenderMeta();
          this._renderMeta = meta;
          this._seatHitPoints = [];
          ctx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);

          // Boundary
          const b = this.data.boundary || {};
          const bc = this.toCanvasPoint(meta, Number(b.cx || 0), Number(b.cy || 0));
          ctx.beginPath();
          this.drawEllipsePath(
            ctx,
            bc.x,
            bc.y,
            Math.max(1, Number(b.rx || 0) * meta.drawScale),
            Math.max(1, Number(b.ry || 0) * meta.drawScale)
          );
          ctx.strokeStyle = '#d9dde4';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Stage
          const stage = this.data.stage || {};
          const sc = this.toCanvasPoint(meta, Number(stage.cx || 0), Number(stage.cy || 0));
          ctx.beginPath();
          this.drawEllipsePath(
            ctx,
            sc.x,
            sc.y,
            Math.max(1, Number(stage.rx || 0) * meta.drawScale),
            Math.max(1, Number(stage.ry || 0) * meta.drawScale)
          );
          ctx.fillStyle = '#747680';
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '600 12px sans-serif';
          this.safeFillText(ctx, stage.label || '舞台', sc.x, sc.y);

          const isAreaSeatMode = !!this.data.areaSeatMode;
          const focusedAreaId = String(this.data.focusedAreaId || '');
          const hasFocusedArea = isAreaSeatMode && !!focusedAreaId;

          // Areas + labels + users
          (this.data.areas || []).forEach((area) => {
            const isFocusedArea = !hasFocusedArea || String(area.id) === focusedAreaId;
            const fillColor = area.fillColor || '#e9ecf2';
            const strokeColor = area.strokeColor || '#d0d7e2';
            const strokeWidth = Number(area.strokeWidth || 1);
            ctx.save();
            if (hasFocusedArea && !isFocusedArea) {
              ctx.globalAlpha = 0.2;
            }

            if (area.shapeType === 'polygon') {
              const pts = this.parsePolygonPoints(area.points);
              if (pts.length > 2) {
                ctx.beginPath();
                const first = this.toCanvasPoint(meta, pts[0][0], pts[0][1]);
                ctx.moveTo(first.x, first.y);
                for (let i = 1; i < pts.length; i++) {
                  const p = this.toCanvasPoint(meta, pts[i][0], pts[i][1]);
                  ctx.lineTo(p.x, p.y);
                }
                ctx.closePath();
                ctx.fillStyle = fillColor;
                ctx.fill();
                ctx.lineWidth = strokeWidth;
                ctx.strokeStyle = strokeColor;
                ctx.stroke();
              }
            } else if (area.shapeType === 'rect') {
              const p = this.toCanvasPoint(meta, Number(area.x || 0), Number(area.y || 0));
              const w = Number(area.width || 0) * meta.drawScale;
              const h = Number(area.height || 0) * meta.drawScale;
              if (w > 0 && h > 0) {
                ctx.fillStyle = fillColor;
                ctx.fillRect(p.x, p.y, w, h);
                ctx.lineWidth = strokeWidth;
                ctx.strokeStyle = strokeColor;
                ctx.strokeRect(p.x, p.y, w, h);
              }
            }

            const lp = this.toCanvasPoint(meta, Number(area.labelX || 0), Number(area.labelY || 0));
            ctx.fillStyle = area.labelColor || '#2f3642';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `600 ${Math.max(9, Number(area.labelSize || 10))}px sans-serif`;
            this.safeFillText(ctx, String(area.name || ''), lp.x, lp.y);

            (area.users || []).forEach((user) => {
              const up = this.toCanvasPoint(meta, Number(user.x || 0), Number(user.y || 0));
              const r = Math.max(2, Number(user.r || 3));
              ctx.beginPath();
              ctx.arc(up.x, up.y, r, 0, Math.PI * 2);
              ctx.fillStyle = user.color || '#ff4f6a';
              ctx.fill();
              if (user.isMe) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
              }
            });

            if (this.data.lodMode !== 'area' && (!hasFocusedArea || isFocusedArea)) {
              this.drawAreaRows(ctx, meta, area);
            }

            if (this.data.lodMode === 'seat' && (!hasFocusedArea || isFocusedArea)) {
              this.drawAreaSeatDots(ctx, meta, area);
            }
            ctx.restore();
          });

          this.drawSelectedSeat(ctx, meta);

          // Price bubbles
          (this.data.priceBubbles || []).forEach((item) => {
            if (hasFocusedArea && String(item.areaId) !== focusedAreaId) {
              return;
            }
            const p = this.toCanvasPoint(meta, Number(item.x || 0), Number(item.y || 0));
            const w = 56;
            const h = 22;
            const x = p.x - 28;
            const y = p.y - 23;
            const r = 11;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#d2d8e3';
            ctx.stroke();

            ctx.fillStyle = '#2f3642';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '10px sans-serif';
            this.safeFillText(ctx, `¥${item.price}`, p.x, p.y - 11);

            ctx.beginPath();
            ctx.moveTo(p.x - 4, p.y);
            ctx.lineTo(p.x + 4, p.y);
            ctx.lineTo(p.x, p.y + 7);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#d2d8e3';
            ctx.stroke();
          });
        } catch (err) {
          console.error('drawSeatMapCanvas failed:', err);
          if (!this.data.canvasError) {
            this.setData({ canvasError: '座位图绘制失败，请重试' });
          }
        }
      });
    },

    pointInPolygon(point, polygon) {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0];
        const yi = polygon[i][1];
        const xj = polygon[j][0];
        const yj = polygon[j][1];
        const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-6) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    },

    drawAreaRows(ctx, meta, area) {
      const model = area && area.seatModel;
      if (!model || !model.anchor || !model.rowVector || !model.rowCount) return;
      const count = Number(model.rowCount || 0);
      if (!count || count > 120) return;

      const rowStart = Number(model.rowStart || 1);
      for (let i = 0; i < count; i++) {
        const row = rowStart + i;
        const x = Number(model.anchor.x || 0) + i * Number(model.rowVector.x || 0);
        const y = Number(model.anchor.y || 0) + i * Number(model.rowVector.y || 0);
        const p = this.toCanvasPoint(meta, x, y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(201, 168, 106, 0.55)';
        ctx.fill();
        if (i % 4 === 0) {
          ctx.fillStyle = 'rgba(245, 242, 234, 0.86)';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          this.safeFillText(ctx, `${row}`, p.x + 4, p.y);
        }
      }
    },

    drawAreaSeatDots(ctx, meta, area) {
      const model = area && area.seatModel;
      if (!model) return;
      const points = this.collectSeatPoints(area, 220);
      points.forEach((seatPoint) => {
        const p = this.toCanvasPoint(meta, seatPoint.x, seatPoint.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        const status = seatPoint.status || 'available';
        let color = 'rgba(255, 255, 255, 0.65)';
        if (status === 'sold') color = 'rgba(143, 138, 128, 0.9)';
        if (status === 'blocked') color = 'rgba(255, 95, 99, 0.9)';
        if (status === 'available') color = 'rgba(201, 168, 106, 0.92)';
        ctx.fillStyle = color;
        ctx.fill();
        this._seatHitPoints.push({
          areaId: area.id,
          row: seatPoint.row,
          seat: seatPoint.seat,
          coordKey: seatPoint.coordKey || this.buildCoordKey(seatPoint.row, seatPoint.seat),
          x: seatPoint.x,
          y: seatPoint.y,
          status
        });
      });
    },

    collectSeatPoints(area, limit = 220) {
      const model = area && area.seatModel;
      const seatDetail = this.data.seatDetail;
      if (seatDetail && seatDetail.enabled && Array.isArray(seatDetail.seats)) {
        const fromDetail = seatDetail.seats
          .filter((item) => item && String(item.areaId || '') === String(area.id))
          .filter((item) => Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)))
          .slice(0, limit)
          .map((item) => ({
            row: Number(item.row || 0),
            seat: Number(item.seat || 0),
            coordKey: item.coordKey || this.buildCoordKey(item.row, item.seat),
            x: Number(item.x),
            y: Number(item.y),
            status: String(item.status || 'available')
          }));
        if (fromDetail.length) return fromDetail;
      }

      if (!model) return [];

      if (model.mode === 'custom_points') {
        return (model.pointSeats || [])
          .filter((item) => item && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)))
          .slice(0, limit)
          .map((item) => ({
            row: Number(item.row || 0),
            seat: Number(item.seat || 0),
            coordKey: item.coordKey || this.buildCoordKey(item.row, item.seat),
            x: Number(item.x),
            y: Number(item.y)
          }));
      }

      if (model.mode === 'hybrid') {
        const points = [];
        const pointSeats = (model.pointSeats || []).slice(0, Math.floor(limit * 0.5));
        pointSeats.forEach((item) => {
          if (Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y))) {
            points.push({
              row: Number(item.row || 0),
              seat: Number(item.seat || 0),
              coordKey: item.coordKey || this.buildCoordKey(item.row, item.seat),
              x: Number(item.x),
              y: Number(item.y),
              status: String(item.status || 'available')
            });
          }
        });
        const gridPoints = this.collectGridSeatPoints(model.rule || {}, limit - points.length);
        return [...points, ...gridPoints];
      }

      if (model.mode === 'grid') {
        return this.collectGridSeatPoints(model, limit);
      }

      return [];
    },

    collectGridSeatPoints(model, limit = 220) {
      const rowCount = Number(model.rowCount || 0);
      const rowStart = Number(model.rowStart || 1);
      const seatStart = Number(model.seatStart || 1);
      const defaultSeats = Number(model.defaultSeatsPerRow || 0);
      if (!rowCount || !defaultSeats) return [];

      const points = [];
      const maxRows = Math.min(rowCount, 24);
      for (let r = 0; r < maxRows; r++) {
        const row = rowStart + r;
        const perRow = Array.isArray(model.perRowSeatCounts) && model.perRowSeatCounts[r]
          ? Number(model.perRowSeatCounts[r])
          : defaultSeats;
        const maxSeats = Math.min(perRow, 26);
        for (let s = 0; s < maxSeats; s++) {
          if (points.length >= limit) return points;
          const seat = seatStart + s;
          const point = this.calcGridSeatPoint(model, row, seat);
          if (!point) continue;
          points.push({
            row,
            seat,
            coordKey: this.buildCoordKey(row, seat),
            x: point.x,
            y: point.y,
            status: 'available'
          });
        }
      }
      return points;
    },

    buildCoordKey(row, seat) {
      const rowNum = Number(row);
      const seatNum = Number(seat);
      if (!Number.isFinite(rowNum) || !Number.isFinite(seatNum)) return '';
      return `${rowNum},${seatNum}`;
    },

    calcGridSeatPoint(model, row, seat) {
      if (!model || !model.anchor || !model.rowVector || !model.seatVector) return null;
      const rowStart = Number(model.rowStart || 1);
      const seatStart = Number(model.seatStart || 1);
      const rowIndex = row - rowStart;
      const seatIndex = seat - seatStart;
      const x = Number(model.anchor.x || 0)
        + rowIndex * Number(model.rowVector.x || 0)
        + seatIndex * Number(model.seatVector.x || 0);
      const y = Number(model.anchor.y || 0)
        + rowIndex * Number(model.rowVector.y || 0)
        + seatIndex * Number(model.seatVector.y || 0);
      return { x, y };
    },

    findSeatPoint(areaId, coordKey, fallbackRow, fallbackSeat) {
      const normalizedAreaId = String(areaId || '');
      const targetCoordKey = String(coordKey || '').trim();
      const fallbackKey = this.buildCoordKey(fallbackRow, fallbackSeat);
      const targetKey = targetCoordKey || fallbackKey;
      if (!normalizedAreaId || !targetKey) return null;

      const area = (this.data.allAreas || []).find((item) => item.id === normalizedAreaId);
      if (!area) return null;

      const points = this.collectSeatPoints(area, 2000);
      for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        const pointKey = String(p.coordKey || this.buildCoordKey(p.row, p.seat) || '').trim();
        if (pointKey && pointKey === targetKey) {
          return {
            areaId: normalizedAreaId,
            row: Number(p.row || fallbackRow || 0),
            seat: Number(p.seat || fallbackSeat || 0),
            coordKey: pointKey,
            x: Number(p.x),
            y: Number(p.y),
            status: p.status || 'available'
          };
        }
      }

      return null;
    },

    drawSelectedSeat(ctx, meta) {
      const seat = this.data.selectedSeat;
      if (!seat || typeof seat.x !== 'number' || typeof seat.y !== 'number') return;
      const p = this.toCanvasPoint(meta, seat.x, seat.y);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff5f63';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5f63';
      ctx.fill();
    },

    hitTestArea(mapPoint, area) {
      if (area.shapeType === 'rect') {
        const x = Number(area.x || 0);
        const y = Number(area.y || 0);
        const w = Number(area.width || 0);
        const h = Number(area.height || 0);
        return mapPoint.x >= x && mapPoint.x <= x + w && mapPoint.y >= y && mapPoint.y <= y + h;
      }
      if (area.shapeType === 'polygon') {
        const pts = this.parsePolygonPoints(area.points);
        if (pts.length < 3) return false;
        return this.pointInPolygon(mapPoint, pts);
      }
      // Path hit fallback: near area label
      const dx = mapPoint.x - Number(area.labelX || 0);
      const dy = mapPoint.y - Number(area.labelY || 0);
      return (dx * dx + dy * dy) <= 100;
    },

    selectArea(area, options = {}) {
      if (!area) return;
      if (area.disabled) {
        wx.showToast({ title: '该区域不可选', icon: 'none' });
        return;
      }

      const areas = this.buildSelectedAreas(this.data.areas || [], area.id);
      const updateData = {
        areas,
        selectedArea: { ...area, selected: true }
      };
      if (!options.keepSelectedSeat) {
        updateData.selectedSeat = null;
      }

      this.setData(updateData, () => {
        this.scheduleCanvasDraw();
      });

      if (!options.silent) {
        this.triggerEvent('areaSelect', {
          areaId: area.id,
          area: { ...area, selected: true }
        });
      }
    },

    updateSelectedArea(selectedId) {
      if (!(this.data.allAreas || []).length) return;
      let visibleAreas = this.data.areas || [];
      const target = (this.data.allAreas || []).find((item) => item.id === selectedId);
      if (target) {
        const targetLevelId = String(target.levelId || 'all');
        if (targetLevelId !== this.data.activeLevelId) {
          visibleAreas = this.filterAreasByLevel(this.data.allAreas || [], targetLevelId);
          this.setData({
            activeLevelId: targetLevelId,
            areas: visibleAreas,
            legend: this.buildLegend(visibleAreas)
          });
        }
      }

      const areas = this.buildSelectedAreas(visibleAreas, selectedId);

      this.setData({
        areas,
        selectedArea: areas.find((area) => area.id === selectedId) || null
      }, () => {
        this.scheduleCanvasDraw();
      });
    },

    onAreaTap(e) {
      if (!this.properties.interactive) return;
      const areaId = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.areaId : '';
      const area = this.data.areas.find((item) => item.id === areaId);
      this.enterAreaSeatMode(area);
    },

    onCanvasTap(e) {
      if (!this.properties.interactive || !this._renderMeta) return;

      const x = (e && e.detail && typeof e.detail.x === 'number')
        ? e.detail.x
        : (e && e.touches && e.touches[0] ? e.touches[0].x : 0);
      const y = (e && e.detail && typeof e.detail.y === 'number')
        ? e.detail.y
        : (e && e.touches && e.touches[0] ? e.touches[0].y : 0);

      const mapPoint = this.toMapPoint(this._renderMeta, x, y);

      if (this.data.lodMode === 'seat') {
        const hitSeat = this.hitTestSeat(mapPoint);
        if (hitSeat) {
          const area = (this.data.allAreas || []).find((item) => item.id === hitSeat.areaId);
          if (area) {
            this.selectArea(area, { keepSelectedSeat: true });
            this.setData({ selectedSeat: { ...hitSeat } }, () => {
              this.scheduleCanvasDraw();
            });
          }
          this.triggerEvent('seatTap', { ...hitSeat });
          return;
        }
      }

      const areas = this.data.areas || [];
      for (let i = areas.length - 1; i >= 0; i--) {
        const area = areas[i];
        if (this.hitTestArea(mapPoint, area)) {
          this.enterAreaSeatMode(area);
          return;
        }
      }
    },

    hitTestSeat(mapPoint) {
      const list = this._seatHitPoints || [];
      if (!list.length) return null;
      let winner = null;
      let bestDist = Infinity;
      const threshold = Math.max(3.6, 7 / Math.max(1, this.data.scale || 1));
      const thresholdSq = threshold * threshold;
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        const dx = mapPoint.x - Number(item.x || 0);
        const dy = mapPoint.y - Number(item.y || 0);
        const distSq = dx * dx + dy * dy;
        if (distSq <= thresholdSq && distSq < bestDist) {
          bestDist = distSq;
          winner = item;
        }
      }
      return winner;
    },

    onLevelChange(e) {
      const levelId = e && e.currentTarget && e.currentTarget.dataset
        ? String(e.currentTarget.dataset.levelId || 'all')
        : 'all';
      const visibleAreas = this.filterAreasByLevel(this.data.allAreas || [], levelId);
      const selectedId = this.data.areaSeatMode ? this.data.focusedAreaId : this.properties.selectedAreaId;
      const selectedArea = visibleAreas.find((area) => area.id === selectedId) || null;
      const priceBubbles = visibleAreas
        .filter((area) => area.bubblePosition && area.bubblePrice)
        .map((area) => ({
          id: `bubble-${area.id}`,
          areaId: area.id,
          x: area.bubblePosition.x,
          y: area.bubblePosition.y,
          price: area.bubblePrice
        }));
      const areas = this.buildSelectedAreas(visibleAreas, selectedArea ? selectedArea.id : '');
      const focusStillVisible = !!(
        this.data.areaSeatMode
        && selectedArea
        && String(selectedArea.id) === String(this.data.focusedAreaId || '')
      );

      const updateData = {
        activeLevelId: levelId,
        areas,
        priceBubbles,
        selectedArea,
        legend: this.buildLegend(visibleAreas)
      };
      if (this.data.areaSeatMode && !focusStillVisible) {
        updateData.areaSeatMode = false;
        updateData.focusedAreaId = '';
        updateData.focusedAreaName = '';
        updateData.lodMode = this.getLodMode(this.data.scale || 1);
      }

      this.setData(updateData, () => {
        this.scheduleCanvasDraw();
      });

      this.triggerEvent('levelChange', { levelId });
    },

    confirmSelection() {
      if (!this.data.selectedArea) return;
      this.triggerEvent('confirm', {
        areaId: this.data.selectedArea.id,
        area: this.data.selectedArea
      });
    },

    zoomIn() {
      this.setScale(Math.min(this.data.scale * 1.2, 3));
    },

    zoomOut() {
      this.setScale(Math.max(this.data.scale / 1.2, 0.8));
    },

    resetZoom() {
      if (this.data.areaSeatMode) {
        this.exitAreaSeatMode();
        return;
      }
      this.setScale(1);
      this.setData({ translateX: 0, translateY: 0 }, () => {
        this.scheduleCanvasDraw();
      });
    },

    setScale(scale) {
      const nextScale = this.data.areaSeatMode
        ? Math.max(2.2, Number(scale || 1))
        : Number(scale || 1);
      const clamped = this.clampTranslate(nextScale, this.data.translateX, this.data.translateY);
      const lodMode = this.data.areaSeatMode ? 'seat' : this.getLodMode(nextScale);
      this.setData({ scale: nextScale, translateX: clamped.x, translateY: clamped.y, lodMode });
      this.triggerEvent('zoom', { scale: nextScale, lodMode });
      this.scheduleCanvasDraw();
    },

    onCanvasTouchStart(e) {
      const touches = (e && e.touches) || [];
      if (touches.length === 1) {
        this._panStart = {
          x: touches[0].x,
          y: touches[0].y,
          tx: this.data.translateX,
          ty: this.data.translateY
        };
        this._pinchStart = null;
        return;
      }
      if (touches.length >= 2) {
        const dx = touches[0].x - touches[1].x;
        const dy = touches[0].y - touches[1].y;
        this._pinchStart = {
          dist: Math.sqrt(dx * dx + dy * dy),
          scale: this.data.scale
        };
        this._panStart = null;
      }
    },

    onCanvasTouchMove(e) {
      const touches = (e && e.touches) || [];
      if (touches.length >= 2 && this._pinchStart) {
        const dx = touches[0].x - touches[1].x;
        const dy = touches[0].y - touches[1].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const ratio = this._pinchStart.dist > 0 ? (dist / this._pinchStart.dist) : 1;
        const nextScale = Math.min(3.2, Math.max(0.8, this._pinchStart.scale * ratio));
        this.setScale(Number(nextScale.toFixed(3)));
        return;
      }

      if (touches.length === 1 && this._panStart) {
        const dx = touches[0].x - this._panStart.x;
        const dy = touches[0].y - this._panStart.y;
        const next = this.clampTranslate(this.data.scale, this._panStart.tx + dx, this._panStart.ty + dy);
        this.setData({ translateX: next.x, translateY: next.y }, () => {
          this.scheduleCanvasDraw();
        });
      }
    },

    onCanvasTouchEnd() {
      this._panStart = null;
      this._pinchStart = null;
    },

    updateUserDots(areaId, users) {
      const update = (list) => list.map((area) => {
        if (area.id !== areaId) return area;
        const mappedUsers = (users || []).map((user, idx) => ({
          id: user.id || `u-${idx}`,
          x: typeof user.x === 'number' ? user.x : area.labelX + (Math.random() - 0.5) * 28,
          y: typeof user.y === 'number' ? user.y : area.labelY + (Math.random() - 0.5) * 24,
          r: user.isMe ? 5 : 3,
          color: user.color || (user.isMe ? '#ff4f6a' : '#5ac878'),
          isMe: !!user.isMe
        }));
        return {
          ...area,
          users: mappedUsers
        };
      });

      const areas = update(this.data.areas || []);
      const allAreas = update(this.data.allAreas || []);

      this.setData({ areas, allAreas }, () => {
        this.scheduleCanvasDraw();
      });
    },

    locateSeat(payload = {}) {
      const areaId = String(payload.areaId || '');
      const row = Number(payload.row || 0);
      const seat = Number(payload.seat || 0);
      const coordKey = String(payload.coordKey || '').trim() || this.buildCoordKey(row, seat);

      let x = Number(payload.x);
      let y = Number(payload.y);
      let selectedSeat = {
        areaId,
        row,
        seat,
        coordKey,
        x,
        y
      };

      if (!areaId) return;

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        const hit = this.findSeatPoint(areaId, coordKey, row, seat);
        if (!hit) return;
        x = hit.x;
        y = hit.y;
        selectedSeat = { ...hit };
      }

      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const area = (this.data.allAreas || []).find((item) => item.id === areaId);
      if (!area) return;
      this.enterAreaSeatMode(area, {
        targetPoint: { x, y },
        selectedSeat,
        scale: Math.max(this.data.scale || 1, 2.6),
        silent: true
      });

      this.triggerEvent('seatTap', {
        areaId,
        row: Number(selectedSeat.row || row),
        seat: Number(selectedSeat.seat || seat),
        coordKey: selectedSeat.coordKey || coordKey,
        x,
        y
      });
    },

    getDefaultSeatData() {
      return {
        viewBox: DEFAULT_VIEWBOX,
        stage: { cx: 310, cy: 285, rx: 90, ry: 50, label: '舞台' },
        boundary: { cx: 310, cy: 285, rx: 300, ry: 255 },
        areas: [
          {
            id: 'vip-1',
            name: 'VIP1',
            type: 'vip',
            shapeType: 'polygon',
            points: '330,220 390,220 390,280 350,300 330,270',
            labelX: 360,
            labelY: 255,
            price: 1680,
            bubblePosition: { x: 360, y: 210 }
          },
          {
            id: 'vip-2',
            name: 'VIP2',
            type: 'vip',
            shapeType: 'polygon',
            points: '230,220 290,220 290,270 270,300 230,280',
            labelX: 260,
            labelY: 255,
            price: 1280,
            bubblePosition: { x: 260, y: 210 }
          },
          {
            id: 'a-101',
            name: '101',
            type: 'standard',
            shapeType: 'polygon',
            points: '140,165 220,170 220,230 140,240',
            labelX: 180,
            labelY: 205,
            price: 680
          },
          {
            id: 'a-102',
            name: '102',
            type: 'standard',
            shapeType: 'polygon',
            points: '400,170 480,165 480,240 400,230',
            labelX: 440,
            labelY: 205,
            price: 680
          }
        ]
      };
    }
  }
});
