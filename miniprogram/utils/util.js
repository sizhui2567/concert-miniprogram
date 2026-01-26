// util.js - 工具函数

/**
 * 格式化日期
 * @param {Date|string} date 日期
 * @param {string} format 格式化模板
 * @returns {string}
 */
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 格式化演出日期范围
 * @param {Array} dates 日期数组
 * @returns {string}
 */
const formatDateRange = (dates) => {
  if (!dates || dates.length === 0) return '';
  if (dates.length === 1) {
    return formatDate(dates[0], 'MM.DD');
  }
  const startDate = formatDate(dates[0], 'MM.DD');
  const endDate = formatDate(dates[dates.length - 1], 'MM.DD');
  return `${startDate}-${endDate}`;
};

/**
 * 格式化时间为相对时间
 * @param {Date|string} date 日期
 * @returns {string}
 */
const formatRelativeTime = (date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`;
  } else {
    return formatDate(d, 'MM-DD HH:mm');
  }
};

/**
 * 计算倒计时
 * @param {Date|string} targetDate 目标时间
 * @returns {Object} { days, hours, minutes, seconds, isExpired }
 */
const getCountdown = (targetDate) => {
  if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };

  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((diff % (60 * 1000)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
};

/**
 * 显示加载提示
 * @param {string} title 提示文字
 */
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  });
};

/**
 * 隐藏加载提示
 */
const hideLoading = () => {
  wx.hideLoading();
};

/**
 * 显示Toast提示
 * @param {string} title 提示内容
 * @param {string} icon 图标类型
 */
const showToast = (title, icon = 'none') => {
  wx.showToast({
    title,
    icon,
    duration: 2000
  });
};

/**
 * 显示模态框
 * @param {Object} options 配置项
 * @returns {Promise}
 */
const showModal = (options) => {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: options.title || '提示',
      content: options.content || '',
      showCancel: options.showCancel !== false,
      cancelText: options.cancelText || '取消',
      confirmText: options.confirmText || '确定',
      success: (res) => {
        resolve(res);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 节流函数
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间
 */
const throttle = (fn, delay = 300) => {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
};

/**
 * 防抖函数
 * @param {Function} fn 要执行的函数
 * @param {number} delay 延迟时间
 */
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

/**
 * 复制文本到剪贴板
 * @param {string} text 要复制的文本
 */
const copyToClipboard = (text) => {
  return new Promise((resolve, reject) => {
    wx.setClipboardData({
      data: text,
      success: () => {
        resolve();
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 检查是否是明天
 * @param {Date|string} date 日期
 * @returns {boolean}
 */
const isTomorrow = (date) => {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();
};

/**
 * 检查是否是今天
 * @param {Date|string} date 日期
 * @returns {boolean}
 */
const isToday = (date) => {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();

  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
};

/**
 * 获取明天的日期字符串
 * @returns {string} YYYY-MM-DD
 */
const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDate(tomorrow, 'YYYY-MM-DD');
};

/**
 * 生成唯一ID
 * @returns {string}
 */
const generateId = () => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

module.exports = {
  formatDate,
  formatDateRange,
  formatRelativeTime,
  getCountdown,
  showLoading,
  hideLoading,
  showToast,
  showModal,
  throttle,
  debounce,
  copyToClipboard,
  isTomorrow,
  isToday,
  getTomorrowDateString,
  generateId
};
