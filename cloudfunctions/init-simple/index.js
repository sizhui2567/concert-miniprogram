/**
 * 数据初始化云函数 - 根据数据库字段规范设计
 * 分步骤执行，确保在3秒内完成
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 获取当前时间
const now = () => db.serverDate();

// 生成 platforms 默认结构
const defaultPlatforms = () => ({
  damai: { available: false, url: '', openTime: '' },
  maoyan: { available: false, url: '', openTime: '' },
  douyin: { available: false, url: '', openTime: '' },
  xiecheng: { available: false, url: '', openTime: '' },
  piaoxingqiu: { available: false, url: '', openTime: '' }
});

exports.main = async (event, context) => {
  const { step = 1 } = event;
  
  console.log(`开始执行步骤 ${step}`);
  
  try {
    switch(step) {
      case 1:
        return await initArtists();
      case 2:
        return await initConcerts();
      case 3:
        return await initAdmin();
      case 4:
        return await initSampleUser();
      default:
        return { success: false, message: '无效的步骤，请使用 1-4' };
    }
  } catch (error) {
    console.error(`步骤 ${step} 失败:`, error);
    return {
      success: false,
      message: error.message,
      step: step
    };
  }
};

/**
 * 步骤1：初始化艺人数据
 */
async function initArtists() {
  const artists = [
    {
      _id: 'jay',
      name: '周杰伦',
      alias: ['Jay', '周董', '杰伦'],
      avatar: 'https://picsum.photos/200/200?random=1',
      followerCount: 1250000,
      createTime: now(),
      updateTime: now()
    },
    {
      _id: 'mayday',
      name: '五月天',
      alias: ['Mayday', '阿信', '怪兽'],
      avatar: 'https://picsum.photos/200/200?random=2',
      followerCount: 980000,
      createTime: now(),
      updateTime: now()
    },
    {
      _id: 'jj',
      name: '林俊杰',
      alias: ['JJ', '行走的CD'],
      avatar: 'https://picsum.photos/200/200?random=3',
      followerCount: 860000,
      createTime: now(),
      updateTime: now()
    },
    {
      _id: 'taylor',
      name: 'Taylor Swift',
      alias: ['霉霉', 'TS'],
      avatar: 'https://picsum.photos/200/200?random=4',
      followerCount: 2100000,
      createTime: now(),
      updateTime: now()
    },
    {
      _id: 'jacky',
      name: '张学友',
      alias: ['歌神', '学友'],
      avatar: 'https://picsum.photos/200/200?random=5',
      followerCount: 780000,
      createTime: now(),
      updateTime: now()
    }
  ];

  let count = 0;
  for (const artist of artists) {
    try {
      await db.collection('artists').doc(artist._id).set({ data: artist });
      count++;
    } catch (e) {
      // 如果已存在则跳过
      console.log(`艺人 ${artist.name} 已存在或创建失败:`, e.message);
    }
  }

  return {
    success: true,
    message: `已创建/更新 ${count} 个艺人`,
    data: { artists: count },
    nextStep: 2
  };
}

/**
 * 步骤2：初始化演唱会数据（精简版，避免超时）
 */
