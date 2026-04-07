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
    areas: [],
    priceBubbles: [],
    selectedArea: null,
    scale: 1,
    overlayImage: '',
    overlayOpacity: 0.42,
    legend: []
  },

  lifetimes: {
    attached() {
      if (this.properties.seatData) {
        this.processSeatData(this.properties.seatData);
      } else {
        this.processSeatData(this.getDefaultSeatData());
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

      const selectedArea = normalizedAreas.find((area) => area.id === selectedId) || null;
      const priceBubbles = normalizedAreas
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
        areas: normalizedAreas,
        priceBubbles,
        selectedArea,
        overlayImage: seatData.backgroundImage || seatData.sourceImage || '',
        overlayOpacity: this.normalizeOpacity(seatData.overlayOpacity),
        legend: this.buildLegend(normalizedAreas)
      });
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

    updateSelectedArea(selectedId) {
      if (!this.data.areas.length) return;
      const areas = this.data.areas.map((area) => {
        const selected = area.id === selectedId;
        return {
          ...area,
          selected,
          strokeColor: selected ? '#ff4f6a' : '#ffffff',
          strokeWidth: selected ? 3 : 1
        };
      });

      this.setData({
        areas,
        selectedArea: areas.find((area) => area.id === selectedId) || null
      });
    },

    onAreaTap(e) {
      if (!this.properties.interactive) return;

      const areaId = e.currentTarget.dataset.areaId;
      const area = this.data.areas.find((item) => item.id === areaId);
      if (!area) return;

      if (area.disabled) {
        wx.showToast({ title: '该区域不可选', icon: 'none' });
        return;
      }

      const areas = this.data.areas.map((item) => {
        const selected = item.id === area.id;
        return {
          ...item,
          selected,
          strokeColor: selected ? '#ff4f6a' : '#ffffff',
          strokeWidth: selected ? 3 : 1
        };
      });

      this.setData({
        areas,
        selectedArea: { ...area, selected: true }
      });

      this.triggerEvent('areaSelect', {
        areaId: area.id,
        area: { ...area, selected: true }
      });
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
      this.setScale(1);
    },

    setScale(scale) {
      this.setData({ scale });
      this.triggerEvent('zoom', { scale });
    },

    updateUserDots(areaId, users) {
      const areas = this.data.areas.map((area) => {
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

      this.setData({ areas });
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
