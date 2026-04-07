# coordKey 接入当前 seat-map-v2 + locateSeat 代码改造清单

## 1. 改造目标
- 把座位定位主键从“解析输入后再算坐标”升级为“先按 `coordKey` 精确命中，再兜底计算”。
- 统一区域内表达：`1排1座 => coordKey: "1,1"`。
- 兼容旧数据（只有 `row/seat` 没有 `coordKey`）和旧输入格式。

## 2. 数据协议改造（seat-map-v2 增量）
- [ ] `seatDetail.seats[*]` 增加字段：
  - `coordKey: "<row>,<seat>"`（例：`"12,8"`）
  - `seatKey: "R<row>S<seat>"`（可选，用于展示）
- [ ] `area.seatModel.pointSeats[*]`（若使用 `custom_points/hybrid`）同步补齐 `coordKey`。
- [ ] 保留 `row/seat/x/y/status` 作为兼容字段，不删除。

示例：
```json
{
  "id": "T1-R12-S8",
  "areaId": "T1",
  "row": 12,
  "seat": 8,
  "coordKey": "12,8",
  "x": 412.2,
  "y": 288.6,
  "status": "available"
}
```

## 3. 生成链路改造（前后端一致）
### 3.1 本地生成器
文件：`miniprogram/utils/seat-map-generator.js`
- [ ] 在 `buildSeatDetail` 中写入 `coordKey`（当前仅写 `row/seat`）。
- [ ] 统一一个小工具函数：`buildCoordKey(row, seat)`，避免重复格式化。

### 3.2 云函数生成
文件：`cloudfunctions/generateSeatMap/index.js`
- [ ] 在 `buildSeatDetail` 中同步输出 `coordKey`。
- [ ] 与前端生成器保持同一规则（必须同格式、同分隔符）。

## 4. 定位引擎改造（核心）
文件：`miniprogram/utils/seat-locator.js`
- [ ] 新增 `normalizeCoordKey(row, seat)`：
  - 输入数值或字符串都归一到 `"row,seat"`。
- [ ] 新增 `parseCoordKeyText(text)`：
  - 支持 `1,1`、`1-1`、`1排1座`。
- [ ] `parseSeatInput` 输出增加：`coordKey`。
- [ ] 增加区域内索引构建：
  - `buildAreaSeatIndex(area, seatMap)`，返回 `{ [coordKey]: seatPoint }`。
  - 优先用 `seatDetail.seats`，其次 `pointSeats`，最后才 `grid` 计算。
- [ ] `locateSeatInArea` 调整优先级：
  1. `coordKey` 索引直查
  2. 旧逻辑（grid/hybrid/custom_points）
- [ ] `locateSeat` 返回字段增加 `coordKey`，便于 UI 与分享链路复用。
- [ ] `locateSeat` 增加可选参数 `defaultAreaId`：
  - 支持用户只输 `1,1` 时，用当前选中区域定位。

## 5. SeatMap 组件改造
文件：`miniprogram/components/seat-map/seat-map.js`
- [ ] `collectSeatPoints` 产物补 `coordKey`。
- [ ] `_seatHitPoints` 存储 `coordKey`，点击座位事件直接带出。
- [ ] `locateSeat(payload)` 支持两种入参：
  - `x/y` 直定位（现有）
  - `areaId + coordKey` 反查定位（新增）
- [ ] 新增内部方法：`findSeatPoint(areaId, coordKey)`。

## 6. 详情页交互改造
文件：`miniprogram/pages/detail/detail.js`
- [ ] `onSeatMapSeatTap`：
  - `seatInput` 建议写成 `${areaId}-${coordKey}`（如 `101-12,8`）
  - `seatLocateResult` 增加 `coordKey`
- [ ] `locateByInput`：
  - 调用 `locateSeat(seatMap, seatInput, { defaultAreaId: selectedAreaId })`
- [ ] `applyLocateResult`：
  - 调用组件 `locateSeat` 时优先传 `coordKey`
- [ ] `onSubmitSeatView`：
  - `saveSeatView` payload 增加 `coordKey`
- [ ] 输入提示文案补充 `1,1` 格式。

## 7. 视角分享云函数改造
### 7.1 保存
文件：`cloudfunctions/saveSeatView/index.js`
- [ ] 入参新增 `coordKey`。
- [ ] 归一化并落库：`coordKey`。
- [ ] 幂等更新条件改为：`concertId + openid + areaId + coordKey`（优先）
- [ ] 兼容旧数据：若无 `coordKey`，回退 `row + seat`。

### 7.2 查询
文件：`cloudfunctions/getSeatViews/index.js`
- [ ] `field` 增加 `coordKey` 返回。
- [ ] 统计逻辑不变（按 areaId 聚合）。

## 8. 校验/发布链路补充
文件：
- `cloudfunctions/validateSeatMap/index.js`
- `cloudfunctions/publishSeatMap/index.js`
- [ ] 增加 `coordKey` 质量校验：
  - 同一区域 `coordKey` 不重复
  - `coordKey` 与 `row/seat` 一致（可逆）
- [ ] 对缺失 `coordKey` 的旧图给 warning，不直接 fatal（兼容历史）。

## 9. 回归测试清单（可跑通）
- [ ] 输入 `101区12排8座` 可定位。
- [ ] 输入 `101-12-8` 可定位。
- [ ] 输入 `101-12,8` 可定位。
- [ ] 先点中区域后输入 `12,8` 可定位。
- [ ] 点座位后回填输入框为 `area + coordKey`。
- [ ] 提交座位视角后，列表返回并可用 `coordKey` 二次定位。
- [ ] 无 `coordKey` 的旧 seatMap 仍可定位（走 fallback）。

## 10. 实施顺序（建议）
1. 先做第 3 + 第 4（数据与定位核心）。
2. 再做第 5 + 第 6（页面与组件接入）。
3. 最后做第 7 + 第 8（分享链路与质量门禁）。
