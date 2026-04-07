import argparse
import json
import os
import sqlite3
from datetime import datetime


PLATFORM_KEYS = ["damai", "maoyan", "douyin", "xiecheng", "piaoxingqiu"]
STAGE_ENUM = {"网传", "上架", "一开", "二开", "三开", "已结束"}


def default_platforms():
    data = {}
    for key in PLATFORM_KEYS:
        data[key] = {"available": False, "url": "", "openTime": ""}
    return data


def normalize_platforms(raw):
    merged = default_platforms()
    if not isinstance(raw, dict):
        return merged
    for key in PLATFORM_KEYS:
        item = raw.get(key, {})
        if not isinstance(item, dict):
            item = {}
        merged[key] = {
            "available": bool(item.get("available", False)),
            "url": str(item.get("url", "") or ""),
            "openTime": str(item.get("openTime", "") or "")
        }
    return merged


def normalize_dates(dates):
    if not isinstance(dates, list):
        return []
    return [str(d).strip() for d in dates if str(d).strip()]


def normalize_stage(stage):
    value = str(stage or "").strip()
    if value in STAGE_ENUM:
        return value
    return "网传"


def normalize_history(history, stage):
    if isinstance(history, list) and history:
        cleaned = []
        for item in history:
            if isinstance(item, dict) and item.get("stage"):
                cleaned.append({
                    "stage": normalize_stage(item.get("stage")),
                    "time": str(item.get("time") or datetime.utcnow().isoformat() + "Z")
                })
        if cleaned:
            return cleaned
    return [{"stage": stage, "time": datetime.utcnow().isoformat() + "Z"}]


def normalize_concert(raw, source_tag):
    if not isinstance(raw, dict):
        return None

    title = str(raw.get("title", "")).strip()
    artist = str(raw.get("artist", "")).strip()
    city = str(raw.get("city", "")).strip()
    if not title or not artist or not city:
        return None

    stage = normalize_stage(raw.get("stage"))
    result = {
        "title": title,
        "artist": artist,
        "artistId": str(raw.get("artistId", "") or artist).strip(),
        "city": city,
        "venue": str(raw.get("venue", "") or "").strip(),
        "province": str(raw.get("province", "") or city).strip(),
        "dates": normalize_dates(raw.get("dates", [])),
        "stage": stage,
        "stageHistory": normalize_history(raw.get("stageHistory"), stage),
        "platforms": normalize_platforms(raw.get("platforms")),
        "priceRange": str(raw.get("priceRange", "") or "").strip(),
        "poster": str(raw.get("poster", "") or "").strip(),
        "status": str(raw.get("status", "published") or "published"),
        "source": str(raw.get("source", "") or source_tag),
        "verified": bool(raw.get("verified", False))
    }
    return result


def load_dm3_sqlite(db_path):
    if not os.path.exists(db_path):
        print(f"[dm3] 数据库不存在，跳过: {db_path}")
        return []

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    concerts = []
    try:
        cursor.execute("SELECT full_json_data, title, artist, city FROM concerts")
        rows = cursor.fetchall()
        for full_json_data, title, artist, city in rows:
            obj = None
            if full_json_data:
                try:
                    obj = json.loads(full_json_data)
                except Exception:
                    obj = None
            if obj is None:
                obj = {
                    "title": title or "",
                    "artist": artist or "",
                    "city": city or ""
                }
            normalized = normalize_concert(obj, "dm3_damai")
            if normalized:
                concerts.append(normalized)
    finally:
        conn.close()

    print(f"[dm3] 读取到 {len(concerts)} 条")
    return concerts


def load_json_concerts(path, source_tag):
    if not os.path.exists(path):
        print(f"[{source_tag}] 文件不存在，跳过: {path}")
        return []

    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    if isinstance(payload, dict):
        raw_list = payload.get("concerts", [])
    elif isinstance(payload, list):
        raw_list = payload
    else:
        raw_list = []

    concerts = []
    for item in raw_list:
        normalized = normalize_concert(item, source_tag)
        if normalized:
            concerts.append(normalized)

    print(f"[{source_tag}] 读取到 {len(concerts)} 条")
    return concerts


def merge_concert_items(left, right):
    merged = dict(left)
    for key in ["venue", "province", "priceRange", "poster", "artistId"]:
        if (not merged.get(key)) and right.get(key):
            merged[key] = right.get(key)

    # 日期合并去重
    dates = set(merged.get("dates", []))
    dates.update(right.get("dates", []))
    merged["dates"] = sorted([d for d in dates if d])

    # 平台信息合并（只要有任一平台可用就保留）
    platforms = default_platforms()
    left_p = normalize_platforms(merged.get("platforms"))
    right_p = normalize_platforms(right.get("platforms"))
    for key in PLATFORM_KEYS:
        platforms[key]["available"] = bool(left_p[key]["available"] or right_p[key]["available"])
        platforms[key]["url"] = left_p[key]["url"] or right_p[key]["url"]
        platforms[key]["openTime"] = left_p[key]["openTime"] or right_p[key]["openTime"]
    merged["platforms"] = platforms

    # source 保留组合
    if merged.get("source") and right.get("source") and merged["source"] != right["source"]:
        merged["source"] = f'{merged["source"]}+{right["source"]}'

    return merged


def dedupe_and_merge(concerts):
    merged_map = {}
    for item in concerts:
        key = (item.get("title", "").strip().lower(), item.get("city", "").strip().lower())
        if key not in merged_map:
            merged_map[key] = item
            continue
        merged_map[key] = merge_concert_items(merged_map[key], item)
    return list(merged_map.values())


def write_output(concerts, out_path):
    payload = {"concerts": concerts}
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"[output] 已生成 {out_path}，共 {len(concerts)} 条")


def main():
    parser = argparse.ArgumentParser(description="合并 dm3.py 与 my4.py 数据为 importConcerts 可导入 JSON")
    parser.add_argument("--dm3-db", default="damai_full_data.db", help="dm3.py 产出的 SQLite 路径")
    parser.add_argument("--my4-json", default="data/maoyan_concerts.json", help="my4.py 导出的 JSON 路径")
    parser.add_argument("--extra-json", nargs="*", default=[], help="额外 JSON 数据源（可多个）")
    parser.add_argument("--out", default="data/concerts_from_sources.json", help="输出 JSON 文件")
    parser.add_argument("--no-dm3", action="store_true", help="不读取 dm3 sqlite")
    parser.add_argument("--no-my4", action="store_true", help="不读取 my4 json")
    args = parser.parse_args()

    all_concerts = []
    if not args.no_dm3:
        all_concerts.extend(load_dm3_sqlite(args.dm3_db))
    if not args.no_my4:
        all_concerts.extend(load_json_concerts(args.my4_json, "my4_maoyan"))

    for extra in args.extra_json:
        all_concerts.extend(load_json_concerts(extra, "extra_source"))

    merged = dedupe_and_merge(all_concerts)
    write_output(merged, args.out)
    print("[next] 你可以把输出文件里的 concerts 数组传给 importConcerts 云函数。")


if __name__ == "__main__":
    main()
