import sqlite3
import json
import time
import hashlib
import requests
import re
import random
import logging
from datetime import datetime, timedelta, timezone

# --- 🛠️ 配置区域 ---

# 1. 填入你的最新 Cookie
MY_COOKIE =""

# --- 🛠️ 配置区域 ---

# 1. 填入你的最新 Cookie
MY_COOKIE = "这里填入你的Cookie"

# 2. 监听列表
WATCH_LIST = [
    "陶喆", "林俊杰", "周杰伦", "五月天",
    "陈奕迅", "邓紫棋", "薛之谦", "张学友"
]

# 3. 轮询间隔 (一轮查完后休息多久，单位：秒，建议 3600)
LOOP_INTERVAL = 3600

# 4. 阶段枚举 (严格限制)
STAGES_ENUM = ["网传", "上架", "一开", "二开", "三开"]

# --- 📝 日志配置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("monitor.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)


class DamaiMonitorUltimate:
    def __init__(self, cookie_str):
        self.app_key = '12574478'
        self.session = requests.Session()
        self.db_path = 'damai_full_data.db'

        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1 Edg/144.0.0.0',
            'Referer': 'https://m.damai.cn/shows/search.html',
            'Content-Type': 'application/x-www-form-urlencoded'
        })
        self.parse_cookie_str(cookie_str)
        self.init_db()

    def parse_cookie_str(self, cookie_str):
        if not cookie_str: return
        for item in cookie_str.split(';'):
            if '=' in item:
                k, v = item.strip().split('=', 1)
                self.session.cookies.set(k, v)

    # --- 💾 数据库操作 ---
    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        # 创建宽表，新增 artist 和 city 字段方便搜索
        c.execute('''CREATE TABLE IF NOT EXISTS concerts (
            id TEXT PRIMARY KEY,
            title TEXT,
            artist TEXT, 
            city TEXT,
            last_up_time INTEGER,
            stage TEXT,
            stage_history_json TEXT,
            full_json_data TEXT,
            update_time TEXT
        )''')
        conn.commit()
        conn.close()

    def get_saved_state(self, item_id):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute("SELECT last_up_time, stage, stage_history_json FROM concerts WHERE id=?", (str(item_id),))
        row = c.fetchone()
        conn.close()
        if row:
            return {
                "last_up_time": row[0],
                "stage": row[1],
                "history": json.loads(row[2])
            }
        return None

    def save_to_db(self, item_id, title, artist, city, up_time, stage, history, full_data):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()

        history_str = json.dumps(history, ensure_ascii=False)
        full_data_str = json.dumps(full_data, ensure_ascii=False)
        now_str = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 插入包含 artist 和 city 的新数据结构
        c.execute('''INSERT OR REPLACE INTO concerts 
                     (id, title, artist, city, last_up_time, stage, stage_history_json, full_json_data, update_time) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (str(item_id), title, artist, city, up_time, stage, history_str, full_data_str, now_str))
        conn.commit()
        conn.close()

    # --- 🧠 辅助逻辑 ---
    def get_next_stage(self, current_stage):
        """状态流转：上架 -> 一开 -> 二开 -> 三开"""
        try:
            idx = STAGES_ENUM.index(current_stage)
            if idx < len(STAGES_ENUM) - 1:
                return STAGES_ENUM[idx + 1]
        except ValueError:
            pass
        return "一开"  # 默认回退值

    def get_iso_time(self, timestamp_ms):
        """
        根据时间戳返回 ISO 时间字符串
        如果 timestamp_ms > 0，返回对应的时间（即开售时间）
        如果 timestamp_ms == 0，返回当前系统时间（即上架发现时间）
        """
        if timestamp_ms and timestamp_ms > 0:
            # 使用 UTC 时间转换
            dt = datetime.fromtimestamp(timestamp_ms / 1000.0, timezone.utc)
            return dt.isoformat().replace("+00:00", "Z")
        else:
            # 兜底：使用当前时间
            return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    def parse_dates(self, show_time_str):
        dates = []
        try:
            clean_str = re.sub(r'\s*周[一二三四五六日]', '', show_time_str).strip()
            year_match = re.match(r'(\d{4})', clean_str)
            if not year_match: return [clean_str]
            year = int(year_match.group(1))
            range_match = re.search(r'(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})', clean_str)
            if range_match:
                m1, d1, m2, d2 = map(int, range_match.groups())
                start_date = datetime(year, m1, d1)
                if m2 < m1: year += 1
                end_date = datetime(year, m2, d2)
                curr = start_date
                while curr <= end_date:
                    dates.append(curr.strftime("%Y-%m-%d"))
                    curr += timedelta(days=1)
                return dates
            single_match = re.search(r'(\d{4})\.(\d{1,2})\.(\d{1,2})', clean_str)
            if single_match:
                y, m, d = map(int, single_match.groups())
                dates.append(f"{y}-{m:02d}-{d:02d}")
                return dates
        except:
            pass
        return [show_time_str] if not dates else dates

    def get_sign(self, token, t, data):
        token_part = token.split('_')[0] if token else ''
        text = f"{token_part}&{t}&{self.app_key}&{data}"
        m = hashlib.md5()
        m.update(text.encode('utf-8'))
        return m.hexdigest()

    # --- 📡 核心扫描逻辑 ---
    def scan_artist(self, keyword):
        logging.info(f"🔎 正在扫描: {keyword}")
        api = 'mtop.damai.wireless.search.search'
        url = 'https://mtop.damai.cn/h5/mtop.damai.wireless.search.search/1.0/'

        for retry in range(2):
            t = str(int(time.time() * 1000))
            search_data = json.dumps({
                "cityId": 0, "pageIndex": 1, "pageSize": 20, "keyword": keyword,
                "sourceType": 11, "returnItemOption": 4, "option": 434, "dmChannel": "damai@damaih5_h5"
            }, separators=(',', ':'))

            token = self.session.cookies.get('_m_h5_tk', '')
            sign = self.get_sign(token, t, search_data)

            try:
                resp = self.session.get(url, params={
                    'jsv': '2.7.5', 'appKey': self.app_key, 't': t, 'sign': sign,
                    'api': api, 'v': '1.0', 'type': 'originaljson', 'data': search_data
                }, verify=False, timeout=5)

                res_json = resp.json()
                ret_msg = res_json.get('ret', [''])[0]

                if "SUCCESS" in ret_msg:
                    self.process_data(res_json, keyword)
                    return
                elif "TOKEN" in ret_msg:
                    logging.warning(f"🔄 Token过期，自动刷新中... ({retry + 1}/2)")
                    continue
                else:
                    logging.error(f"❌ 接口报错 [{keyword}]: {ret_msg}")
                    return
            except Exception as e:
                logging.error(f"❌ 网络异常 [{keyword}]: {e}")
                time.sleep(2)
                continue

        logging.warning(f"⚠️ [{keyword}] 扫描失败，跳过。")

    def process_data(self, data, keyword):
        server_time = data.get('data', {}).get('currentTime', int(time.time() * 1000))
        projects = data.get('data', {}).get('projectInfo', [])

        updated_count = 0

        for item in projects:
            if item.get('categoryName') != "演唱会": continue
            updated_count += 1

            item_id = str(item.get('id'))
            title = item.get('name')

            # 获取新添加的字段：歌手和城市
            artist_name = item.get('actores', keyword)
            city_name = item.get('cityName', '未知')

            new_up_time = item.get('upTime', 0)
            status_tag = item.get('projectStatusTag', 'NORMAL')

            # --- 🔥 状态判定核心逻辑 🔥 ---
            saved_state = self.get_saved_state(item_id)
            current_stage = "上架"
            history = []

            # 计算本次状态对应的 History Time (优先使用 upTime)
            history_time_str = self.get_iso_time(new_up_time)

            if not saved_state:
                # [新项目]
                # 如果没时间，用当前时间作为上架时间；如果有时间，用upTime
                history.append({"stage": "上架", "time": history_time_str})

                if new_up_time > 0:
                    if new_up_time > server_time or status_tag in ['SELL_OUT', 'CAN_BUY']:
                        current_stage = "一开"
                        # 这里覆盖之前的记录，或者追加，通常初始化只留最新状态即可
                        # 为保持简洁，这里只保留一开状态
                        history = [{"stage": "一开", "time": history_time_str}]
                    else:
                        current_stage = "上架"
                logging.info(f"🆕 发现新项目: {title} | 初始状态: {current_stage}")

            else:
                # [老项目]
                last_up_time = saved_state['last_up_time']
                current_stage = saved_state['stage']
                history = saved_state['history']

                # 检测开售时间变化 (从上架->一开，或 一开->二开)
                if new_up_time > last_up_time and new_up_time > 0:
                    new_stage = self.get_next_stage(current_stage)
                    logging.info(f"🚀 监测到 [{title}] 进阶: {current_stage} -> {new_stage} (时间: {history_time_str})")
                    current_stage = new_stage

                    # 追加新的历史记录
                    history.append({
                        "stage": new_stage,
                        "time": history_time_str
                    })

            # --- 构造详细 JSON ---
            sale_time_str = ""
            if new_up_time:
                sale_dt = datetime.fromtimestamp(new_up_time / 1000.0)
                sale_time_str = sale_dt.strftime('%Y-%m-%d %H:%M')

            platforms_obj = {
                "damai": {
                    "available": True,
                    "url": f"https://m.damai.cn/damai/detail/item.html?itemId={item_id}",
                    "openTime": sale_time_str
                },
                "maoyan": {"available": False, "url": "", "openTime": ""},
                "douyin": {"available": False, "url": "", "openTime": ""},
                "xiecheng": {"available": False, "url": "", "openTime": ""},
                "piaoxingqiu": {"available": False, "url": "", "openTime": ""}
            }

            final_obj = {
                "title": title,
                "artist": artist_name,
                "artistId": f"{keyword}",
                "city": city_name,
                "venue": item.get('venueName'),
                "province": city_name,  # 大麦数据通常省份即城市
                "dates": self.parse_dates(item.get('showTime', '')),
                "stage": current_stage,
                "stageHistory": history,
                "platforms": platforms_obj,
                "priceRange": item.get('priceStr', '待定'),
                "poster": item.get('verticalPic', ''),
                "status": "published",
                "source": "manual",
                "verified": True,
                "subscribeCount": item.get('ipvuv', 0),
                "createTime": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "updateTime": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }

            # 存入数据库 (传入新增的 artist 和 city)
            self.save_to_db(item_id, title, artist_name, city_name, new_up_time, current_stage, history, final_obj)

        if updated_count > 0:
            logging.info(f"✅ [{keyword}] 数据处理完成，更新 {updated_count} 条记录")


# --- 🚀 主程序入口 ---
if __name__ == "__main__":
    import urllib3

    urllib3.disable_warnings()

    print("🤖 大麦演唱会全天候监听系统 (Ultimate版) 已启动...")
    print(f"📋 监听列表: {WATCH_LIST}")
    print(f"⏱️ 轮询间隔: {LOOP_INTERVAL} 秒")
    print("⚠️  提示: 若之前运行过旧版脚本，请删除 'damai_full_data.db' 以便重建数据库结构。")

    monitor = DamaiMonitorUltimate(MY_COOKIE)

    while True:
        start_time = time.time()
        print("\n" + "=" * 40)
        logging.info("开始新一轮全量扫描...")

        for artist in WATCH_LIST:
            monitor.scan_artist(artist)
            sleep_time = random.randint(5, 12)
            logging.info(f"😴 休息 {sleep_time} 秒...")
            time.sleep(sleep_time)

        logging.info("本轮扫描结束。")
        elapsed = time.time() - start_time
        wait_time = max(0, LOOP_INTERVAL - elapsed)
        print(f"⏳ 正在等待下一轮 (约 {int(wait_time / 60)} 分钟)...")
        time.sleep(wait_time)