# SVG 座位图组件使用指南

> 基于票牛网站实现方式优化

## 学习要点

从票牛网站 (m.piaoxiao2.com) 学习到的 SVG 实现方式：

### 1. SVG 结构

```html
<svg viewBox="0 0 620 570">
  <!-- 场馆边界 -->
  <path id="boundary" d="M617,286.5c0,152.3..." fill="none" stroke="#D6D6D6"/>
  
  <!-- 区域分组 -->
  <g id="内场" sector="内场">
    <g id="VIP1区" zone="VIP1区" disabled="false" seat-type="SEAT">
      <polygon points="364.8,213.1..." fill="#a5a9ff"/>
    </g>
  </g>
  
  <!-- 价格气泡 -->
  <g id="bubble-VIP1区" style="filter: drop-shadow(2px 2px 2px #BEBEC4);">
    <polygon points="..." fill="#ffffff"/> <!-- 三角 -->
    <rect width="44" height="20" rx="10" fill="#ffffff"/> <!-- 背景 -->
    <text>¥3385</text> <!-- 价格 -->
  </g>
</svg>
```

### 2. 关键属性

| 属性 | 说明 | 示例 |
|------|------|------|
| `id` | 区域唯一标识 | `VIP1区` |
| `sector` | 大分区（内场/看台） | `内场` |
| `zone` | 具体区域名 | `VIP1区` |
| `disabled` | 是否不可选 | `true/false` |
| `seat-type` | 座位类型 | `SEAT` |
| `bubble-position` | 价格气泡位置 | `312.3,88.3` |

### 3. 颜色方案

```css
VIP区: #a5a9ff (淡紫色)
看台区: #eaeaea (浅灰色)
可选: fill 属性控制
禁用: 灰色或降低透明度
```

## 组件使用

### 1. 引入组件

在页面 JSON 中：

```json
{
  "usingComponents": {
    "seat-map": "../../components/seat-map/seat-map"
  }
}
```

### 2. 基础使用

```xml
<!-- 使用默认数据 -->
<seat-map 
  venueName="梅赛德斯奔驰文化中心"
  userCount="156"
  bind:areaSelect="onAreaSelect"
  bind:confirm="onConfirm"
/>
```

### 3. 传入自定义数据

```xml
<seat-map 
  venueName="{{venue.name}}"
  userCount="{{venue.userCount}}"
  seatData="{{seatData}}"
  selectedAreaId="{{selectedAreaId}}"
  bind:areaSelect="onAreaSelect"
  bind:confirm="onConfirm"
/>
```

### 4. 数据结构

```javascript
Page({
  data: {
    seatData: {
      // SVG 视口
      viewBox: '0 0 620 570',
      
      // 舞台位置
      stage: {
        cx: 310,
        cy: 280,
        rx: 80,
        ry: 40
      },
      
      // 场馆边界
      boundary: {
        cx: 310,
        cy: 280,
        rx: 300,
        ry: 270
      },
      
      // 区域数组
      areas: [
        {
          id: 'vip1',
          name: 'VIP1区',
          type: 'vip',           // vip/premium/standard/disabled
          typeValue: 'polygon',  // polygon/rect/path
          points: '330,240 370,240 370,280 350,290 330,280',
          labelX: 350,
          labelY: 265,
          price: 3280,
          rowCount: 20,
          userCount: 45,
          bubblePosition: { x: 350, y: 230 },
          // 用户散点数据（可选）
          users: [
            { id: 'u1', x: 340, y: 250, isMe: true },
            { id: 'u2', x: 360, y: 260 }
          ]
        }
      ]
    }
  },
  
  onAreaSelect(e) {
    console.log('选中区域:', e.detail.area);
  },
  
  onConfirm(e) {
    console.log('确认选择:', e.detail.area);
  }
});
```

## 与搭子系统结合

### 1. 排级拓扑匹配

组件支持显示用户散点，配合搭子系统的排级匹配：

```javascript
// 获取邻居数据
const neighbors = await api.getNeighbors({
  concertId: 'xxx',
  areaId: 'vip1',
  rowRange: [5, 10]  // 排范围
});

// 更新组件显示
this.selectComponent('#seatMap').updateUserDots('vip1', neighbors.map(n => ({
  id: n.userId,
  x: n.virtualX * 6.2,  // 转换坐标
  y: n.virtualY * 5.7,
  isMe: n.isMe
})));
```

### 2. 化名系统

气泡显示化名而非真实昵称：

```javascript
// 数据结构
users: [
  {
    id: 'u1',
    pseudoName: '追光者A3',
    x: 350,
    y: 265,
    tags: ['带相机', '可拼车']
  }
]
```

### 3. 隐私模式

根据用户隐私设置显示不同精度：

```javascript
// 透明模式：显示精确位置
// 化名模式：显示散点
// 幽灵模式：只显示"附近有人"提示
// 完全匿名：不显示
```

## 从票牛数据转换

如果从票牛爬取 SVG 数据：

```javascript
function convertFromPiaoNiu(pnData) {
  return {
    viewBox: pnData.viewBox,
    areas: pnData.groups.map(g => ({
      id: g.id,
      name: g.id.replace(/\d+$/, ''),  // 去掉数字后缀
      type: getTypeFromFill(g.fill),
      typeValue: g.tagName,  // polygon/path/rect
      points: g.points,
      path: g.d,
      labelX: calculateCenter(g).x,
      labelY: calculateCenter(g).y,
      price: null,  // 需要另外获取
      disabled: g.disabled === 'true'
    }))
  };
}
```

## 性能优化

1. **延迟加载**：大型场馆分段加载
2. **虚拟列表**：只渲染可视区域
3. **缓存 SVG**：本地存储座位图数据
4. **Web Worker**：复杂计算移至后台

## 注意事项

1. 小程序 SVG 支持有限，避免使用复杂滤镜
2. 使用 `transform` 做动画，性能更好
3. 价格气泡使用绝对定位，避免重排
4. 用户散点使用 `r` 属性控制大小，便于交互
