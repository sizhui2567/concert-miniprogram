# 数据初始化指南

> 根据数据库字段规范设计的初始化方案

---

## 📋 数据库集合清单

根据 `DATABASE_DESIGN.md`，需要以下集合：

| 集合 | 说明 | 初始化内容 |
|------|------|-----------|
| `artists` | 艺人表 | 5位热门艺人 |
| `concerts` | 演唱会表 | 3场示例演唱会 |
| `admins` | 管理员表 | 当前用户设为管理员 |
| `users` | 用户表 | 当前用户基本信息 |
| `notifications` | 通知表 | 空（运行时创建） |

---

## 🚀 快速开始

### 步骤 1：部署云函数

1. 在微信开发者工具左侧文件树找到 `cloudfunctions/init-simple`
2. **右键** → **"创建并部署：云端安装依赖"**
3. 等待部署完成（控制台显示 `[上传] 完成`）

### 步骤 2：验证部署

1. 点击工具栏 **"云开发"** 按钮
2. 选择 **"云函数"** 标签
3. 确认 `init-simple` 在列表中且状态为 **"正常"**

### 步骤 3：运行初始化

1. 在小程序首页找到 **"开发调试"** 面板
2. 点击 **"初始化数据"** 按钮
3. 等待4个步骤完成：
   - 步骤 1/4: 艺人数据
   - 步骤 2/4: 演唱会数据  
   - 步骤 3/4: 管理员设置
   - 步骤 4/4: 用户数据

### 步骤 4：验证数据

在云开发控制台 → 数据库中查看：
- `artists` 集合应有 5 个艺人
- `concerts` 集合应有 3 场演唱会
- `admins` 集合应有 1 条记录（你的openid）

---

## 📊 初始化数据详情

### 艺人数据（5位）

| ID | 名字 | 别名 | 粉丝数 |
|----|------|------|--------|
| jay | 周杰伦 | Jay, 周董, 杰伦 | 1,250,000 |
| mayday | 五月天 | Mayday, 阿信 | 980,000 |
| jj | 林俊杰 | JJ, 行走的CD | 860,000 |
| taylor | Taylor Swift | 霉霉, TS | 2,100,000 |
| jacky | 张学友 | 歌神, 学友 | 780,000 |

### 演唱会数据（3场）

#### 1. 周杰伦「嘉年华」上海站
- **城市**: 上海
- **场馆**: 上海体育场
- **日期**: 2026-04-15, 2026-04-16
- **阶段**: 网传
- **票价**: 580-2580
- **订阅数**: 5680

#### 2. 五月天「好好好想见到你」北京站
- **城市**: 北京
- **场馆**: 国家体育场（鸟巢）
- **日期**: 2026-05-01/02/03
- **阶段**: 上架
- **票价**: 355-1855
- **大麦网**: 2026-02-15 10:00 开售
- **订阅数**: 8932

#### 3. 林俊杰「JJ20」广州站
- **城市**: 广州
- **场馆**: 宝能观致文化中心
- **日期**: 2026-03-20
- **阶段**: 一开
- **票价**: 380-1680
- **大麦/猫眼**: 2026-02-01 14:00 开售
- **订阅数**: 4521

---

## 🔧 数据结构说明

### concerts 字段完整性

```javascript
{
  // 基本信息（必填）
  title: "演唱会名称",
  artist: "艺人名称",
  artistId: "关联艺人ID",
  city: "城市",
  venue: "场馆",
  
  // 日期信息（必填）
  dates: ["2026-04-15"],
  stage: "网传/上架/一开/二开/三开/已结束",
  stageHistory: [
    { stage: "网传", time: Date }
  ],
  
  // 平台信息（必填）
  platforms: {
    damai: { available: false, url: "", openTime: "" },
    maoyan: { available: false, url: "", openTime: "" },
    douyin: { available: false, url: "", openTime: "" },
    xiecheng: { available: false, url: "", openTime: "" },
    piaoxingqiu: { available: false, url: "", openTime: "" }
  },
  
  // 其他信息
  priceRange: "580-2580",
  poster: "海报URL",
  status: "published",
  source: "manual",
  verified: true,
  subscribeCount: 0,
  
  // 时间戳
  createTime: Date,
  updateTime: Date
}
```

---

## ⚠️ 常见问题

### 问题 1：提示 "FunctionName parameter could not be found"

**原因**: `init-simple` 云函数未部署

**解决**:
1. 确认 `cloudfunctions/init-simple` 文件夹存在
2. 确认包含 `index.js`, `package.json`, `config.json`
3. 右键重新部署

### 问题 2：提示 "步骤 X 失败"

**原因**: 可能是数据库权限问题

**解决**:
1. 云开发控制台 → 数据库
2. 检查集合权限是否为 "所有用户可读，仅创建者可写" 或更宽松
3. 重新初始化

### 问题 3：数据重复

**原因**: 多次点击初始化

**解决**:
- 艺人使用 `doc().set()` 会自动更新已存在的数据
- 演唱会使用 `add()` 会创建新记录
- 如需重新初始化，先手动清空 concerts 集合

### 问题 4：管理员创建失败

**原因**: 用户未登录或openid获取失败

**解决**:
- 确保已调用 `wx.login()` 或 `wx.getUserProfile()`
- 步骤4会跳过管理员创建，不影响使用

---

## 📝 手动初始化（备选方案）

如果云函数始终无法部署，可以手动导入数据：

### 1. 导出示例数据

在 `data/sample_concerts.json` 中有示例数据格式

### 2. 云控制台导入

1. 云开发控制台 → 数据库 → `concerts`
2. 点击 **"导入"**
3. 选择 JSON 文件

### 3. JSON 格式示例

```json
{
  "title": "周杰伦「嘉年华」上海站",
  "artist": "周杰伦",
  "artistId": "jay",
  "city": "上海",
  "venue": "上海体育场",
  "province": "上海",
  "dates": ["2026-04-15"],
  "stage": "网传",
  "stageHistory": [{"stage": "网传", "time": {"$date": "2026-01-01T00:00:00.000Z"}}],
  "platforms": {
    "damai": {"available": false, "url": "", "openTime": ""},
    "maoyan": {"available": false, "url": "", "openTime": ""}
  },
  "priceRange": "580-2580",
  "poster": "https://picsum.photos/400/600?random=1",
  "status": "published",
  "source": "manual",
  "verified": true,
  "subscribeCount": 0
}
```

---

## ✅ 验证清单

初始化完成后，检查：

- [ ] `artists` 集合有 5 条记录
- [ ] `concerts` 集合有 3 条记录
- [ ] `admins` 集合有 1 条记录（你的openid）
- [ ] 首页能正常显示演唱会列表
- [ ] 点击卡片能进入详情页
- [ ] 订阅按钮能正常点击

---

## 🎉 完成

初始化成功后，即可开始使用小程序的全部功能！
