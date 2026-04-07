# Seat Map Auto Generation Guide

## 一、三种生成场景

### 场景1：本地图片（图1）直接生成交互图（图2）
```bash
python my4.py --seat-image-input data/seatmaps/zj/1016133935724_01.jpg --seat-map-output data/interactive_seat_map_local.json
```

### 场景2：图片 URL 直接生成
```bash
python my4.py --seat-image-input "https://img.alicdn.com/imgextra/i4/2251059038/O1CN01fWhCf32GdSlvnzi0z_!!2251059038.jpg" --seat-map-output data/interactive_seat_map_url.json
```

### 场景3：大麦链接抓取后自动生成
```bash
python my4.py --damai-seat-link "https://m.damai.cn/shows/item.html?itemId=1016133935724" --damai-seat-output data/damai_seat_map_zj_auto.json --auto-generate-seat-map --seat-map-output data/interactive_seat_map_from_damai.json
```

## 二、场景模板（预设）

`--seat-map-preset` 支持：
- `arena_end`：体育馆端舞台（默认）
- `arena_center`：体育馆中央舞台
- `stadium_end`：体育场端舞台
- `theater_fan`：剧院扇形

示例：
```bash
python my4.py --seat-image-input data/seatmaps/zj/1016133935724_01.jpg --seat-map-preset arena_center --seat-map-output data/interactive_seat_map_center.json
```

## 三、质量校验与自动回退

- 生成后自动给出质量评分 `qualityReport.score`
- 若低于阈值（默认 `72`）会自动回退到 `--seat-map-fallback-preset`

常用参数：
- `--seat-map-min-quality-score`
- `--seat-map-fallback-preset`

示例：
```bash
python my4.py --seat-image-input data/seatmaps/zj/1016133935724_01.jpg --seat-map-min-quality-score 80 --seat-map-fallback-preset arena_end --seat-map-output data/interactive_seat_map_guard.json
```

## 四、可调参数
- `--seat-map-ring-count`
- `--seat-map-sector-count`
- `--seat-map-start-angle`
- `--seat-map-end-angle`
- `--seat-map-overlay-opacity`
- `--seat-map-stage-center-y-ratio`
- `--seat-map-stage-rx-ratio`
- `--seat-map-stage-ry-ratio`
- `--seat-map-boundary-rx-ratio`
- `--seat-map-boundary-ry-ratio`
- `--seat-map-price-tiers`

## 五、自动化场景测试
```bash
python scenario_seat_map_pipeline_check.py
```

覆盖：本地图、模板生成、质量评分、自动回退、异常图容错、itemId 解析。
