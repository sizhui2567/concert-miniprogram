import argparse
import hashlib
import json
import math
import os
import re
import struct
import time
from datetime import datetime, timezone
from urllib.parse import parse_qs, urlparse

import requests

try:
    from DrissionPage import ChromiumPage
except ImportError:
    ChromiumPage = None


PLATFORM_KEYS = ["damai", "maoyan", "douyin", "xiecheng", "piaoxingqiu"]
DAMAI_APP_KEY = "12574478"
DAMAI_ITEM_DETAIL_API = "https://mtop.damai.cn/h5/mtop.damai.item.detail.getdetail/1.0/"
DEFAULT_SEAT_MAP_OPTIONS = {
    "presetKey": "arena_end",
    "fallbackPresetKey": "arena_end",
    "ringCount": 4,
    "sectorCount": 24,
    "startAngle": -160,
    "endAngle": 160,
    "ringGapRatio": 0.014,
    "angleGapDegree": 1.2,
    "stageCenterYRatio": 0.57,
    "stageRxRatio": 0.1,
    "stageRyRatio": 0.075,
    "boundaryRxRatio": 0.47,
    "boundaryRyRatio": 0.43,
    "priceTiers": [1680, 1280, 880, 680, 580, 480, 380],
    "overlayOpacity": 0.42,
    "minQualityScore": 72,
}

SEAT_MAP_PRESETS = {
    "arena_end": {
        "ringCount": 4,
        "sectorCount": 24,
        "startAngle": -160,
        "endAngle": 160,
        "stageCenterYRatio": 0.57,
        "stageRxRatio": 0.1,
        "stageRyRatio": 0.075,
        "boundaryRxRatio": 0.47,
        "boundaryRyRatio": 0.43,
        "priceTiers": [1680, 1280, 880, 680, 580, 480, 380],
    },
    "arena_center": {
        "ringCount": 5,
        "sectorCount": 28,
        "startAngle": -178,
        "endAngle": 178,
        "stageCenterYRatio": 0.5,
        "stageRxRatio": 0.085,
        "stageRyRatio": 0.065,
        "boundaryRxRatio": 0.47,
        "boundaryRyRatio": 0.45,
        "priceTiers": [1980, 1580, 1280, 980, 780, 580],
    },
    "stadium_end": {
        "ringCount": 6,
        "sectorCount": 32,
        "startAngle": -165,
        "endAngle": 165,
        "stageCenterYRatio": 0.62,
        "stageRxRatio": 0.09,
        "stageRyRatio": 0.06,
        "boundaryRxRatio": 0.48,
        "boundaryRyRatio": 0.42,
        "priceTiers": [2380, 1880, 1380, 980, 680, 480],
    },
    "theater_fan": {
        "ringCount": 3,
        "sectorCount": 18,
        "startAngle": -140,
        "endAngle": 140,
        "stageCenterYRatio": 0.68,
        "stageRxRatio": 0.14,
        "stageRyRatio": 0.08,
        "boundaryRxRatio": 0.44,
        "boundaryRyRatio": 0.36,
        "priceTiers": [1280, 980, 680, 480],
    },
}


def build_default_platforms():
    platforms = {}
    for key in PLATFORM_KEYS:
        platforms[key] = {"available": False, "url": "", "openTime": ""}
    return platforms


def normalize_price_range(price_text):
    if not price_text:
        return ""
    cleaned = re.sub(r"[^\d\-~到至]", "", str(price_text))
    cleaned = cleaned.replace("到", "-").replace("至", "-").replace("~", "-")
    cleaned = re.sub(r"-{2,}", "-", cleaned).strip("-")
    return cleaned


def parse_dates_from_text(show_time_text):
    if not show_time_text:
        return []

    text = str(show_time_text).replace("/", "-")
    text = (
        text.replace("年", "-")
        .replace("月", "-")
        .replace("日", "")
        .replace(".", "-")
    )
    text = re.sub(r"\s+", " ", text)

    full_dates = re.findall(r"(20\d{2})-(\d{1,2})-(\d{1,2})", text)
    if full_dates:
        values = {f"{int(y):04d}-{int(m):02d}-{int(d):02d}" for y, m, d in full_dates}
        return sorted(values)

    range_match = re.search(
        r"(20\d{2})-(\d{1,2})-(\d{1,2})\s*[-~至到]\s*(\d{1,2})-(\d{1,2})",
        text,
    )
    if range_match:
        y, m1, d1, m2, d2 = map(int, range_match.groups())
        return [f"{y:04d}-{m1:02d}-{d1:02d}", f"{y:04d}-{m2:02d}-{d2:02d}"]

    return []


def split_city_venue(addr_text):
    if not addr_text:
        return "", ""

    normalized = str(addr_text).replace("·", "|").replace("•", "|").replace("-", "|")
    parts = [p.strip() for p in re.split(r"[|]", normalized) if p.strip()]
    if len(parts) >= 2:
        return parts[0], parts[1]
    return "", str(addr_text).strip()


def safe_text(ele):
    if not ele:
        return ""
    return (ele.text or "").strip()


