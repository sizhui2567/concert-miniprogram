// utils/optimize-api.js - 优化的 API 调用（带缓存和错误处理）

const api = require('./api');
const cache = require('./cache');
const { ErrorHandler } = require('./error-handler');

// 缓存时间配置（毫秒）
const CACHE_TTL = {
  CONCERTS: 5 * 60 * 1000,      // 演唱会列表 5分钟
  CONCERT_DETAIL: 10 * 60 * 1000, // 详情 10分钟
  ARTISTS: 30 * 60 * 1000,      // 艺人列表 30分钟
  TOMORROW: 2 * 60 * 1000       // 明日抢票 2分钟
};

/**
 * 优化的 API 调用
 */
const optimizedApi = {
  /**
   * 获取演唱会列表（带缓存）
   */
  async getConcerts(params = {}) {
    const cacheKey = `concerts_${JSON.stringify(params)}`;
    
    return cache.decorator(
      async (p) => {
        try {
          return await api.getConcerts(p);
        } catch (error) {
          ErrorHandler.handle(error, 'getConcerts');
          throw error;
        }
      },
      'concerts',
      CACHE_TTL.CONCERTS
    )(params);
  },

  /**
   * 获取演唱会详情（带缓存）
   */
  async getConcertDetail(concertId) {
    const cacheKey = `concert_detail_${concertId}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('[Cache] 命中演唱会详情:', concertId);
      return cached;
    }

    try {
      const data = await api.getConcertDetail(concertId);
      cache.set(cacheKey, data, CACHE_TTL.CONCERT_DETAIL);
      return data;
    } catch (error) {
      ErrorHandler.handle(error, 'getConcertDetail');
      throw error;
    }
  },

  /**
   * 获取艺人列表（带缓存）
   */
  async getArtists(params = {}) {
    return cache.decorator(
      async (p) => {
        try {
          return await api.getArtists(p);
        } catch (error) {
          ErrorHandler.handle(error, 'getArtists');
          throw error;
        }
      },
      'artists',
      CACHE_TTL.ARTISTS
    )(params);
  },

  /**
   * 获取明日抢票（带缓存）
   */
  async getTomorrowConcerts() {
    const cacheKey = 'tomorrow_concerts';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const data = await api.getTomorrowConcerts();
      cache.set(cacheKey, data, CACHE_TTL.TOMORROW);
      return data;
    } catch (error) {
      ErrorHandler.handle(error, 'getTomorrowConcerts');
      throw error;
    }
  },

  /**
   * 订阅演唱会（清除相关缓存）
   */
  async subscribeConcert(concertId, subscribe = true) {
    try {
      const result = await api.subscribeConcert(concertId, subscribe);
      
      // 清除相关缓存
      cache.clear();
      
      return result;
    } catch (error) {
      ErrorHandler.handle(error, 'subscribeConcert');
      throw error;
    }
  },

  /**
   * 获取订阅列表（带缓存）
   */
  async getSubscriptions(page = 1, pageSize = 10) {
    const cacheKey = `subscriptions_${page}_${pageSize}`;
    
    // 订阅列表变化频繁，缓存时间较短
    return cache.decorator(
      async (p, ps) => {
        try {
          return await api.getSubscriptions(p, ps);
        } catch (error) {
          ErrorHandler.handle(error, 'getSubscriptions');
          throw error;
        }
      },
      'subscriptions',
      60000  // 1分钟
    )(page, pageSize);
  },

  /**
   * 清除所有缓存
   */
  clearCache() {
    cache.clear();
    console.log('[Cache] 所有缓存已清除');
  }
};

module.exports = optimizedApi;
