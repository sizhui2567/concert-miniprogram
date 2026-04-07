import base64
import os
import tempfile

import my4


MINI_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQImWNgoBpgYGBgYGBgAAAEAAH9"
    "4M0JAAAAAElFTkSuQmCC"
)


def print_result(name, ok, detail=""):
    flag = "PASS" if ok else "FAIL"
    print(f"[{flag}] {name} {detail}")


def scenario_local_image_probe(tmp_dir):
    image_path = os.path.join(tmp_dir, "tiny.png")
    with open(image_path, "wb") as f:
        f.write(base64.b64decode(MINI_PNG_BASE64))

    info = my4.probe_image_info(image_path)
    ok = info["width"] == 2 and info["height"] == 2
    print_result("场景1 本地图尺寸探测", ok, f"-> {info['width']}x{info['height']}")
    return ok, info


def scenario_preset_generation(image_info):
    options = my4.resolve_seat_map_options({"presetKey": "arena_end"})
    seat_map = my4.build_interactive_seat_map(image_info, options)
    expected = int(options["ringCount"]) * int(options["sectorCount"])
    ok = len(seat_map.get("areas", [])) == expected
    print_result("场景2 模板生成", ok, f"-> areas={len(seat_map.get('areas', []))} expected={expected}")
    return ok, seat_map


def scenario_quality_check(seat_map):
    quality = my4.validate_interactive_seat_map_quality(seat_map, seat_map.get("options", {}))
    ok = quality.get("ok") is True and quality.get("score", 0) >= 72
    print_result("场景3 质量校验", ok, f"-> score={quality.get('score')}")
    return ok


def scenario_fallback_trigger(image_info):
    result = my4.generate_interactive_seat_map_with_guard(
        image_info,
        {
            "presetKey": "arena_end",
            "fallbackPresetKey": "theater_fan",
            "minQualityScore": 101,
        },
    )
    ok = result.get("usedFallback") is True
    print_result("场景4 自动回退", ok, f"-> fallback={result.get('fallbackPresetKey')}")
    return ok


def scenario_bad_image(tmp_dir):
    bad_path = os.path.join(tmp_dir, "bad.bin")
    with open(bad_path, "wb") as f:
        f.write(b"not_an_image")

    try:
        my4.probe_image_info(bad_path)
        ok = False
    except Exception:
        ok = True
    print_result("场景5 异常图片容错", ok)
    return ok


def scenario_item_id_extract():
    url = "https://m.damai.cn/shows/item.html?from=def&itemId=1016133935724&spm=xx"
    item_id = my4.extract_item_id(url)
    ok = item_id == "1016133935724"
    print_result("场景6 itemId 解析", ok, f"-> {item_id}")
    return ok


def main():
    with tempfile.TemporaryDirectory(prefix="seatmap_scenarios_") as tmp_dir:
        ok1, image_info = scenario_local_image_probe(tmp_dir)
        ok2, seat_map = scenario_preset_generation(image_info)
        ok3 = scenario_quality_check(seat_map)
        ok4 = scenario_fallback_trigger(image_info)
        ok5 = scenario_bad_image(tmp_dir)
        ok6 = scenario_item_id_extract()

    checks = [ok1, ok2, ok3, ok4, ok5, ok6]
    passed = sum(1 for x in checks if x)
    total = len(checks)
    print(f"\n座位图场景验证完成: {passed}/{total} 通过")
    if passed != total:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
