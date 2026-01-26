// components/stage-tag/stage-tag.js
const { STAGE_COLORS, STAGE_BG_COLORS } = require('../../utils/constants');

Component({
  properties: {
    stage: {
      type: String,
      value: '网传'
    },
    size: {
      type: String,
      value: 'normal' // small, normal, large
    }
  },

  data: {
    stageColor: '#999999',
    stageBgColor: 'rgba(153, 153, 153, 0.1)'
  },

  observers: {
    'stage': function(stage) {
      this.setData({
        stageColor: STAGE_COLORS[stage] || '#999999',
        stageBgColor: STAGE_BG_COLORS[stage] || 'rgba(153, 153, 153, 0.1)'
      });
    }
  },

  lifetimes: {
    attached() {
      const { stage } = this.data;
      this.setData({
        stageColor: STAGE_COLORS[stage] || '#999999',
        stageBgColor: STAGE_BG_COLORS[stage] || 'rgba(153, 153, 153, 0.1)'
      });
    }
  }
});