def get_item_id(item):
    lx_mv_data = item.attr("lx-mv")
    if not lx_mv_data:
        return ""
    try:
        attr_json = json.loads(lx_mv_data)
        return str(attr_json.get("lab", {}).get("custom", {}).get("id", "")).strip()
    except Exception:
        return ""


def build_concert_obj(item, star_name):
    name = safe_text(item.ele(".name"))
    if not name or "演唱会" not in name:
        return None

    show_time = safe_text(item.ele(".time"))
    address = safe_text(item.ele(".addr"))
    price_text = safe_text(item.ele(".lower-price"))
    item_id = get_item_id(item)

    city, venue = split_city_venue(address)
    dates = parse_dates_from_text(show_time)
    price_range = normalize_price_range(price_text)

    platforms = build_default_platforms()
    maoyan_url = f"https://show.maoyan.com/shows/{item_id}" if item_id else ""
    platforms["maoyan"] = {
        "available": bool(maoyan_url),
        "url": maoyan_url,
        "openTime": "",
    }

    poster = ""
    img_ele = item.ele("img")
    if img_ele:
        poster = (img_ele.attr("src") or "").strip()

    now = datetime.now().isoformat()
    return {
        "title": name,
        "artist": star_name,
        "artistId": star_name,
        "city": city,
        "venue": venue,
        "province": city,
        "dates": dates,
        "stage": "网传",
        "stageHistory": [{"stage": "网传", "time": now}],
        "platforms": platforms,
        "priceRange": price_range,
        "poster": poster,
        "status": "published",
        "source": "my4_maoyan",
        "verified": False,
    }


def dedupe_concerts(concerts):
    seen = set()
    result = []
    for item in concerts:
        key = (item.get("title", "").strip().lower(), item.get("city", "").strip().lower())
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


def ensure_parent_dir(path):
    parent = os.path.dirname(os.path.normpath(path))
    if parent:
        os.makedirs(parent, exist_ok=True)


def extract_item_id(value):
    if not value:
        return ""

    text = str(value).strip()
    if text.isdigit():
        return text

    try:
        parsed = urlparse(text)
        query = parse_qs(parsed.query)
        for key in ["itemId", "itemid", "id"]:
            if key in query and query[key]:
                item_id = str(query[key][0]).strip()
                if item_id.isdigit():
                    return item_id
    except Exception:
        pass

    match = re.search(r"(?:itemId|itemid|id)=([0-9]+)", text)
    if match:
        return match.group(1)

    return ""


def damai_sign(token, t, data):
    token_part = token.split("_")[0] if token else ""
    raw = f"{token_part}&{t}&{DAMAI_APP_KEY}&{data}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def fetch_damai_item_detail(item_id, max_retry=3):
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1"
            ),
            "Referer": "https://m.damai.cn/",
            "Accept": "application/json,text/plain,*/*",
        }
    )

    data = json.dumps({"itemId": str(item_id)}, separators=(",", ":"), ensure_ascii=False)
    last_error = None

    for _ in range(max_retry):
        t = str(int(time.time() * 1000))
        token = session.cookies.get("_m_h5_tk", "")
        sign = damai_sign(token, t, data)

        params = {
            "jsv": "2.7.5",
            "appKey": DAMAI_APP_KEY,
            "t": t,
            "sign": sign,
            "api": "mtop.damai.item.detail.getdetail",
            "v": "1.0",
            "type": "originaljson",
            "dataType": "json",
            "timeout": "10000",
            "data": data,
        }

        try:
            resp = session.get(DAMAI_ITEM_DETAIL_API, params=params, timeout=20)
            try:
                payload = json.loads(resp.content.decode("utf-8"))
            except Exception:
                payload = resp.json()
        except Exception as exc:
            last_error = f"请求失败: {exc}"
            continue

        ret = "|".join(payload.get("ret", []))
        if "SUCCESS" in ret:
            return payload.get("data", {}), ""

        if "TOKEN" in ret:
            last_error = ret
            continue

        return None, ret or "接口返回异常"

    return None, (last_error or "未知错误")


def normalize_seat_image_urls(raw_seat_images):
    if not isinstance(raw_seat_images, list):
        return []

    urls = []
    seen = set()
    for item in raw_seat_images:
        url = ""
        if isinstance(item, str):
            url = item.strip()
        elif isinstance(item, dict):
            for key in ["url", "imageUrl", "src", "picUrl", "pic", "image", "seatImage"]:
                value = item.get(key)
                if isinstance(value, str) and value.strip():
                    url = value.strip()
                    break

        if not url:
            continue
        if url.startswith("//"):
            url = f"https:{url}"
        if not (url.startswith("http://") or url.startswith("https://")):
            continue
        if url in seen:
            continue
        seen.add(url)
        urls.append(url)

    return urls


def guess_file_ext(url):
    ext = os.path.splitext(urlparse(url).path or "")[1].lower()
    if ext in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]:
        return ext
    return ".jpg"


