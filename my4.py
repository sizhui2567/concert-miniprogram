from DrissionPage import ChromiumPage
import json


def scrape_search_results(star_name):
    # 初始化浏览器
    page = ChromiumPage()

    try:
        url = 'https://show.maoyan.com/myshowfe/trade/SearchByIndex?_blank=true&utm_source=wxmyshow&fromTag=wxmyshow'
        page.get(url)

        # 1. 定位搜索框并输入
        # 根据你提供的HTML，使用 id 或 placeholder 定位
        search_input = page.ele('#van-search-1-input')
        if not search_input:
            search_input = page.ele('@placeholder=找明星、演出、场馆')

        if search_input:
            print(f"正在搜索: {star_name}")
            search_input.input(star_name)
            search_input.input('\n')
            # 给页面一点渲染时间
            page.wait(1)
        else:
            print("未能定位到输入框")
            return

        # 2. 获取所有演出卡片
        # class="recommend-show" 是每一行演出的容器
        items = page.eles('.recommend-show')

        print(f"\n找到 {len(items)} 条相关结果：")
        print("-" * 80)

        for item in items:
            full_name = item.ele('.name').text

            # --- 筛选逻辑：名字里带有“演唱会” ---
            if '演唱会' not in full_name:
                continue
            # 策略：从 lx-mv 属性中提取 ID (这是最稳的，因为 HTML 里直接写了)

            lx_mv_data = item.attr('lx-mv')
            p_id = "未知"
            if lx_mv_data:
                try:
                    # 解析属性里的 JSON 提取 custom -> id
                    attr_json = json.loads(lx_mv_data)
                    p_id = attr_json.get('lab', {}).get('custom', {}).get('id')
                except:
                    pass

            # 提取名称、时间、地点、价格
            name = item.ele('.name').text
            show_time = item.ele('.time').text
            address = item.ele('.addr').text
            price = item.ele('.lower-price').text if item.ele('.lower-price') else "暂无"

            print(f"【ID: {p_id}】")
            print(f"  名称: {name}")
            print(f"  时间: {show_time}")
            print(f"  地点: {address}")
            print(f"  价格: ￥{price} 起")
            print("-" * 80)

    finally:
        # 如果需要手动观察，可以注释掉下面这行
        # page.quit()
        pass


if __name__ == '__main__':
    scrape_search_results("张远")