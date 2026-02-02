# 演唱会回流票监控程序


一开始我兼职干活这个行业，发现顾客有这个需求，比如大家都传谁演唱会要开，就会搜索，关于演唱会监控，希望实时知道那些票会漏，以及一开二开，比如，票务希望知道，明日可以抢些什么

所以萌生写一个这样的程序，之前由于一个代码编写有点工作量大，但是现在有ai，就事半功倍

大致前端页面如下

<div align="center">
  <img src="https://cdn.nlark.com/yuque/0/2026/png/27336549/1770023773593-319a342b-bc9e-4431-81cd-e9a7ec7ea145.png" width="30%" />
  <img src="https://cdn.nlark.com/yuque/0/2026/png/27336549/1770023800845-983d4344-2cf9-4c57-bd6e-851027401289.png" width="30%" />
  <img src="https://cdn.nlark.com/yuque/0/2026/png/27336549/1770023837335-98a29a46-a133-45f0-8c2b-cd99e3db398a.png" width="30%" />
</div>

后端数据方面如

### 📊 数据接口参考

<details>
<summary>点击查看：猫眼数据获取详情</summary>
<br>
<img src="https://cdn.nlark.com/yuque/0/2026/png/27336549/1770023950207-ecca6bd7-e807-4834-9f3d-a760ac5113fa.png" width="600" />
</details>

<details>
<summary>点击查看：大麦数据获取详情 (需 Cookie)</summary>
<br>
<img src="https://cdn.nlark.com/yuque/0/2026/png/27336549/1770024031941-555dc9e3-8277-466e-afb2-1dbf4dec71f6.png" width="600" />
</details>



因为还有网传演唱会这种，其实我想通过，获取文旅局（文化市场通）获取那些审批了但是还为上架平台的演唱会。



需要配置一下：

```plain
wx.cloud.init({
        env: '', // 替换为你的云开发环境ID
        traceUser: true,
      });
```

```plain
"appid": "",
    "projectname": "concert-miniprogram",
    "libVersion": "2.25.0",
```

前端代码就可以运行了

本项目在开发过程中参考了以下优秀开源项目：

数据接口借鉴：<a href="https://github.com/ThinkerWen/TicketMonitoring">ThinkerWen/TicketMonitoring（提供大麦、猫眼、纷玩岛、票星球监控思路）</a>

优化设想方案：<a href="https://github.com/JaveleyQAQ/WeChatOpenDevTools-Python">JaveleyQAQ/WeChatOpenDevTools-Python（通过强制开启微信小程序开发者工具，逆向分析接口，获取信息更加高效便捷）</a>