async function initConcerts() {
  const concerts = [
    {
      title: '周杰伦「嘉年华」世界巡回演唱会 - 上海站',
      artist: '周杰伦',
      artistId: 'jay',
      city: '上海',
      venue: '上海体育场',
      province: '上海',
      dates: ['2026-04-15', '2026-04-16'],
      stage: '网传',
      stageHistory: [
        { stage: '网传', time: new Date('2026-01-01') }
      ],
      platforms: defaultPlatforms(),
      priceRange: '580-2580',
      poster: 'https://picsum.photos/400/600?random=1',
      status: 'published',
      source: 'manual',
      verified: true,
      subscribeCount: 5680,
      createTime: now(),
      updateTime: now()
    },
    {
      title: '五月天「好好好想见到你」演唱会 - 北京站',
      artist: '五月天',
      artistId: 'mayday',
      city: '北京',
      venue: '国家体育场（鸟巢）',
      province: '北京',
      dates: ['2026-05-01', '2026-05-02', '2026-05-03'],
      stage: '上架',
      stageHistory: [
        { stage: '网传', time: new Date('2026-01-15') },
        { stage: '上架', time: new Date('2026-02-01') }
      ],
      platforms: {
        ...defaultPlatforms(),
        damai: { available: true, url: 'https://www.damai.cn', openTime: '2026-02-15 10:00' }
      },
      priceRange: '355-1855',
      poster: 'https://picsum.photos/400/600?random=2',
      status: 'published',
      source: 'manual',
      verified: true,
      subscribeCount: 8932,
      createTime: now(),
      updateTime: now()
    },
    {
      title: '林俊杰「JJ20」世界巡回演唱会 - 广州站',
      artist: '林俊杰',
      artistId: 'jj',
      city: '广州',
      venue: '宝能观致文化中心',
      province: '广东',
      dates: ['2026-03-20'],
      stage: '一开',
      stageHistory: [
        { stage: '网传', time: new Date('2026-01-10') },
        { stage: '上架', time: new Date('2026-01-20') },
        { stage: '一开', time: new Date('2026-02-01') }
      ],
      platforms: {
        ...defaultPlatforms(),
        damai: { available: true, url: 'https://www.damai.cn', openTime: '2026-02-01 14:00' },
        maoyan: { available: true, url: 'https://www.maoyan.com', openTime: '2026-02-01 14:00' }
      },
      priceRange: '380-1680',
      poster: 'https://picsum.photos/400/600?random=3',
      status: 'published',
      source: 'manual',
      verified: true,
      subscribeCount: 4521,
      createTime: now(),
      updateTime: now()
    }
  ];

  let count = 0;
  for (const concert of concerts) {
    try {
      await db.collection('concerts').add({ data: concert });
      count++;
    } catch (e) {
      console.log(`演唱会创建失败:`, e.message);
    }
  }

  return {
    success: true,
    message: `已创建 ${count} 场演唱会`,
    data: { concerts: count },
    nextStep: 3
  };
}

/**
 * 步骤3：初始化管理员
 */
async function initAdmin() {
  // 注意：这里只是创建一个示例管理员记录
  // 实际使用时需要替换为真实的openid
  const { OPENID } = cloud.getWXContext();
  
  if (!OPENID) {
    return {
      success: true,
      message: '跳过管理员创建（无openid）',
      data: { admin: null },
      nextStep: 4
    };
  }

  try {
    // 检查是否已存在
    const { data: existing } = await db.collection('admins')
      .where({ openid: OPENID })
      .limit(1)
      .get();

    if (existing.length > 0) {
      return {
        success: true,
        message: '管理员已存在',
        data: { admin: existing[0]._id },
        nextStep: 4
      };
    }

    // 创建管理员
    const { _id } = await db.collection('admins').add({
      data: {
        openid: OPENID,
        role: 'admin',
        createTime: now()
      }
    });

    return {
      success: true,
      message: '已创建管理员',
      data: { admin: _id },
      nextStep: 4
    };
  } catch (e) {
    return {
      success: true,
      message: '管理员创建跳过: ' + e.message,
      data: { admin: null },
      nextStep: 4
    };
  }
}

/**
 * 步骤4：初始化示例用户数据
 */
async function initSampleUser() {
  const { OPENID } = cloud.getWXContext();
  
  if (!OPENID) {
    return {
      success: true,
      message: '跳过用户创建（无openid）',
      data: { user: null },
      allDone: true
    };
  }

  try {
    // 检查用户是否已存在
    const { data: existing } = await db.collection('users')
      .doc(OPENID)
      .get();

    if (existing) {
      return {
        success: true,
        message: '用户已存在',
        data: { user: OPENID },
        allDone: true
      };
    }
  } catch (e) {
    // 用户不存在，继续创建
  }

  try {
    await db.collection('users').doc(OPENID).set({
      data: {
        _id: OPENID,
        unionId: '',
        nickname: '测试用户',
        avatarUrl: 'https://picsum.photos/100/100?random=99',
        subscriptions: [],
        followArtists: ['jay', 'mayday'],
        notificationPrefs: {
          onListed: true,
          oneDayBefore: true,
          customHoursEnabled: false,
          customHours: 1
        },
        createTime: now()
      }
    });

    return {
      success: true,
      message: '已创建示例用户',
      data: { user: OPENID },
      allDone: true
    };
  } catch (e) {
    return {
      success: true,
      message: '用户创建跳过: ' + e.message,
      data: { user: null },
      allDone: true
    };
  }
}
