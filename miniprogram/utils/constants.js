// constants.js - 常量定义

// 演唱会阶段
const STAGES = {
  RUMOR: '网传',
  LISTED: '上架',
  FIRST_OPEN: '一开',
  SECOND_OPEN: '二开',
  THIRD_OPEN: '三开',
  ENDED: '已结束'
};

// 阶段颜色映射
const STAGE_COLORS = {
  '网传': '#999999',
  '上架': '#3498db',
  '一开': '#e67e22',
  '二开': '#e74c3c',
  '三开': '#9b59b6',
  '已结束': '#7f8c8d'
};

// 阶段背景颜色（浅色）
const STAGE_BG_COLORS = {
  '网传': 'rgba(153, 153, 153, 0.1)',
  '上架': 'rgba(52, 152, 219, 0.1)',
  '一开': 'rgba(230, 126, 34, 0.1)',
  '二开': 'rgba(231, 76, 60, 0.1)',
  '三开': 'rgba(155, 89, 182, 0.1)',
  '已结束': 'rgba(127, 140, 141, 0.1)'
};

// 购票平台
const PLATFORMS = {
  damai: {
    name: '大麦',
    icon: '/images/platform-damai.png',
    color: '#FF5722'
  },
  maoyan: {
    name: '猫眼',
    icon: '/images/platform-maoyan.png',
    color: '#FF4081'
  },
  douyin: {
    name: '抖音',
    icon: '/images/platform-douyin.png',
    color: '#000000'
  },
  xiecheng: {
    name: '携程',
    icon: '/images/platform-xiecheng.png',
    color: '#2681FF'
  },
  piaoxingqiu: {
    name: '票星球',
    icon: '/images/platform-piaoxingqiu.png',
    color: '#6C5CE7'
  }
};

// 平台列表（按顺序）
const PLATFORM_LIST = ['damai', 'maoyan', 'douyin', 'xiecheng', 'piaoxingqiu'];

// 热门城市
const HOT_CITIES = [
  '全部', '北京', '上海', '广州', '深圳', '成都', '杭州', '南京', '武汉', '重庆', '西安', '长沙', '天津', '苏州', '郑州'
];

// 所有城市（按省份分组）
const CITIES_BY_PROVINCE = {
  '直辖市': ['北京', '上海', '天津', '重庆'],
  '广东': ['广州', '深圳', '东莞', '佛山', '珠海'],
  '江苏': ['南京', '苏州', '无锡', '常州'],
  '浙江': ['杭州', '宁波', '温州', '绍兴'],
  '四川': ['成都', '绵阳'],
  '湖北': ['武汉', '宜昌'],
  '湖南': ['长沙', '株洲'],
  '陕西': ['西安', '咸阳'],
  '山东': ['济南', '青岛', '烟台'],
  '河南': ['郑州', '洛阳'],
  '福建': ['福州', '厦门', '泉州'],
  '辽宁': ['沈阳', '大连'],
  '吉林': ['长春'],
  '黑龙江': ['哈尔滨'],
  '安徽': ['合肥'],
  '江西': ['南昌'],
  '广西': ['南宁', '桂林'],
  '海南': ['海口', '三亚'],
  '贵州': ['贵阳'],
  '云南': ['昆明', '大理'],
  '山西': ['太原'],
  '内蒙古': ['呼和浩特'],
  '新疆': ['乌鲁木齐'],
  '甘肃': ['兰州'],
  '宁夏': ['银川'],
  '青海': ['西宁'],
  '西藏': ['拉萨']
};

// 通知类型
const NOTIFICATION_TYPES = {
  STAGE_CHANGE: 'stage_change',
  OPEN_REMIND: 'open_remind',
  NEW_CONCERT: 'new_concert'
};

// 数据来源
const DATA_SOURCE = {
  MANUAL: 'manual',
  CRAWLER: 'crawler',
  USER: 'user'
};

// 分页设置
const PAGE_SIZE = 10;

module.exports = {
  STAGES,
  STAGE_COLORS,
  STAGE_BG_COLORS,
  PLATFORMS,
  PLATFORM_LIST,
  HOT_CITIES,
  CITIES_BY_PROVINCE,
  NOTIFICATION_TYPES,
  DATA_SOURCE,
  PAGE_SIZE
};