def download_seat_images(seat_images, output_dir, item_id):
    os.makedirs(output_dir, exist_ok=True)
    downloaded = []

    for idx, url in enumerate(seat_images, start=1):
        ext = guess_file_ext(url)
        filename = f"{item_id}_{idx:02d}{ext}"
        file_path = os.path.join(output_dir, filename)

        try:
            resp = requests.get(url, timeout=20)
            resp.raise_for_status()
            with open(file_path, "wb") as f:
                f.write(resp.content)
            downloaded.append({"url": url, "file": file_path.replace("\\", "/")})
        except Exception as exc:
            downloaded.append({"url": url, "file": "", "error": str(exc)})

    return downloaded


def fetch_damai_seat_map(item_id, source_url=""):
    detail_data, error_msg = fetch_damai_item_detail(item_id)
    if not detail_data:
        return {
            "ok": False,
            "itemId": item_id,
            "sourceUrl": source_url,
            "error": error_msg,
        }

    item = detail_data.get("item", {}) if isinstance(detail_data, dict) else {}

    seat_images_raw = []
    if isinstance(item, dict):
        seat_images_raw = item.get("seatImages") or item.get("performSeatImages") or []

    seat_images = normalize_seat_image_urls(seat_images_raw)

    return {
        "ok": True,
        "itemId": item_id,
        "sourceUrl": source_url,
        "title": item.get("itemName") or item.get("itemNameDisplay") or item.get("name", ""),
        "seatImageTitle": item.get("seatImageTitle", "座位图"),
        "seatImages": seat_images,
        "seatImageCount": len(seat_images),
        "hasSeatMap": len(seat_images) > 0,
        "rawItem": {
            "cityName": item.get("cityName", ""),
            "venueName": item.get("venueName", ""),
            "projectStatusTag": item.get("projectStatusTag", ""),
            "itemType": item.get("itemType", ""),
        },
        "crawledAt": datetime.now(timezone.utc).isoformat(),
    }


def scrape_search_results(star_name, close_browser=True):
    if ChromiumPage is None:
        raise RuntimeError("DrissionPage 未安装，请先执行: pip install DrissionPage")

    page = ChromiumPage()
    concerts = []

    try:
        url = "https://show.maoyan.com/myshowfe/trade/SearchByIndex?_blank=true&utm_source=wxmyshow&fromTag=wxmyshow"
        page.get(url)

        search_input = page.ele("#van-search-1-input")
        if not search_input:
            search_input = page.ele("@placeholder=找明星、演出、场馆")
        if not search_input:
            print(f"[{star_name}] 未找到搜索框，跳过")
            return []

        print(f"正在搜索猫眼: {star_name}")
        search_input.input(star_name)
        search_input.input("\n")
        page.wait(1.2)

        items = page.eles(".recommend-show")
        print(f"[{star_name}] 共抓到候选结果 {len(items)} 条")

        for item in items:
            concert = build_concert_obj(item, star_name)
            if concert:
                concerts.append(concert)

        concerts = dedupe_concerts(concerts)
        print(f"[{star_name}] 过滤后演唱会 {len(concerts)} 条")
        return concerts
    finally:
        if close_browser:
            page.quit()


def save_concerts_to_json(concerts, output_path):
    payload = {"concerts": concerts}
    ensure_parent_dir(output_path)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"已写入 {output_path} ({len(concerts)} 条)")


def save_json(payload, output_path):
    ensure_parent_dir(output_path)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"已写入 {output_path}")


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def to_fixed_point(value):
    return round(float(value), 1)


def to_polar_point(cx, cy, rx, ry, angle):
    rad = (angle * math.pi) / 180
    return {
        "x": to_fixed_point(cx + rx * math.cos(rad)),
        "y": to_fixed_point(cy + ry * math.sin(rad)),
    }


def build_polygon_points(points):
    return " ".join([f"{p['x']},{p['y']}" for p in points])


def get_area_type(ring_index):
    if ring_index == 0:
        return "vip"
    if ring_index == 1:
        return "premium"
    return "standard"


def get_area_price(ring_index, options):
    tiers = options.get("priceTiers") or DEFAULT_SEAT_MAP_OPTIONS["priceTiers"]
    if ring_index < len(tiers):
        return tiers[ring_index]
    return tiers[-1]


def get_section_label(ring_index, sector_index):
    return str(ring_index * 100 + sector_index + 1)


