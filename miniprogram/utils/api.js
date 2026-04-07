// utils/api.js - 云函数调用封装

/**
 * 调用云函数（带超时处理）
 * @param {string} name 云函数名称
 * @param {Object} data 参数
 * @param {number} timeout 超时时间（毫秒），默认 10000
 */
const callFunction = (name, data = {}, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    if (!wx.cloud || !wx.cloud.callFunction) {
      reject(new Error('云开发未初始化'));
      return;
    }

    let isResolved = false;

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

const getConcerts = (params = {}) => callFunction('getConcerts', params);

const getConcertDetail = (concertId) => callFunction('getConcertDetail', { concertId });

const subscribeConcert = (concertId, subscribe = true) =>
  callFunction('subscribe', { concertId, subscribe });

const updateNotificationPrefs = (prefs = {}) =>
  callFunction('updateNotificationPrefs', { prefs });

const getTomorrowConcerts = () => callFunction('getTomorrowConcerts');

const getSubscriptions = (page = 1, pageSize = 10) =>
  callFunction('getSubscriptions', { page, pageSize });

const followArtist = (artistId, follow = true) =>
  callFunction('followArtist', { artistId, follow });

const getArtists = (params = {}) => callFunction('getArtists', params);

const getFollowingArtists = () => callFunction('getFollowingArtists');

// 管理员 API
const adminLogin = (password) => callFunction('adminLogin', { password });

const saveConcert = (concertData, isDraft = false) =>
  callFunction('saveConcert', { concertData, isDraft });

const deleteConcert = (concertId) => callFunction('deleteConcert', { concertId });

const saveArtist = (artistData) => callFunction('saveArtist', { artistData });

const deleteArtist = (artistId) => callFunction('deleteArtist', { artistId });

const uploadImage = (filePath, cloudPath) => {
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => resolve(res.fileID),
      fail: (err) => reject(err)
    });
  });
};

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
      fail: (err) => reject(err)
    });
  });
};

const initDatabase = (action = 'all') => callFunction('initDatabase', { action });

const importConcerts = (concerts, options = {}) =>
  callFunction('importConcerts', { concerts, options });

const getSeatViews = (concertId, params = {}) =>
  callFunction('getSeatViews', { concertId, ...params });

const saveSeatView = (payload = {}) =>
  callFunction('saveSeatView', payload);

const getBuddyPosts = (concertId, params = {}) =>
  callFunction('getBuddyPosts', { concertId, ...params });

const saveBuddyPost = (payload = {}) =>
  callFunction('saveBuddyPost', payload);

const getAnnouncementMessages = (concertId, params = {}) =>
  callFunction('getAnnouncementMessages', { concertId, ...params });

const saveAnnouncementMessage = (payload = {}) =>
  callFunction('saveAnnouncementMessage', payload);

const reportContent = (payload = {}) =>
  callFunction('reportContent', payload);

const blockUser = (targetOpenid, action = 'block') =>
  callFunction('blockUser', { targetOpenid, action });

const moderateContent = (payload = {}) =>
  callFunction('moderateContent', payload);

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
  importConcerts,
  getSeatViews,
  saveSeatView,
  getBuddyPosts,
  saveBuddyPost,
  getAnnouncementMessages,
  saveAnnouncementMessage,
  reportContent,
  blockUser,
  moderateContent
};
