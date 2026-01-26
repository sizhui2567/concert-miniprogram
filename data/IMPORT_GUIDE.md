# 演唱会数据导入指南

## 方式一：通过小程序代码导入

在小程序页面或控制台中调用：

```javascript
const api = require('../../utils/api');

// 读取JSON数据
const concertData = require('../../data/sample_concerts.json');

// 调用导入云函数
api.callFunction('importConcerts', {
  concerts: concertData.concerts,
  options: {
    updateExisting: true,  // 是否更新已存在的数据
    source: 'json_import'  // 数据来源标识
  }
}).then(res => {
  console.log('导入结果:', res);
}).catch(err => {
  console.error('导入失败:', err);
});
```

## 方式二：通过云开发控制台导入

1. 打开云开发控制台 → 云函数 → importConcerts
2. 点击「云端测试」
3. 在测试参数中输入：

```json
{
  "concerts": [
    {
      "title": "演唱会名称",
      "artist": "艺人名",
      "city": "城市",
      "venue": "场馆",
      "dates": ["2026-03-15"],
      "stage": "一开",
      "platforms": {
        "damai": {"available": true, "url": "...", "openTime": "2026-01-26 10:00"}
      },
      "priceRange": "380-1880",
      "poster": "海报图片URL"
    }
  ],
  "options": {
    "updateExisting": true,
    "source": "manual"
  }
}
```

4. 点击「运行测试」

## 方式三：爬虫脚本导入

### 1. 创建爬虫脚本（Node.js）

```javascript
// crawler/damai_crawler.js
const axios = require('axios');

async function crawlDamai() {
  // 实现大麦网爬取逻辑
  // 注意：需要处理反爬机制
  const concerts = [];

  // ... 爬取数据 ...

  return concerts;
}

async function importToCloud(concerts) {
  // 调用云函数导入
  // 需要使用微信云开发的服务端SDK
}

module.exports = { crawlDamai, importToCloud };
```

### 2. 数据格式要求

每条演唱会数据必须包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 演唱会名称 |
| artist | string | 是 | 艺人名称 |
| city | string | 是 | 演出城市 |
| venue | string | 否 | 演出场馆 |
| dates | array | 否 | 演出日期数组 ["2026-03-15"] |
| stage | string | 否 | 阶段：网传/上架/一开/二开/三开 |
| platforms | object | 否 | 各平台售票信息 |
| priceRange | string | 否 | 价格区间 "380-1880" |
| poster | string | 否 | 海报图片URL |

### 3. platforms 对象格式

```json
{
  "damai": {
    "available": true,      // 是否开售
    "url": "购票链接",       // 购票页面URL
    "openTime": "2026-01-26 10:00"  // 开售时间
  },
  "maoyan": { ... },
  "douyin": { ... },
  "xiecheng": { ... },
  "piaoxingqiu": { ... }
}
```

## 导入结果说明

```json
{
  "code": 0,
  "message": "导入完成：新增5条，更新2条，跳过1条，失败0条",
  "data": {
    "total": 8,      // 总共处理
    "added": 5,      // 新增数量
    "updated": 2,    // 更新数量
    "skipped": 1,    // 跳过数量（缺少必要字段或已存在且不更新）
    "failed": 0,     // 失败数量
    "errors": []     // 错误详情
  }
}
```

## 注意事项

1. **重复数据处理**：根据 `title + city` 判断是否重复
2. **权限要求**：需要管理员权限才能导入
3. **数据审核**：爬虫导入的数据默认 `verified: false`
4. **阶段历史**：系统会自动记录阶段变更历史
5. **预售时间**：填写在 `platforms.xxx.openTime` 字段
