# Seat Locator Template

## 1) 模板文件
- `data/seat_map_template.json`

## 2) 解析与定位函数
- `miniprogram/utils/seat-locator.js`

## 3) 最小调用示例（小程序页）
```javascript
const seatMap = require('../../../data/seat_map_template.json');
const { locateSeat, toUserDot } = require('../../../utils/seat-locator');

const result = locateSeat(seatMap, '101区12排8座');
if (result.ok) {
  const dot = toUserDot(result);
  // 你的 seat-map 组件实例
  // this.selectComponent('#seatMap').updateUserDots(result.areaId, [dot]);
}
```

## 4) 支持输入格式
- `101区12排8座`
- `101-12-8`
- `内场A区 3排 12`
- `A101R12S8`

## 5) 表达方式建议（已体现在模板）
- 看台：`seatModel.mode = grid`
- 内场：`seatModel.mode = hybrid`（优先点位，找不到再走规则）
