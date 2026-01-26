// components/platform-icons/platform-icons.js
const { PLATFORMS, PLATFORM_LIST } = require('../../utils/constants');

Component({
  properties: {
    platforms: {
      type: Object,
      value: {}
    },
    size: {
      type: String,
      value: 'normal' // small, normal, large
    }
  },

  data: {
    platformList: PLATFORM_LIST,
    platformInfo: PLATFORMS
  },

  methods: {
    onTapPlatform(e) {
      const { platform } = e.currentTarget.dataset;
      const platformData = this.data.platforms[platform];

      this.triggerEvent('tap-platform', {
        platform,
        data: platformData
      });
    }
  }
});
