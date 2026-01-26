// cloudfunctions/initDatabase/index.js
// 初始化数据库云函数 - 一键创建测试数据
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 测试艺人数据
const artistsData = [
  {
    _id: "artist_001",
    name: "周杰伦",
    alias: ["Jay", "杰伦", "周董"],
    avatar: "",
    followerCount: 0,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    _id: "artist_002",
    name: "林俊杰",
    alias: ["JJ", "JJ Lin"],
    avatar: "",
    followerCount: 0,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    _id: "artist_003",
    name: "陈奕迅",
    alias: ["Eason", "医生", "E神"],
    avatar: "",
    followerCount: 0,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    _id: "artist_004",
    name: "薛之谦",
    alias: ["老薛"],
    avatar: "",
    followerCount: 0,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    _id: "artist_005",
    name: "五月天",
    alias: ["Mayday"],
    avatar: "",
    followerCount: 0,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    _id: "artist_006",
    name: "张学友",
    alias: ["歌神", "学友"],
    avatar: "",
    followerCount: 0,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    _id: "artist_007",
    name: "邓紫棋",
    alias: ["GEM", "紫棋"],
    avatar: "",
    followerCount: 0,
    createTime: new Date(),
    updateTime: new Date()
  }
];

// 测试演唱会数据
const concertsData = [
  {
    title: "周杰伦嘉年华世界巡回演唱会-上海站",
    artist: "周杰伦",
    artistId: "artist_001",
    city: "上海",
    venue: "上海体育场",
    province: "上海市",
    dates: ["2026-03-15", "2026-03-16"],
    stage: "二开",
    stageHistory: [
      {stage: "网传", time: "2026-01-01T00:00:00.000Z"},
      {stage: "上架", time: "2026-01-10T00:00:00.000Z"},
      {stage: "一开", time: "2026-01-15T00:00:00.000Z"},
      {stage: "二开", time: "2026-01-20T00:00:00.000Z"}
    ],
    platforms: {
      damai: {available: true, url: "https://damai.cn/xxx", openTime: "2026-01-26 10:00"},
      maoyan: {available: true, url: "https://maoyan.com/xxx", openTime: ""},
      douyin: {available: false, url: "", openTime: ""},
      xiecheng: {available: true, url: "https://piao.ctrip.com/xxx", openTime: ""},
      piaoxingqiu: {available: false, url: "", openTime: ""}
    },
    priceRange: "380-1880",
    poster: "",
    status: "published",
    source: "manual",
    verified: true,
    subscribeCount: 128,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    title: "林俊杰JJ20世界巡回演唱会-北京站",
    artist: "林俊杰",
    artistId: "artist_002",
    city: "北京",
    venue: "国家体育场（鸟巢）",
    province: "北京市",
    dates: ["2026-04-20", "2026-04-21"],
    stage: "一开",
    stageHistory: [
      {stage: "上架", time: "2026-01-05T00:00:00.000Z"},
      {stage: "一开", time: "2026-01-18T00:00:00.000Z"}
    ],
    platforms: {
      damai: {available: true, url: "https://damai.cn/xxx", openTime: "2026-01-26 14:00"},
      maoyan: {available: true, url: "https://maoyan.com/xxx", openTime: ""},
      douyin: {available: true, url: "https://douyin.com/xxx", openTime: ""},
      xiecheng: {available: false, url: "", openTime: ""},
      piaoxingqiu: {available: true, url: "https://piaoxingqiu.com/xxx", openTime: ""}
    },
    priceRange: "480-2080",
    poster: "",
    status: "published",
    source: "manual",
    verified: true,
    subscribeCount: 256,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    title: "陈奕迅FEAR AND DREAMS世界巡回演唱会-广州站",
    artist: "陈奕迅",
    artistId: "artist_003",
    city: "广州",
    venue: "广州天河体育中心",
    province: "广东省",
    dates: ["2026-05-01", "2026-05-02", "2026-05-03"],
    stage: "上架",
    stageHistory: [
      {stage: "网传", time: "2026-01-10T00:00:00.000Z"},
      {stage: "上架", time: "2026-01-22T00:00:00.000Z"}
    ],
    platforms: {
      damai: {available: false, url: "", openTime: ""},
      maoyan: {available: false, url: "", openTime: ""},
      douyin: {available: false, url: "", openTime: ""},
      xiecheng: {available: false, url: "", openTime: ""},
      piaoxingqiu: {available: false, url: "", openTime: ""}
    },
    priceRange: "待定",
    poster: "",
    status: "published",
    source: "manual",
    verified: true,
    subscribeCount: 89,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    title: "薛之谦天外来物巡回演唱会-成都站",
    artist: "薛之谦",
    artistId: "artist_004",
    city: "成都",
    venue: "成都露天音乐公园",
    province: "四川省",
    dates: ["2026-02-14", "2026-02-15"],
    stage: "三开",
    stageHistory: [
      {stage: "上架", time: "2025-12-01T00:00:00.000Z"},
      {stage: "一开", time: "2025-12-15T00:00:00.000Z"},
      {stage: "二开", time: "2026-01-05T00:00:00.000Z"},
      {stage: "三开", time: "2026-01-20T00:00:00.000Z"}
    ],
    platforms: {
      damai: {available: true, url: "https://damai.cn/xxx", openTime: ""},
      maoyan: {available: true, url: "https://maoyan.com/xxx", openTime: ""},
      douyin: {available: true, url: "https://douyin.com/xxx", openTime: ""},
      xiecheng: {available: true, url: "https://piao.ctrip.com/xxx", openTime: ""},
      piaoxingqiu: {available: true, url: "https://piaoxingqiu.com/xxx", openTime: ""}
    },
    priceRange: "299-1299",
    poster: "",
    status: "published",
    source: "manual",
    verified: true,
    subscribeCount: 312,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    title: "五月天诺亚方舟10周年演唱会-深圳站",
    artist: "五月天",
    artistId: "artist_005",
    city: "深圳",
    venue: "深圳湾体育中心",
    province: "广东省",
    dates: ["2026-06-06", "2026-06-07", "2026-06-08"],
    stage: "网传",
    stageHistory: [
      {stage: "网传", time: "2026-01-20T00:00:00.000Z"}
    ],
    platforms: {
      damai: {available: false, url: "", openTime: ""},
      maoyan: {available: false, url: "", openTime: ""},
      douyin: {available: false, url: "", openTime: ""},
      xiecheng: {available: false, url: "", openTime: ""},
      piaoxingqiu: {available: false, url: "", openTime: ""}
    },
    priceRange: "",
    poster: "",
    status: "published",
    source: "manual",
    verified: false,
    subscribeCount: 45,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    title: "周杰伦嘉年华世界巡回演唱会-杭州站",
    artist: "周杰伦",
    artistId: "artist_001",
    city: "杭州",
    venue: "杭州奥体中心体育场",
    province: "浙江省",
    dates: ["2026-04-05", "2026-04-06"],
    stage: "一开",
    stageHistory: [
      {stage: "网传", time: "2026-01-08T00:00:00.000Z"},
      {stage: "上架", time: "2026-01-18T00:00:00.000Z"},
      {stage: "一开", time: "2026-01-23T00:00:00.000Z"}
    ],
    platforms: {
      damai: {available: true, url: "https://damai.cn/xxx", openTime: "2026-01-26 12:00"},
      maoyan: {available: false, url: "", openTime: ""},
      douyin: {available: false, url: "", openTime: ""},
      xiecheng: {available: false, url: "", openTime: ""},
      piaoxingqiu: {available: false, url: "", openTime: ""}
    },
    priceRange: "380-1880",
    poster: "",
    status: "published",
    source: "manual",
    verified: true,
    subscribeCount: 198,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    title: "张学友60+巡回演唱会-南京站",
    artist: "张学友",
    artistId: "artist_006",
    city: "南京",
    venue: "南京奥体中心体育场",
    province: "江苏省",
    dates: ["2026-03-28", "2026-03-29"],
    stage: "一开",
    stageHistory: [
      {stage: "上架", time: "2026-01-12T00:00:00.000Z"},
      {stage: "一开", time: "2026-01-20T00:00:00.000Z"}
    ],
    platforms: {
      damai: {available: true, url: "https://damai.cn/xxx", openTime: ""},
      maoyan: {available: true, url: "https://maoyan.com/xxx", openTime: ""},
      douyin: {available: false, url: "", openTime: ""},
      xiecheng: {available: true, url: "https://piao.ctrip.com/xxx", openTime: ""},
      piaoxingqiu: {available: false, url: "", openTime: ""}
    },
    priceRange: "580-2280",
    poster: "",
    status: "published",
    source: "manual",
    verified: true,
    subscribeCount: 167,
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    title: "邓紫棋启示录世界巡回演唱会-武汉站",
    artist: "邓紫棋",
    artistId: "artist_007",
    city: "武汉",
    venue: "武汉体育中心",
    province: "湖北省",
    dates: ["2026-04-12"],
    stage: "上架",
    stageHistory: [
      {stage: "上架", time: "2026-01-22T00:00:00.000Z"}
    ],
    platforms: {
      damai: {available: false, url: "", openTime: "2026-01-28 10:00"},
      maoyan: {available: false, url: "", openTime: ""},
      douyin: {available: false, url: "", openTime: ""},
      xiecheng: {available: false, url: "", openTime: ""},
      piaoxingqiu: {available: false, url: "", openTime: ""}
    },
    priceRange: "388-1588",
    poster: "",
    status: "published",
    source: "manual",
    verified: true,
    subscribeCount: 76,
    createTime: new Date(),
    updateTime: new Date()
  }
];

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action = 'all' } = event; // all, artists, concerts, admin

  const results = {
    artists: { success: 0, failed: 0 },
    concerts: { success: 0, failed: 0 },
    admin: { success: false }
  };

  try {
    // 初始化艺人数据
    if (action === 'all' || action === 'artists') {
      for (const artist of artistsData) {
        try {
          // 检查是否已存在
          const existing = await db.collection('artists').doc(artist._id).get().catch(() => null);
          if (!existing || !existing.data) {
            await db.collection('artists').add({ data: artist });
            results.artists.success++;
          }
        } catch (err) {
          results.artists.failed++;
        }
      }
    }

    // 初始化演唱会数据
    if (action === 'all' || action === 'concerts') {
      for (const concert of concertsData) {
        try {
          // 检查是否已存在（根据标题和城市）
          const existing = await db.collection('concerts')
            .where({ title: concert.title, city: concert.city })
            .get();

          if (existing.data.length === 0) {
            await db.collection('concerts').add({ data: concert });
            results.concerts.success++;
          }
        } catch (err) {
          results.concerts.failed++;
        }
      }
    }

    // 将当前用户添加为管理员
    if (action === 'all' || action === 'admin') {
      try {
        const adminExists = await db.collection('admins')
          .where({ openid: OPENID })
          .get();

        if (adminExists.data.length === 0) {
          await db.collection('admins').add({
            data: {
              openid: OPENID,
              role: 'admin',
              createTime: new Date()
            }
          });
          results.admin.success = true;
        } else {
          results.admin.success = true; // 已存在
        }
      } catch (err) {
        console.error('Add admin error:', err);
      }
    }

    return {
      code: 0,
      message: '初始化完成',
      data: results
    };
  } catch (err) {
    console.error('initDatabase error:', err);
    return {
      code: -1,
      message: err.message || '初始化失败',
      data: results
    };
  }
};
