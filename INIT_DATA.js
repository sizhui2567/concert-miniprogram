// 初始化测试数据脚本
// 在云开发控制台的数据库中，手动添加以下数据进行测试

// ============ artists 艺人表 ============
// 在 artists 集合中添加以下文档：

const artists = [
  {
    "_id": "artist_001",
    "name": "周杰伦",
    "alias": ["Jay", "杰伦", "周董"],
    "avatar": "",
    "followerCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  },
  {
    "_id": "artist_002",
    "name": "林俊杰",
    "alias": ["JJ", "JJ Lin"],
    "avatar": "",
    "followerCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  },
  {
    "_id": "artist_003",
    "name": "陈奕迅",
    "alias": ["Eason", "医生", "E神"],
    "avatar": "",
    "followerCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  },
  {
    "_id": "artist_004",
    "name": "薛之谦",
    "alias": ["老薛"],
    "avatar": "",
    "followerCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  },
  {
    "_id": "artist_005",
    "name": "五月天",
    "alias": ["Mayday"],
    "avatar": "",
    "followerCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  }
];

// ============ concerts 演唱会表 ============
// 在 concerts 集合中添加以下文档：

const concerts = [
  {
    "title": "周杰伦嘉年华世界巡回演唱会-上海站",
    "artist": "周杰伦",
    "artistId": "artist_001",
    "city": "上海",
    "venue": "上海体育场",
    "province": "上海市",
    "dates": ["2026-03-15", "2026-03-16"],
    "stage": "二开",
    "stageHistory": [
      {"stage": "网传", "time": "2026-01-01T00:00:00.000Z"},
      {"stage": "上架", "time": "2026-01-10T00:00:00.000Z"},
      {"stage": "一开", "time": "2026-01-15T00:00:00.000Z"},
      {"stage": "二开", "time": "2026-01-20T00:00:00.000Z"}
    ],
    "platforms": {
      "damai": {"available": true, "url": "https://damai.cn/xxx", "openTime": "2026-01-26 10:00"},
      "maoyan": {"available": true, "url": "https://maoyan.com/xxx", "openTime": ""},
      "douyin": {"available": false, "url": "", "openTime": ""},
      "xiecheng": {"available": true, "url": "https://piao.ctrip.com/xxx", "openTime": ""},
      "piaoxingqiu": {"available": false, "url": "", "openTime": ""}
    },
    "priceRange": "380-1880",
    "poster": "",
    "status": "published",
    "source": "manual",
    "verified": true,
    "subscribeCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  },
  {
    "title": "林俊杰JJ20世界巡回演唱会-北京站",
    "artist": "林俊杰",
    "artistId": "artist_002",
    "city": "北京",
    "venue": "国家体育场（鸟巢）",
    "province": "北京市",
    "dates": ["2026-04-20", "2026-04-21"],
    "stage": "一开",
    "stageHistory": [
      {"stage": "上架", "time": "2026-01-05T00:00:00.000Z"},
      {"stage": "一开", "time": "2026-01-18T00:00:00.000Z"}
    ],
    "platforms": {
      "damai": {"available": true, "url": "https://damai.cn/xxx", "openTime": "2026-01-26 14:00"},
      "maoyan": {"available": true, "url": "https://maoyan.com/xxx", "openTime": ""},
      "douyin": {"available": true, "url": "https://douyin.com/xxx", "openTime": ""},
      "xiecheng": {"available": false, "url": "", "openTime": ""},
      "piaoxingqiu": {"available": true, "url": "https://piaoxingqiu.com/xxx", "openTime": ""}
    },
    "priceRange": "480-2080",
    "poster": "",
    "status": "published",
    "source": "manual",
    "verified": true,
    "subscribeCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  },
  {
    "title": "陈奕迅FEAR AND DREAMS世界巡回演唱会-广州站",
    "artist": "陈奕迅",
    "artistId": "artist_003",
    "city": "广州",
    "venue": "广州天河体育中心",
    "province": "广东省",
    "dates": ["2026-05-01", "2026-05-02", "2026-05-03"],
    "stage": "上架",
    "stageHistory": [
      {"stage": "网传", "time": "2026-01-10T00:00:00.000Z"},
      {"stage": "上架", "time": "2026-01-22T00:00:00.000Z"}
    ],
    "platforms": {
      "damai": {"available": false, "url": "", "openTime": ""},
      "maoyan": {"available": false, "url": "", "openTime": ""},
      "douyin": {"available": false, "url": "", "openTime": ""},
      "xiecheng": {"available": false, "url": "", "openTime": ""},
      "piaoxingqiu": {"available": false, "url": "", "openTime": ""}
    },
    "priceRange": "待定",
    "poster": "",
    "status": "published",
    "source": "manual",
    "verified": true,
    "subscribeCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  },
  {
    "title": "薛之谦天外来物巡回演唱会-成都站",
    "artist": "薛之谦",
    "artistId": "artist_004",
    "city": "成都",
    "venue": "成都露天音乐公园",
    "province": "四川省",
    "dates": ["2026-02-14", "2026-02-15"],
    "stage": "三开",
    "stageHistory": [
      {"stage": "上架", "time": "2025-12-01T00:00:00.000Z"},
      {"stage": "一开", "time": "2025-12-15T00:00:00.000Z"},
      {"stage": "二开", "time": "2026-01-05T00:00:00.000Z"},
      {"stage": "三开", "time": "2026-01-20T00:00:00.000Z"}
    ],
    "platforms": {
      "damai": {"available": true, "url": "https://damai.cn/xxx", "openTime": ""},
      "maoyan": {"available": true, "url": "https://maoyan.com/xxx", "openTime": ""},
      "douyin": {"available": true, "url": "https://douyin.com/xxx", "openTime": ""},
      "xiecheng": {"available": true, "url": "https://piao.ctrip.com/xxx", "openTime": ""},
      "piaoxingqiu": {"available": true, "url": "https://piaoxingqiu.com/xxx", "openTime": ""}
    },
    "priceRange": "299-1299",
    "poster": "",
    "status": "published",
    "source": "manual",
    "verified": true,
    "subscribeCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  },
  {
    "title": "五月天诺亚方舟10周年演唱会-深圳站",
    "artist": "五月天",
    "artistId": "artist_005",
    "city": "深圳",
    "venue": "深圳湾体育中心",
    "province": "广东省",
    "dates": ["2026-06-06", "2026-06-07", "2026-06-08"],
    "stage": "网传",
    "stageHistory": [
      {"stage": "网传", "time": "2026-01-20T00:00:00.000Z"}
    ],
    "platforms": {
      "damai": {"available": false, "url": "", "openTime": ""},
      "maoyan": {"available": false, "url": "", "openTime": ""},
      "douyin": {"available": false, "url": "", "openTime": ""},
      "xiecheng": {"available": false, "url": "", "openTime": ""},
      "piaoxingqiu": {"available": false, "url": "", "openTime": ""}
    },
    "priceRange": "",
    "poster": "",
    "status": "published",
    "source": "manual",
    "verified": false,
    "subscribeCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  },
  {
    "title": "周杰伦嘉年华世界巡回演唱会-杭州站",
    "artist": "周杰伦",
    "artistId": "artist_001",
    "city": "杭州",
    "venue": "杭州奥体中心体育场",
    "province": "浙江省",
    "dates": ["2026-04-05", "2026-04-06"],
    "stage": "一开",
    "stageHistory": [
      {"stage": "网传", "time": "2026-01-08T00:00:00.000Z"},
      {"stage": "上架", "time": "2026-01-18T00:00:00.000Z"},
      {"stage": "一开", "time": "2026-01-23T00:00:00.000Z"}
    ],
    "platforms": {
      "damai": {"available": true, "url": "https://damai.cn/xxx", "openTime": "2026-01-26 12:00"},
      "maoyan": {"available": false, "url": "", "openTime": ""},
      "douyin": {"available": false, "url": "", "openTime": ""},
      "xiecheng": {"available": false, "url": "", "openTime": ""},
      "piaoxingqiu": {"available": false, "url": "", "openTime": ""}
    },
    "priceRange": "380-1880",
    "poster": "",
    "status": "published",
    "source": "manual",
    "verified": true,
    "subscribeCount": 0,
    "createTime": new Date(),
    "updateTime": new Date()
  }
];

// ============ admins 管理员表 ============
// 首次使用时，需要手动添加管理员
// 登录小程序后，在云开发控制台查看用户的openid，然后添加：

const admins = [
  {
    "openid": "你的openid", // 替换为实际的openid
    "role": "admin",
    "createTime": new Date()
  }
];

// ============ 操作步骤 ============
/*
1. 打开微信开发者工具
2. 点击「云开发」按钮，进入云开发控制台
3. 选择「数据库」标签
4. 点击「+」创建以下集合：
   - concerts
   - artists
   - users
   - admins
   - notifications

5. 点击每个集合，然后点击「添加记录」
6. 选择「JSON」模式，粘贴上面对应的数据

7. 设置数据库权限：
   - concerts: 所有用户可读
   - artists: 所有用户可读
   - users: 仅创建者可读写
   - admins: 仅管理员可读写
   - notifications: 仅创建者可读写

8. 创建索引（可选，提高查询性能）：
   - concerts: city, stage, artistId, updateTime
   - artists: name, followerCount
   - users: subscriptions, followArtists
   - admins: openid
*/
