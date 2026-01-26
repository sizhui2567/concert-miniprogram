// components/search-bar/search-bar.js
const { debounce } = require('../../utils/util');

Component({
  properties: {
    placeholder: {
      type: String,
      value: '搜索艺人、城市...'
    },
    value: {
      type: String,
      value: ''
    },
    focus: {
      type: Boolean,
      value: false
    },
    disabled: {
      type: Boolean,
      value: false
    }
  },

  data: {
    inputValue: ''
  },

  lifetimes: {
    attached() {
      this.setData({
        inputValue: this.data.value
      });
      // 创建防抖搜索函数
      this.debouncedSearch = debounce(this.emitSearch.bind(this), 500);
    }
  },

  observers: {
    'value': function(val) {
      if (val !== this.data.inputValue) {
        this.setData({ inputValue: val });
      }
    }
  },

  methods: {
    // 输入变化
    onInput(e) {
      const value = e.detail.value;
      this.setData({ inputValue: value });
      this.debouncedSearch(value);
    },

    // 发送搜索事件
    emitSearch(value) {
      this.triggerEvent('search', { value });
    },

    // 清空输入
    onClear() {
      this.setData({ inputValue: '' });
      this.triggerEvent('search', { value: '' });
      this.triggerEvent('clear');
    },

    // 聚焦
    onFocus(e) {
      this.triggerEvent('focus', e.detail);
    },

    // 失焦
    onBlur(e) {
      this.triggerEvent('blur', e.detail);
    },

    // 点击搜索框（用于禁用状态跳转）
    onTapSearchBar() {
      if (this.data.disabled) {
        this.triggerEvent('tap');
      }
    },

    // 确认搜索
    onConfirm(e) {
      const value = e.detail.value;
      this.triggerEvent('confirm', { value });
    }
  }
});
