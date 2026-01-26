// components/concert-card/concert-card.js
const { STAGE_COLORS, PLATFORMS, PLATFORM_LIST } = require('../../utils/constants');
const { formatDateRange } = require('../../utils/util');

Component({
  properties: {
    concert: {
      type: Object,
      value: {}
    },
    showSubscribe: {
      type: Boolean,
      value: true
    }
  },

  data: {
    platformList: PLATFORM_LIST,
    platforms: PLATFORMS
  },

  computed: {
    dateRange() {
      return formatDateRange(this.data.concert.dates);
    }
  },

  lifetimes: {
    attached() {
      this.setData({
        dateRange: formatDateRange(this.data.concert.dates)
      });
    }
  },

  observers: {
    'concert.dates': function(dates) {
      this.setData({
        dateRange: formatDateRange(dates)
      });
    }
  },

  methods: {
    // 点击卡片查看详情
    onTapCard() {
      const { concert } = this.data;
      wx.navigateTo({
        url: `/pages/detail/detail?id=${concert._id}`
      });
    },

    // 点击追更/订阅按钮
    onTapSubscribe(e) {
      // 阻止事件冒泡
      // e.stopPropagation();
      this.triggerEvent('subscribe', { concert: this.data.concert });
    },

    // 点击平台图标
    onTapPlatform(e) {
      const { platform } = e.currentTarget.dataset;
      const platformData = this.data.concert.platforms[platform];

      if (platformData && platformData.available && platformData.url) {
        // 复制链接
        wx.setClipboardData({
          data: platformData.url,
          success: () => {
            wx.showToast({
              title: '链接已复制',
              icon: 'success'
            });
          }
        });
      }
    },

    // 获取阶段颜色
    getStageColor(stage) {
      return STAGE_COLORS[stage] || '#999999';
    }
  }
});
