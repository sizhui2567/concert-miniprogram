# 脚本数据获取与导入流程（dm3.py / my4.py）

## 1. 使用 `dm3.py` 持续抓取大麦数据

`dm3.py` 会把结果写入本地 SQLite：`damai_full_data.db`（表：`concerts`）。

```bash
python dm3.py
```

## 2. 使用 `my4.py` 抓取猫眼并导出 JSON

支持批量艺人关键词和输出文件路径：

```bash
python my4.py --stars 周杰伦 林俊杰 张学友 --output data/maoyan_concerts.json
```

输出格式为：

```json
{
  "concerts": [
    {
      "title": "...",
      "artist": "...",
      "city": "...",
      "platforms": { "maoyan": { "available": true, "url": "...", "openTime": "" } }
    }
  ]
}
```

## 3. 合并多来源数据为可导入文件

`sync_concert_sources.py` 会读取：
- `dm3.py` 的 `damai_full_data.db`
- `my4.py` 的 `data/maoyan_concerts.json`

并输出为小程序 `importConcerts` 可用格式：

```bash
python sync_concert_sources.py --out data/concerts_from_sources.json
```

仅使用单一来源也可以：

```bash
python sync_concert_sources.py --no-my4 --out data/damai_only.json
python sync_concert_sources.py --no-dm3 --out data/maoyan_only.json
```

## 4. 导入到小程序云数据库

把输出文件中的 `concerts` 数组传给云函数 `importConcerts`（项目里已有该云函数）。

示例（小程序端）：

```javascript
const data = require('../../data/concerts_from_sources.json');
api.importConcerts(data.concerts, {
  updateExisting: true,
  source: 'script_merge'
});
```

## 5. 注意事项

- `my4.py` 依赖 `DrissionPage`：`pip install DrissionPage`
- `dm3.py` 依赖可用 Cookie（大麦接口）
- 合并脚本会按 `title + city` 去重并合并平台信息

## 6. 场景验证（推荐先跑）

项目已提供自动场景检查脚本，覆盖以下 6 种情况：

1. 仅 `dm3.py` 数据
2. 仅 `my4.py` 数据
3. 双来源同城同名合并
4. 脏数据过滤（缺少 title/artist/city）
5. 非法阶段自动兜底为 `网传`
6. 空数据源容错（文件不存在不报错）

执行：

```bash
python scenario_data_pipeline_check.py
```

如果输出 `6/6 通过`，说明这几种核心场景都可用。
