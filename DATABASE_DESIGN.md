# 云数据库集合设计文档

## 1. concerts（演唱会表）

### 字段说明
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| _id | string | 是 | 自动生成的文档ID |
| title | string | 是 | 演唱会名称，如"周杰伦嘉年华世界巡回演唱会-上海站" |
| artist | string | 是 | 艺人名称 |
| artistId | string | 是 | 关联艺人表的ID |
| city | string | 是 | 城市，如"上海" |
| venue | string | 是 | 场馆，如"上海体育场" |
| province | string | 否 | 省份 |
| dates | array | 是 | 演出日期数组，如["2026-03-15", "2026-03-16"] |
| stage | string | 是 | 当前阶段：网传/上架/一开/二开/三开/已结束 |
| stageHistory | array | 否 | 阶段变更历史 |
| platforms | object | 是 | 各平台售票信息 |
| priceRange | string | 否 | 价格区间，如"380-1880" |
| poster | string | 否 | 海报图片云存储URL |
| status | string | 是 | 发布状态：draft/published |
| source | string | 是 | 数据来源：manual/crawler/user |
| verified | boolean | 是 | 是否已审核 |
| subscribeCount | number | 是 | 订阅人数，默认0 |
| lastEditor | string | 否 | 最后编辑人openid |
| createTime | date | 是 | 创建时间 |
| updateTime | date | 是 | 更新时间 |

### platforms 字段结构
```json
{
  "damai": {
    "available": true,
    "url": "https://...",
    "openTime": "2026-01-15 10:00"
  },
  "maoyan": {
    "available": true,
    "url": "https://...",
    "openTime": ""
  },
  "douyin": {
    "available": false,
    "url": "",
    "openTime": ""
  },
  "xiecheng": {
    "available": false,
    "url": "",
    "openTime": ""
  },
  "piaoxingqiu": {
    "available": false,
    "url": "",
    "openTime": ""
  }
}
```

### stageHistory 字段结构
```json
[
  {"stage": "网传", "time": "2026-01-01T00:00:00.000Z"},
  {"stage": "上架", "time": "2026-01-10T00:00:00.000Z"},
  {"stage": "一开", "time": "2026-01-15T00:00:00.000Z"}
]
```

### 建议索引
- `city` - 按城市查询
- `stage` - 按阶段查询
- `artistId` - 按艺人查询
- `dates` - 按日期排序
- `updateTime` - 按更新时间排序

---

## 2. artists（艺人表）

### 字段说明
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| _id | string | 是 | 艺人ID，可自定义如"artist_001" |
| name | string | 是 | 艺人名称，如"周杰伦" |
| alias | array | 否 | 别名数组，如["Jay", "杰伦", "周董"] |
| avatar | string | 否 | 头像云存储URL |
| followerCount | number | 是 | 关注人数，默认0 |
| createTime | date | 是 | 创建时间 |
| updateTime | date | 是 | 更新时间 |

### 建议索引
- `name` - 按名称搜索
- `followerCount` - 按热度排序

---

## 3. users（用户表）

### 字段说明
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| _id | string | 是 | 用户openid（作为主键） |
| unionId | string | 否 | 关联公众号的unionId |
| nickname | string | 否 | 用户昵称 |
| avatarUrl | string | 否 | 用户头像 |
| subscriptions | array | 是 | 订阅的演唱会ID数组 |
| followArtists | array | 是 | 关注的艺人ID数组 |
| notificationPrefs | object | 否 | 订阅通知设置 |
| createTime | date | 是 | 注册时间 |

### notificationPrefs 字段结构
```json
{
  "onListed": false,
  "oneDayBefore": false,
  "customHoursEnabled": true,
  "customHours": 1
}
```

### 建议索引
- `subscriptions` - 查询订阅了某演唱会的用户
- `followArtists` - 查询关注了某艺人的用户

---

## 4. admins（管理员表）

### 字段说明
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| _id | string | 是 | 自动生成 |
| openid | string | 是 | 管理员的openid |
| role | string | 是 | 角色：admin/editor |
| createTime | date | 是 | 添加时间 |

### 建议索引
- `openid` - 验证管理员身份

---

## 5. notifications（通知记录表）

### 字段说明
| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| _id | string | 是 | 自动生成 |
| userId | string | 是 | 用户openid |
| concertId | string | 是 | 演唱会ID |
| type | string | 是 | 通知类型：stage_listed/open_remind_day/open_remind_custom/other |
| content | string | 是 | 通知内容 |
| platform | string | 否 | 平台标识（如 damai/maoyan） |
| hours | number | 否 | 自定义提前小时数 |
| sent | boolean | 是 | 是否已发送 |
| error | string | 否 | 发送失败的错误信息 |
| sendTime | date | 是 | 发送时间 |

### 建议索引
- `userId` + `concertId` + `type` - 避免重复发送
- `sendTime` - 按时间查询

---

## 数据库权限设置

在云开发控制台中，为每个集合设置权限：

### concerts
```json
{
  "read": true,
  "write": "doc._openid == auth.openid || get('database.admins.${auth.openid}').openid == auth.openid"
}
```
或简单设置为：所有用户可读，仅管理员可写

### artists
- 所有用户可读，仅管理员可写

### users
```json
{
  "read": "doc._id == auth.openid",
  "write": "doc._id == auth.openid"
}
```
仅用户可读写自己的数据

### admins
- 仅管理员可读写（或通过云函数操作）

### notifications
- 仅创建者可读，通过云函数写入
