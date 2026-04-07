// utils/cache.js - 缓存管理工具

/**
 * 缓存管理器
 * 提供本地存储和内存缓存的封装
 */
class CacheManager {
  constructor() {
    this.memoryCache = new Map();
  }

  /**
   * 获取缓存键
   * @param {string} prefix 前缀
   * @param {string} key 键
   * @returns {string}
   */
  getKey(prefix, key) {
    return `${prefix}_${key}`;
  }

  /**
   * 设置缓存
   * @param {string} key 键
   * @param {*} data 数据
   * @param {number} ttl 过期时间（毫秒）
   * @param {boolean} useStorage 是否使用本地存储
   */
  set(key, data, ttl = 60000, useStorage = false) {
    const item = {
      data,
      expireTime: Date.now() + ttl
    };

    // 内存缓存
    this.memoryCache.set(key, item);

    // 本地存储（可选）
    if (useStorage) {
      try {
        wx.setStorageSync(key, item);
      } catch (e) {
        console.warn('本地存储失败:', e);
      }
    }
  }

  /**
   * 获取缓存
   * @param {string} key 键
   * @param {boolean} checkStorage 是否检查本地存储
   * @returns {*} 缓存数据或null
   */
  get(key, checkStorage = false) {
    // 先查内存
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && Date.now() < memoryItem.expireTime) {
      return memoryItem.data;
    }

    // 内存未命中，查本地存储
    if (checkStorage) {
      try {
        const storageItem = wx.getStorageSync(key);
        if (storageItem && Date.now() < storageItem.expireTime) {
          // 回填内存
          this.memoryCache.set(key, storageItem);
          return storageItem.data;
        }
      } catch (e) {
        console.warn('读取本地存储失败:', e);
      }
    }

    return null;
  }

  /**
   * 删除缓存
   * @param {string} key 键
   */
  remove(key) {
    this.memoryCache.delete(key);
    try {
      wx.removeStorageSync(key);
    } catch (e) {
      console.warn('删除本地存储失败:', e);
    }
  }

  /**
   * 清空缓存
   */
  clear() {
    this.memoryCache.clear();
  }

  /**
   * 缓存装饰器 - 用于包装异步函数
   * @param {Function} fn 原函数
   * @param {string} keyPrefix 缓存键前缀
   * @param {number} ttl 过期时间
   * @returns {Function}
   */
  decorator(fn, keyPrefix, ttl = 60000) {
    const cache = this;
    return async function(...args) {
      const key = cache.getKey(keyPrefix, JSON.stringify(args));
      const cached = cache.get(key);
      
      if (cached !== null) {
        console.log(`[Cache Hit] ${keyPrefix}`);
        return cached;
      }

      const data = await fn.apply(this, args);
      cache.set(key, data, ttl);
      return data;
    };
  }
}

// 单例实例
const cacheManager = new CacheManager();

module.exports = cacheManager;