def create_area(
    ring_index,
    sector_index,
    sector_count,
    start_angle,
    step_angle,
    angle_gap,
    inner_rx,
    inner_ry,
    outer_rx,
    outer_ry,
    center_x,
    center_y,
    options,
):
    a1 = start_angle + sector_index * step_angle + angle_gap / 2
    a2 = start_angle + (sector_index + 1) * step_angle - angle_gap / 2

    p1 = to_polar_point(center_x, center_y, inner_rx, inner_ry, a1)
    p2 = to_polar_point(center_x, center_y, inner_rx, inner_ry, a2)
    p3 = to_polar_point(center_x, center_y, outer_rx, outer_ry, a2)
    p4 = to_polar_point(center_x, center_y, outer_rx, outer_ry, a1)

    mid_angle = (a1 + a2) / 2
    label_rx = (inner_rx + outer_rx) / 2
    label_ry = (inner_ry + outer_ry) / 2
    label_point = to_polar_point(center_x, center_y, label_rx, label_ry, mid_angle)
    bubble_point = to_polar_point(center_x, center_y, label_rx, label_ry, mid_angle - 3)

    area_id = f"r{ring_index + 1}s{sector_index + 1}"
    label = get_section_label(ring_index, sector_index)
    price = get_area_price(ring_index, options)
    area_type = get_area_type(ring_index)
    bubble_step = max(3, sector_count // 6)
    show_bubble = ring_index <= 2 and sector_index % bubble_step == 0

    return {
        "id": area_id,
        "name": label,
        "type": area_type,
        "shapeType": "polygon",
        "points": build_polygon_points([p1, p2, p3, p4]),
        "labelX": label_point["x"],
        "labelY": label_point["y"],
        "price": price,
        "rowCount": 6 + ring_index * 4,
        "seatCount": 32 + ring_index * 12,
        "bubblePrice": price if show_bubble else None,
        "bubblePosition": {"x": bubble_point["x"], "y": bubble_point["y"]} if show_bubble else None,
        "disabled": False,
        "users": [],
    }


def parse_png_size(data):
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    width, height = struct.unpack(">II", data[16:24])
    return int(width), int(height)


def parse_gif_size(data):
    if len(data) < 10 or (not data.startswith(b"GIF87a") and not data.startswith(b"GIF89a")):
        return None
    width, height = struct.unpack("<HH", data[6:10])
    return int(width), int(height)


def parse_webp_size(data):
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    chunk = data[12:16]
    if chunk == b"VP8X" and len(data) >= 30:
        width = 1 + int.from_bytes(data[24:27], "little")
        height = 1 + int.from_bytes(data[27:30], "little")
        return int(width), int(height)
    if chunk == b"VP8 " and len(data) >= 30:
        start = data.find(b"\x9d\x01\x2a")
        if start != -1 and len(data) >= start + 7:
            width, height = struct.unpack("<HH", data[start + 3:start + 7])
            return int(width & 0x3FFF), int(height & 0x3FFF)
    if chunk == b"VP8L" and len(data) >= 25:
        bits = int.from_bytes(data[21:25], "little")
        width = (bits & 0x3FFF) + 1
        height = ((bits >> 14) & 0x3FFF) + 1
        return int(width), int(height)
    return None


def parse_jpeg_size(data):
    if len(data) < 4 or data[0] != 0xFF or data[1] != 0xD8:
        return None
    index = 2
    while index < len(data) - 9:
        if data[index] != 0xFF:
            index += 1
            continue
        marker = data[index + 1]
        if marker in [0xD8, 0xD9]:
            index += 2
            continue
        if marker == 0xDA:
            break
        if index + 4 > len(data):
            break
        segment_len = struct.unpack(">H", data[index + 2:index + 4])[0]
        if segment_len < 2:
            break
        if marker in [
            0xC0,
            0xC1,
            0xC2,
            0xC3,
            0xC5,
            0xC6,
            0xC7,
            0xC9,
            0xCA,
            0xCB,
            0xCD,
            0xCE,
            0xCF,
        ]:
            if index + 9 <= len(data):
                height = struct.unpack(">H", data[index + 5:index + 7])[0]
                width = struct.unpack(">H", data[index + 7:index + 9])[0]
                return int(width), int(height)
            break
        index += 2 + segment_len
    return None


def parse_image_size(data):
    for parser in [parse_png_size, parse_jpeg_size, parse_webp_size, parse_gif_size]:
        size = parser(data)
        if size:
            return size
    return None


def is_http_url(value):
    return isinstance(value, str) and value.startswith(("http://", "https://"))


def load_image_bytes(image_source):
    if is_http_url(image_source):
        resp = requests.get(image_source, timeout=20)
        resp.raise_for_status()
        return resp.content

    abs_path = os.path.abspath(image_source)
    with open(abs_path, "rb") as f:
        return f.read()


def probe_image_info(image_source):
    source = str(image_source).strip()
    if not source:
        raise ValueError("图片来源为空")

    data = load_image_bytes(source)
    image_size = parse_image_size(data)
    if not image_size:
        raise ValueError("无法识别图片尺寸，请使用 PNG/JPEG/WebP/GIF")

    width, height = image_size
    return {
        "source": source if is_http_url(source) else os.path.abspath(source).replace("\\", "/"),
        "width": width,
        "height": height,
    }


def parse_price_tiers(value):
    if value is None:
        return DEFAULT_SEAT_MAP_OPTIONS["priceTiers"]
    raw = str(value).strip()
    if not raw:
        return DEFAULT_SEAT_MAP_OPTIONS["priceTiers"]
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    tiers = []
    for p in parts:
        if re.fullmatch(r"\d+", p):
            tiers.append(int(p))
    return tiers or DEFAULT_SEAT_MAP_OPTIONS["priceTiers"]


def resolve_seat_map_options(custom_options=None):
    custom_options = custom_options or {}
    preset_key = custom_options.get("presetKey") or DEFAULT_SEAT_MAP_OPTIONS["presetKey"]
    preset_options = SEAT_MAP_PRESETS.get(preset_key, {})

    options = {**DEFAULT_SEAT_MAP_OPTIONS, **preset_options, **custom_options}
    options["presetKey"] = preset_key
    options["fallbackPresetKey"] = (
        custom_options.get("fallbackPresetKey")
        or options.get("fallbackPresetKey")
        or DEFAULT_SEAT_MAP_OPTIONS["fallbackPresetKey"]
    )

    if not options.get("priceTiers"):
        options["priceTiers"] = DEFAULT_SEAT_MAP_OPTIONS["priceTiers"]
    return options


def build_interactive_seat_map(image_info, custom_options=None):
    options = resolve_seat_map_options(custom_options)

    width = max(240, int(image_info.get("width", 620)))
    height = max(240, int(image_info.get("height", 570)))
    ring_count = int(clamp(int(options.get("ringCount", 4)), 2, 8))
    sector_count = int(clamp(int(options.get("sectorCount", 24)), 8, 64))
    start_angle = float(options.get("startAngle", -160))
    end_angle = float(options.get("endAngle", 160))
    total_angle = clamp(end_angle - start_angle, 120, 355)

    center_x = width / 2
    center_y = height * clamp(float(options.get("stageCenterYRatio", 0.57)), 0.42, 0.74)

    stage_rx = width * clamp(float(options.get("stageRxRatio", 0.1)), 0.06, 0.2)
    stage_ry = height * clamp(float(options.get("stageRyRatio", 0.075)), 0.05, 0.16)

    boundary_rx = width * clamp(float(options.get("boundaryRxRatio", 0.47)), 0.2, 0.5)
    boundary_ry = height * clamp(float(options.get("boundaryRyRatio", 0.43)), 0.2, 0.48)
    inner_start_ratio = 0.22
    ring_range_ratio = 0.73
    ring_gap_ratio = clamp(float(options.get("ringGapRatio", 0.014)), 0, 0.05)
    ring_width_ratio = ring_range_ratio / ring_count
    step_angle = total_angle / sector_count
    angle_gap = clamp(float(options.get("angleGapDegree", 1.2)), 0, 5)

    areas = []
    for ring_index in range(ring_count):
        ring_inner_ratio = inner_start_ratio + ring_width_ratio * ring_index
        ring_outer_ratio = inner_start_ratio + ring_width_ratio * (ring_index + 1) - ring_gap_ratio

        inner_rx = boundary_rx * ring_inner_ratio
        inner_ry = boundary_ry * ring_inner_ratio
        outer_rx = boundary_rx * ring_outer_ratio
        outer_ry = boundary_ry * ring_outer_ratio

        for sector_index in range(sector_count):
            areas.append(
                create_area(
                    ring_index=ring_index,
                    sector_index=sector_index,
                    sector_count=sector_count,
                    start_angle=start_angle,
                    step_angle=step_angle,
                    angle_gap=angle_gap,
                    inner_rx=inner_rx,
                    inner_ry=inner_ry,
                    outer_rx=outer_rx,
                    outer_ry=outer_ry,
                    center_x=center_x,
                    center_y=center_y,
                    options=options,
                )
            )

    return {
        "version": "auto-v2",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceImage": image_info["source"],
        "overlayOpacity": clamp(float(options.get("overlayOpacity", 0.42)), 0.08, 1),
        "width": width,
        "height": height,
        "viewBox": f"0 0 {to_fixed_point(width)} {to_fixed_point(height)}",
        "stage": {
            "cx": to_fixed_point(center_x),
            "cy": to_fixed_point(center_y),
            "rx": to_fixed_point(stage_rx),
            "ry": to_fixed_point(stage_ry),
            "label": "舞台",
        },
        "boundary": {
            "cx": to_fixed_point(center_x),
            "cy": to_fixed_point(center_y),
            "rx": to_fixed_point(boundary_rx),
            "ry": to_fixed_point(boundary_ry),
        },
        "areas": areas,
        "options": options,
    }


def parse_points(points):
    if not isinstance(points, str):
        return []
    results = []
    for pair in points.strip().split():
        parts = pair.split(",")
        if len(parts) != 2:
            continue
        try:
            x = float(parts[0])
            y = float(parts[1])
            results.append({"x": x, "y": y})
        except Exception:
            continue
    return results


def area_bbox(area):
    if not isinstance(area, dict):
        return None

    if area.get("shapeType") == "rect":
        x = float(area.get("x", 0))
        y = float(area.get("y", 0))
        w = float(area.get("width", 0))
        h = float(area.get("height", 0))
        return {"minX": x, "minY": y, "maxX": x + w, "maxY": y + h}

    points = parse_points(area.get("points", ""))
    if not points:
        return None

    xs = [p["x"] for p in points]
    ys = [p["y"] for p in points]
    return {"minX": min(xs), "minY": min(ys), "maxX": max(xs), "maxY": max(ys)}


def bbox_overlap_ratio(box1, box2):
    if not box1 or not box2:
        return 0
    x1 = max(box1["minX"], box2["minX"])
    y1 = max(box1["minY"], box2["minY"])
    x2 = min(box1["maxX"], box2["maxX"])
    y2 = min(box1["maxY"], box2["maxY"])
    w = x2 - x1
    h = y2 - y1
    if w <= 0 or h <= 0:
        return 0

    overlap = w * h
    area1 = max(1, (box1["maxX"] - box1["minX"]) * (box1["maxY"] - box1["minY"]))
    area2 = max(1, (box2["maxX"] - box2["minX"]) * (box2["maxY"] - box2["minY"]))
    return overlap / min(area1, area2)


def validate_interactive_seat_map_quality(seat_map, options=None):
    options = resolve_seat_map_options(options or seat_map.get("options", {}))
    min_quality_score = int(options.get("minQualityScore", DEFAULT_SEAT_MAP_OPTIONS["minQualityScore"]))

    warnings = []
    fatals = []
    score = 100

    areas = seat_map.get("areas", []) if isinstance(seat_map, dict) else []
    width = float(seat_map.get("width", 0)) if isinstance(seat_map, dict) else 0
    height = float(seat_map.get("height", 0)) if isinstance(seat_map, dict) else 0

    if width < 240 or height < 240:
        fatals.append("底图尺寸异常")
        score -= 35

    expected_area_count = int(options.get("ringCount", 4)) * int(options.get("sectorCount", 24))
    if not areas:
        fatals.append("未生成有效分区")
        score -= 45
    else:
        ratio = len(areas) / max(1, expected_area_count)
        if ratio < 0.75:
            warnings.append("分区数量明显少于预期")
            score -= 15

    invalid_shape_count = 0
    label_out_count = 0
    boxes = []
    for area in areas:
        if not isinstance(area, dict) or (not area.get("points") and area.get("shapeType") != "rect"):
            invalid_shape_count += 1
        try:
            lx = float(area.get("labelX"))
            ly = float(area.get("labelY"))
            if lx < 0 or lx > width or ly < 0 or ly > height:
                label_out_count += 1
        except Exception:
            label_out_count += 1
        boxes.append(area_bbox(area))

    if invalid_shape_count > 0:
        fatals.append(f"存在 {invalid_shape_count} 个无效分区形状")
        score -= min(35, invalid_shape_count * 4)

    if label_out_count > 0:
        warnings.append(f"存在 {label_out_count} 个分区标签超出范围")
        score -= min(20, label_out_count * 2)

    stage = seat_map.get("stage", {}) if isinstance(seat_map, dict) else {}
    boundary = seat_map.get("boundary", {}) if isinstance(seat_map, dict) else {}
    stage_outside = (
        float(stage.get("cx", 0)) - float(stage.get("rx", 0))
        < float(boundary.get("cx", 0)) - float(boundary.get("rx", 0))
        or float(stage.get("cx", 0)) + float(stage.get("rx", 0))
        > float(boundary.get("cx", 0)) + float(boundary.get("rx", 0))
        or float(stage.get("cy", 0)) - float(stage.get("ry", 0))
        < float(boundary.get("cy", 0)) - float(boundary.get("ry", 0))
        or float(stage.get("cy", 0)) + float(stage.get("ry", 0))
        > float(boundary.get("cy", 0)) + float(boundary.get("ry", 0))
    )
    if stage_outside:
        fatals.append("舞台区域超出看台边界")
        score -= 25

    overlap_high_count = 0
    max_pair_checks = min(420, len(areas) * len(areas))
    checked = 0
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            if checked > max_pair_checks:
                break
            checked += 1
            if bbox_overlap_ratio(boxes[i], boxes[j]) > 0.42:
                overlap_high_count += 1
        if checked > max_pair_checks:
            break
    if overlap_high_count > 0:
        warnings.append(f"检测到 {overlap_high_count} 处分区重叠偏高")
        score -= min(18, overlap_high_count * 2)

    ring_prices = {}
    for area in areas:
        area_id = str(area.get("id", ""))
        m = re.match(r"^r(\d+)s\d+$", area_id)
        if not m:
            continue
        ring = int(m.group(1))
        ring_prices.setdefault(ring, []).append(float(area.get("price", 0) or 0))

    ring_avg = []
    for ring in sorted(ring_prices.keys()):
        vals = [x for x in ring_prices[ring] if x > 0]
        if vals:
            ring_avg.append(sum(vals) / len(vals))
    price_order_issues = 0
    for idx in range(1, len(ring_avg)):
        if ring_avg[idx] > ring_avg[idx - 1]:
            price_order_issues += 1
    if price_order_issues > 0:
        warnings.append("票价层级存在反向升高")
        score -= min(12, price_order_issues * 4)

    score = int(clamp(round(score), 0, 100))
    ok = len(fatals) == 0 and score >= min_quality_score

    return {
        "ok": ok,
        "score": score,
        "warnings": warnings,
        "fatals": fatals,
        "metrics": {
            "areaCount": len(areas),
            "expectedAreaCount": expected_area_count,
            "invalidShapeCount": invalid_shape_count,
            "labelOutCount": label_out_count,
            "overlapHighCount": overlap_high_count,
            "priceOrderIssues": price_order_issues,
        },
    }


def generate_interactive_seat_map_with_guard(image_info, options):
    options = resolve_seat_map_options(options)
    seat_map = build_interactive_seat_map(image_info, options)
    quality = validate_interactive_seat_map_quality(seat_map, options)
    if quality.get("ok"):
        return {
            "seatMap": seat_map,
            "quality": quality,
            "usedFallback": False,
            "finalOptions": options,
        }

    fallback_key = options.get("fallbackPresetKey", DEFAULT_SEAT_MAP_OPTIONS["fallbackPresetKey"])
    fallback_options = resolve_seat_map_options({**options, "presetKey": fallback_key})
    fallback_map = build_interactive_seat_map(image_info, fallback_options)
    fallback_quality = validate_interactive_seat_map_quality(fallback_map, fallback_options)
    return {
        "seatMap": fallback_map,
        "quality": fallback_quality,
        "usedFallback": True,
        "fallbackPresetKey": fallback_key,
        "originalQuality": quality,
        "finalOptions": fallback_options,
    }


def build_seat_map_options_from_args(args):
    price_tiers = parse_price_tiers(args.seat_map_price_tiers)
    if not args.seat_map_price_tiers:
        price_tiers = None
    return {
        "presetKey": args.seat_map_preset,
        "fallbackPresetKey": args.seat_map_fallback_preset,
        "minQualityScore": args.seat_map_min_quality_score,
        "ringCount": args.seat_map_ring_count,
        "sectorCount": args.seat_map_sector_count,
        "startAngle": args.seat_map_start_angle,
        "endAngle": args.seat_map_end_angle,
        "overlayOpacity": args.seat_map_overlay_opacity,
        "stageCenterYRatio": args.seat_map_stage_center_y_ratio,
        "stageRxRatio": args.seat_map_stage_rx_ratio,
        "stageRyRatio": args.seat_map_stage_ry_ratio,
        "boundaryRxRatio": args.seat_map_boundary_rx_ratio,
        "boundaryRyRatio": args.seat_map_boundary_ry_ratio,
        "priceTiers": price_tiers,
    }


def run_interactive_map_generation(image_source, output_path, options):
    image_info = probe_image_info(image_source)
    result = generate_interactive_seat_map_with_guard(image_info, options)
    seat_map = result.get("seatMap", {})
    seat_map["qualityReport"] = result.get("quality", {})
    seat_map["usedFallback"] = result.get("usedFallback", False)
    if result.get("usedFallback"):
        seat_map["fallbackPresetKey"] = result.get("fallbackPresetKey", "")
        seat_map["originalQuality"] = result.get("originalQuality", {})
    seat_map["finalOptions"] = result.get("finalOptions", {})
    save_json(seat_map, output_path)
    print(f"交互座位图已生成：{output_path}")
    print(f"图片尺寸：{image_info['width']} x {image_info['height']}")
    print(f"分区数量：{len(seat_map.get('areas', []))}")
    qr = seat_map.get("qualityReport", {})
    print(f"质量评分：{qr.get('score', 0)} ({'通过' if qr.get('ok') else '待优化'})")
    if seat_map.get("usedFallback"):
        print(f"已启用回退模板：{seat_map.get('fallbackPresetKey', '')}")
    return seat_map


def main():
    parser = argparse.ArgumentParser(description="猫眼演唱会抓取（my4.py）并导出标准化 JSON")
    parser.add_argument("--stars", nargs="+", default=["张远"], help="艺人关键字，可传多个")
    parser.add_argument("--output", default="data/maoyan_concerts.json", help="输出 JSON 文件路径")
    parser.add_argument("--keep-browser", action="store_true", help="抓取后不关闭浏览器（便于调试）")

    parser.add_argument("--damai-seat-link", default="", help="大麦演出链接，提取 itemId 抓座位图")
    parser.add_argument("--damai-seat-item-id", default="", help="大麦 itemId，抓座位图")
    parser.add_argument("--damai-seat-output", default="data/damai_seat_map.json", help="座位图输出 JSON 文件")
    parser.add_argument("--damai-seat-download-dir", default="", help="可选：下载座位图到本地目录")
    parser.add_argument("--auto-generate-seat-map", action="store_true", help="抓到座位图后自动生成交互座位图")
    parser.add_argument("--seat-map-image-index", type=int, default=0, help="自动生成时使用第几张座位图（从 0 开始）")
    parser.add_argument("--seat-image-input", default="", help="本地图片路径或图片 URL，直接生成交互座位图")
    parser.add_argument("--seat-map-output", default="data/interactive_seat_map.json", help="交互座位图 JSON 输出路径")
    parser.add_argument("--seat-map-preset", default="arena_end", choices=list(SEAT_MAP_PRESETS.keys()), help="交互座位图场景模板")
    parser.add_argument("--seat-map-fallback-preset", default="arena_end", choices=list(SEAT_MAP_PRESETS.keys()), help="质量不达标时的回退模板")
    parser.add_argument("--seat-map-min-quality-score", type=int, default=72, help="最小质量评分阈值")
    parser.add_argument("--seat-map-ring-count", type=int, default=4, help="交互座位图环数")
    parser.add_argument("--seat-map-sector-count", type=int, default=24, help="每环扇区数量")
    parser.add_argument("--seat-map-start-angle", type=float, default=-160, help="起始角度")
    parser.add_argument("--seat-map-end-angle", type=float, default=160, help="结束角度")
    parser.add_argument("--seat-map-overlay-opacity", type=float, default=0.42, help="背景图透明度")
    parser.add_argument("--seat-map-stage-center-y-ratio", type=float, default=0.57, help="舞台中心纵向比例")
    parser.add_argument("--seat-map-stage-rx-ratio", type=float, default=0.1, help="舞台横向半径比例")
    parser.add_argument("--seat-map-stage-ry-ratio", type=float, default=0.075, help="舞台纵向半径比例")
    parser.add_argument("--seat-map-boundary-rx-ratio", type=float, default=0.47, help="看台边界横向比例")
    parser.add_argument("--seat-map-boundary-ry-ratio", type=float, default=0.43, help="看台边界纵向比例")
    parser.add_argument("--seat-map-price-tiers", default="", help="票价档位，逗号分隔；不传则使用模板默认")
    parser.add_argument("--with-maoyan", action="store_true", help="座位图模式下同时执行猫眼抓取")

    args = parser.parse_args()
    seat_map_options = build_seat_map_options_from_args(args)

    if args.seat_image_input:
        try:
            run_interactive_map_generation(
                image_source=args.seat_image_input,
                output_path=args.seat_map_output,
                options=seat_map_options,
            )
        except Exception as exc:
            payload = {
                "ok": False,
                "error": f"交互座位图生成失败: {exc}",
                "input": args.seat_image_input,
            }
            save_json(payload, args.seat_map_output)
            print(payload["error"])
            if not args.with_maoyan:
                return

        if not (args.damai_seat_link or args.damai_seat_item_id) and not args.with_maoyan:
            return

    seat_mode = bool(args.damai_seat_link or args.damai_seat_item_id)
    if seat_mode:
        source_val = args.damai_seat_item_id or args.damai_seat_link
        item_id = extract_item_id(source_val)

        if not item_id:
            payload = {
                "ok": False,
                "error": "未能从输入中解析出合法 itemId",
                "input": source_val,
            }
            save_json(payload, args.damai_seat_output)
            print("座位图抓取失败：itemId 无效")
            return

        seat_payload = fetch_damai_seat_map(item_id, args.damai_seat_link)

        if seat_payload.get("ok") and args.damai_seat_download_dir:
            downloaded = download_seat_images(
                seat_payload.get("seatImages", []),
                args.damai_seat_download_dir,
                item_id,
            )
            seat_payload["downloadedImages"] = downloaded
            seat_payload["downloadedCount"] = len([x for x in downloaded if x.get("file")])

        if seat_payload.get("ok") and args.auto_generate_seat_map:
            seat_images = seat_payload.get("seatImages", [])
            idx = args.seat_map_image_index
            if seat_images and 0 <= idx < len(seat_images):
                try:
                    generated_map = run_interactive_map_generation(
                        image_source=seat_images[idx],
                        output_path=args.seat_map_output,
                        options=seat_map_options,
                    )
                    seat_payload["interactiveSeatMapFile"] = args.seat_map_output
                    seat_payload["interactiveSeatMapSource"] = seat_images[idx]
                    seat_payload["interactiveSeatMapQuality"] = generated_map.get("qualityReport", {})
                    seat_payload["interactiveSeatMapUsedFallback"] = generated_map.get("usedFallback", False)
                    seat_payload["interactiveSeatMapFallbackPreset"] = generated_map.get("fallbackPresetKey", "")
                except Exception as exc:
                    seat_payload["interactiveSeatMapError"] = str(exc)
            else:
                seat_payload["interactiveSeatMapError"] = "未找到可用座位图图片用于自动生成"

        save_json(seat_payload, args.damai_seat_output)
        if seat_payload.get("ok"):
            print(f"座位图抓取成功：{seat_payload.get('seatImageCount', 0)} 张")
            if args.damai_seat_download_dir:
                print(
                    f"座位图下载完成：{seat_payload.get('downloadedCount', 0)} 张 -> "
                    f"{args.damai_seat_download_dir}"
                )
            if args.auto_generate_seat_map:
                if seat_payload.get("interactiveSeatMapFile"):
                    print(f"交互座位图自动生成成功：{seat_payload.get('interactiveSeatMapFile')}")
                elif seat_payload.get("interactiveSeatMapError"):
                    print(f"交互座位图自动生成失败：{seat_payload.get('interactiveSeatMapError')}")
        else:
            print(f"座位图抓取失败：{seat_payload.get('error', '未知错误')}")

        if not args.with_maoyan:
            return

    all_concerts = []
    for star in args.stars:
        try:
            all_concerts.extend(
                scrape_search_results(star, close_browser=not args.keep_browser)
            )
        except Exception as exc:
            print(f"[{star}] 抓取失败: {exc}")

    all_concerts = dedupe_concerts(all_concerts)
    save_concerts_to_json(all_concerts, args.output)


if __name__ == "__main__":
    main()
