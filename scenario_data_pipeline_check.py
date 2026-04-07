import json
import os
import sqlite3
import tempfile
from datetime import datetime

import sync_concert_sources as syncer


def create_dm3_test_db(db_path, full_json_objects):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE concerts (
            id TEXT PRIMARY KEY,
            title TEXT,
            artist TEXT,
            city TEXT,
            last_up_time INTEGER,
            stage TEXT,
            stage_history_json TEXT,
            full_json_data TEXT,
            update_time TEXT
        )
        """
    )

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    for idx, obj in enumerate(full_json_objects):
        cur.execute(
            """
            INSERT INTO concerts
            (id, title, artist, city, last_up_time, stage, stage_history_json, full_json_data, update_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(idx + 1),
                obj.get("title", ""),
                obj.get("artist", ""),
                obj.get("city", ""),
                0,
                obj.get("stage", "网传"),
                json.dumps(obj.get("stageHistory", []), ensure_ascii=False),
                json.dumps(obj, ensure_ascii=False),
                now,
            ),
        )
    conn.commit()
    conn.close()


def write_json(path, payload):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def print_result(name, ok, detail):
    flag = "PASS" if ok else "FAIL"
    print(f"[{flag}] {name} -> {detail}")


def scenario_dm3_only(tmp_dir):
    db_path = os.path.join(tmp_dir, "s1_dm3.db")
    create_dm3_test_db(
        db_path,
        [
            {
                "title": "周杰伦嘉年华演唱会",
                "artist": "周杰伦",
                "artistId": "jay",
                "city": "上海",
                "venue": "上海体育场",
                "dates": ["2026-04-20"],
                "stage": "一开",
                "platforms": {
                    "damai": {"available": True, "url": "https://damai.test/1", "openTime": "2026-02-01 10:00"}
                },
            }
        ],
    )
    concerts = syncer.load_dm3_sqlite(db_path)
    ok = len(concerts) == 1 and concerts[0]["platforms"]["damai"]["available"] is True
    print_result("场景1 仅dm3数据", ok, f"count={len(concerts)}")
    return ok


def scenario_my4_only(tmp_dir):
    json_path = os.path.join(tmp_dir, "s2_my4.json")
    write_json(
        json_path,
        {
            "concerts": [
                {
                    "title": "林俊杰JJ20演唱会",
                    "artist": "林俊杰",
                    "city": "北京",
                    "venue": "鸟巢",
                    "dates": ["2026-05-01"],
                    "platforms": {
                        "maoyan": {"available": True, "url": "https://maoyan.test/2", "openTime": ""}
                    },
                }
            ]
        },
    )
    concerts = syncer.load_json_concerts(json_path, "my4_maoyan")
    ok = len(concerts) == 1 and concerts[0]["platforms"]["maoyan"]["available"] is True
    print_result("场景2 仅my4数据", ok, f"count={len(concerts)}")
    return ok


def scenario_merge_duplicate(tmp_dir):
    dm3_db = os.path.join(tmp_dir, "s3_dm3.db")
    my4_json = os.path.join(tmp_dir, "s3_my4.json")

    create_dm3_test_db(
        dm3_db,
        [
            {
                "title": "五月天演唱会",
                "artist": "五月天",
                "city": "广州",
                "venue": "广州体育中心",
                "dates": ["2026-06-06"],
                "platforms": {
                    "damai": {"available": True, "url": "https://damai.test/3", "openTime": "2026-03-01 10:00"}
                },
                "source": "dm3_damai",
            }
        ],
    )
    write_json(
        my4_json,
        {
            "concerts": [
                {
                    "title": "五月天演唱会",
                    "artist": "五月天",
                    "city": "广州",
                    "dates": ["2026-06-07"],
                    "platforms": {
                        "maoyan": {"available": True, "url": "https://maoyan.test/3", "openTime": ""}
                    },
                    "source": "my4_maoyan",
                }
            ]
        },
    )

    dm3_items = syncer.load_dm3_sqlite(dm3_db)
    my4_items = syncer.load_json_concerts(my4_json, "my4_maoyan")
    merged = syncer.dedupe_and_merge(dm3_items + my4_items)

    ok = (
        len(merged) == 1
        and merged[0]["platforms"]["damai"]["available"]
        and merged[0]["platforms"]["maoyan"]["available"]
        and len(merged[0]["dates"]) == 2
    )
    print_result("场景3 双源同城同名合并", ok, f"count={len(merged)} dates={merged[0]['dates'] if merged else []}")
    return ok


def scenario_invalid_filtered(tmp_dir):
    json_path = os.path.join(tmp_dir, "s4_invalid.json")
    write_json(
        json_path,
        {
            "concerts": [
                {"title": "无城市数据", "artist": "测试艺人"},
                {"artist": "无标题", "city": "杭州"},
            ]
        },
    )
    concerts = syncer.load_json_concerts(json_path, "extra_source")
    ok = len(concerts) == 0
    print_result("场景4 脏数据过滤", ok, f"count={len(concerts)}")
    return ok


def scenario_stage_fallback():
    normalized = syncer.normalize_concert(
        {"title": "测试演唱会", "artist": "测试艺人", "city": "深圳", "stage": "未知阶段"}, "extra_source"
    )
    ok = normalized is not None and normalized["stage"] == "网传"
    print_result("场景5 非法阶段兜底", ok, f"stage={normalized['stage'] if normalized else None}")
    return ok


def scenario_empty_safe(tmp_dir):
    missing_db = os.path.join(tmp_dir, "not_exists.db")
    missing_json = os.path.join(tmp_dir, "not_exists.json")
    concerts = []
    concerts.extend(syncer.load_dm3_sqlite(missing_db))
    concerts.extend(syncer.load_json_concerts(missing_json, "my4_maoyan"))
    merged = syncer.dedupe_and_merge(concerts)
    ok = len(merged) == 0
    print_result("场景6 空数据源容错", ok, f"count={len(merged)}")
    return ok


def main():
    print("开始执行数据管道场景验证...")
    with tempfile.TemporaryDirectory(prefix="concert_scenarios_") as tmp_dir:
        checks = [
            scenario_dm3_only(tmp_dir),
            scenario_my4_only(tmp_dir),
            scenario_merge_duplicate(tmp_dir),
            scenario_invalid_filtered(tmp_dir),
            scenario_stage_fallback(),
            scenario_empty_safe(tmp_dir),
        ]

    passed = sum(1 for x in checks if x)
    total = len(checks)
    print(f"\n场景验证完成: {passed}/{total} 通过")
    if passed != total:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
