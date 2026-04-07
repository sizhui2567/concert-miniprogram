// utils/error-handler.js - 全局错误处理

/**
 * 错误码映射
 */
const ERROR_CODES = {
  // 网络相关
  NETWORK_ERROR: { code: -1001, message: '网络连接失败，请检查网络' },
  TIMEOUT_ERROR: { code: -1002, message: '请求超时，请稍后重试' },
  SERVER_ERROR: { code: -1003, message: '服务器繁忙，请稍后重试' },
  
  // 业务相关
  NOT_FOUND: { code: -2001, message: '请求的资源不存在' },
  UNAUTHORIZED: { code: -2002, message: '请先登录' },
  FORBIDDEN: { code: -2003, message: '没有权限执行此操作' },
  PARAM_ERROR: { code: -2004, message: '参数错误' },
  
  // 云开发相关
  CLOUD_NOT_INIT: { code: -3001, message: '云服务未初始化' },
  FUNCTION_NOT_FOUND: { code: -3002, message: '服务暂时不可用' },
  DB_ERROR: { code: -3003, message: '数据读取失败' },
  
  // 默认
  UNKNOWN: { code: -9999, message: '操作失败，请重试' }
};

/**
 * 错误处理器
 */
class ErrorHandler {
  /**
   * 解析错误信息
   * @param {Error} error 错误对象
   * @param {string} context 上下文
   * @returns {Object} 标准化的错误信息
   */
  static parse(error, context = '') {
    console.error(`[Error][${context}]`, error);
    
    let errorInfo = ERROR_CODES.UNKNOWN;
    
    if (!error) {
      return errorInfo;
    }

    const message = error.message || error.errMsg || String(error);
    
    // 根据错误信息匹配错误码
    if (message.includes('timeout') || message.includes('超时')) {
      errorInfo = ERROR_CODES.TIMEOUT_ERROR;
    } else if (message.includes('network') || message.includes('fail') || message.includes('ERR_')) {
      errorInfo = ERROR_CODES.NETWORK_ERROR;
    } else if (message.includes('cloud') && message.includes('init')) {
      errorInfo = ERROR_CODES.CLOUD_NOT_INIT;
    } else if (message.includes('FunctionName') || message.includes('not found')) {
      errorInfo = ERROR_CODES.FUNCTION_NOT_FOUND;
    } else if (message.includes('database') || message.includes('collection')) {
      errorInfo = ERROR_CODES.DB_ERROR;
    } else if (message.includes('unauthorized') || message.includes('未登录')) {
      errorInfo = ERROR_CODES.UNAUTHORIZED;
    }

    return {
      ...errorInfo,
      originalError: message,
      context
    };
  }

  /**
   * 处理错误并显示提示
   * @param {Error} error 错误对象
   * @param {string} context 上下文
   * @param {boolean} showToast 是否显示提示
   */
  static handle(error, context = '', showToast = true) {
    const errorInfo = this.parse(error, context);
    
    if (showToast) {
      wx.showToast({
        title: errorInfo.message,
        icon: 'none',
        duration: 2000
      });
    }

    // 可以在这里添加错误上报逻辑
    this.report(errorInfo);

    return errorInfo;
  }

  /**
   * 上报错误（预留）
   * @param {Object} errorInfo 错误信息
   */
  static report(errorInfo) {
    // TODO: 接入日志服务如 Sentry、阿里云日志等
    console.log('[Error Report]', errorInfo);
  }

  /**
   * 包装 Promise 自动处理错误
   * @param {Promise} promise Promise对象
   * @param {string} context 上下文
   * @returns {Promise}
   */
  static async wrap(promise, context = '') {
    try {
      return await promise;
    } catch (error) {
      this.handle(error, context);
      throw error;
    }
  }
}

/**
 * 页面/组件混入 - 添加错误处理能力
 */
const errorMixin = {
  /**
   * 安全调用 - 自动捕获错误
   * @param {Function} fn 要执行的函数
   * @param {string} context 上下文
   * @param {*} defaultValue 出错时的默认值
   */
  async safeCall(fn, context = '', defaultValue = null) {
    try {
      return await fn();
    } catch (error) {
      ErrorHandler.handle(error, context);
      return defaultValue;
    }
  }
};

module.exports = {
  ErrorHandler,
  ERROR_CODES,
  errorMixin
};
