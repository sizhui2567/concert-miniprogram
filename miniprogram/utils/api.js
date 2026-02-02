// api.js - 云函数调用封装

/**
 * 调用云函数（带超时处理）
 * @param {string} name 云函数名称
 * @param {Object} data 参数
 * @param {number} timeout 超时时间(毫秒)，默认10秒
 * @returns {Promise}
 */
const callFunction = (name, data = {}, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.callFunction) {
      reject(new Error('云开发未初始化'));
      return;
    }

    let isResolved = false;

    // 超时处理
    const timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.error(`云函数 ${name} 调用超时`);
        reject(new Error(`云函数 ${name} 调用超时，请检查云函数是否已部署`));
      }
    }, timeout);

    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutId);

        if (res.result && res.result.code === 0) {
          resolve(res.result.data);
        } else if (res.result) {
          reject(new Error(res.result.message || '请求失败'));
        } else {
          resolve(res.result);
        }
      },
      fail: (err) => {
        if (isResolved) return;
        isResolved = true;
        clearTimeout(timeoutId);

        console.error(`云函数 ${name} 调用失败:`, err);
        reject(err);
      }
    });
  });
};

/**
 * 获取演唱会列表
 * @param {Object} params 查询参数
 * @param {string} params.keyword 搜索关键词（艺人/城市）
 * @param {string} params.city 城市筛选
 * @param {string} params.stage 阶段筛选
 * @param {number} params.page 页码
 * @param {number} params.pageSize 每页数量
 * @returns {Promise}
 */
const getConcerts = (params = {}) => {
  return callFunction('getConcerts', params);
};

/**
 * 获取演唱会详情
 * @param {string} concertId 演唱会ID
 * @returns {Promise}
 */
const getConcertDetail = (concertId) => {
  return callFunction('getConcertDetail', { concertId });
};

/**
 * 订阅/取消订阅演唱会
 * @param {string} concertId 演唱会ID
 * @param {boolean} subscribe 是否订阅
 * @returns {Promise}
 */
const subscribeConcert = (concertId, subscribe = true) => {
  return callFunction('subscribe', { concertId, subscribe });
};

/**
 * 更新订阅通知偏好
 * @param {Object} prefs 通知偏好
 * @returns {Promise}
 */
const updateNotificationPrefs = (prefs = {}) => {
  return callFunction('updateNotificationPrefs', { prefs });
};

/**
 * 获取明日开售的演唱会
 * @returns {Promise}
 */
const getTomorrowConcerts = () => {
  return callFunction('getTomorrowConcerts');
};

/**
 * 获取用户订阅的演唱会列表
 * @param {number} page 页码
 * @param {number} pageSize 每页数量
 * @returns {Promise}
 */
const getSubscriptions = (page = 1, pageSize = 10) => {
  return callFunction('getSubscriptions', { page, pageSize });
};

/**
 * 关注/取消关注艺人
 * @param {string} artistId 艺人ID
 * @param {boolean} follow 是否关注
 * @returns {Promise}
 */
const followArtist = (artistId, follow = true) => {
  return callFunction('followArtist', { artistId, follow });
};

/**
 * 获取艺人列表
 * @param {Object} params 查询参数
 * @returns {Promise}
 */
const getArtists = (params = {}) => {
  return callFunction('getArtists', params);
};

/**
 * 获取关注的艺人列表
 * @returns {Promise}
 */
const getFollowingArtists = () => {
  return callFunction('getFollowingArtists');
};

// ============ 管理员相关 API ============

/**
 * 管理员登录验证
 * @param {string} password 管理员密码
 * @returns {Promise}
 */
const adminLogin = (password) => {
  return callFunction('adminLogin', { password });
};

/**
 * 保存演唱会（新增/更新）
 * @param {Object} concertData 演唱会数据
 * @param {boolean} isDraft 是否保存为草稿
 * @returns {Promise}
 */
const saveConcert = (concertData, isDraft = false) => {
  return callFunction('saveConcert', { concertData, isDraft });
};

/**
 * 删除演唱会
 * @param {string} concertId 演唱会ID
 * @returns {Promise}
 */
const deleteConcert = (concertId) => {
  return callFunction('deleteConcert', { concertId });
};

/**
 * 保存艺人信息
 * @param {Object} artistData 艺人数据
 * @returns {Promise}
 */
const saveArtist = (artistData) => {
  return callFunction('saveArtist', { artistData });
};

/**
 * 删除艺人
 * @param {string} artistId 艺人ID
 * @returns {Promise}
 */
const deleteArtist = (artistId) => {
  return callFunction('deleteArtist', { artistId });
};

/**
 * 上传图片到云存储
 * @param {string} filePath 本地文件路径
 * @param {string} cloudPath 云存储路径
 * @returns {Promise}
 */
const uploadImage = (filePath, cloudPath) => {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => {
        resolve(res.fileID);
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 选择并上传图片
 * @param {string} type 图片类型 (poster/avatar)
 * @returns {Promise}
 */
const chooseAndUploadImage = (type = 'poster') => {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const filePath = res.tempFilePaths[0];
        const ext = filePath.split('.').pop();
        const cloudPath = `${type}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;

        try {
          const fileID = await uploadImage(filePath, cloudPath);
          resolve(fileID);
        } catch (err) {
          reject(err);
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

/**
 * 初始化数据库（测试数据）
 * @param {string} action 操作类型：all/artists/concerts/admin
 * @returns {Promise}
 */
const initDatabase = (action = 'all') => {
  return callFunction('initDatabase', { action });
};

/**
 * 批量导入演唱会数据
 * @param {Array} concerts 演唱会数据数组
 * @param {Object} options 导入选项
 * @param {boolean} options.updateExisting 是否更新已存在的数据
 * @param {string} options.source 数据来源标识
 * @returns {Promise}
 */
const importConcerts = (concerts, options = {}) => {
  return callFunction('importConcerts', { concerts, options });
};

module.exports = {
  callFunction,
  getConcerts,
  getConcertDetail,
  subscribeConcert,
  updateNotificationPrefs,
  getTomorrowConcerts,
  getSubscriptions,
  followArtist,
  getArtists,
  getFollowingArtists,
  adminLogin,
  saveConcert,
  deleteConcert,
  saveArtist,
  deleteArtist,
  uploadImage,
  chooseAndUploadImage,
  initDatabase,
  importConcerts
};
