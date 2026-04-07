/**
 * 票牛网站座位图数据
 * 来源：https://m.piaoxiao2.com/pages/select-ticket/select-ticket?showId=a909a41a5588b30001e5f38d
 * 场馆：梅赛德斯奔驰文化中心（示例场馆）
 */

const SEAT_MAP_DATA = {
  // SVG 视口
  viewBox: '0 0 620 570',
  width: 620,
  height: 570,
  
  // 场馆信息
  venue: {
    name: '梅赛德斯奔驰文化中心',
    city: '上海',
    address: '上海市浦东新区世博大道1200号',
    capacity: 18000
  },
  
  // 舞台位置
  stage: {
    cx: 310,
    cy: 280,
    rx: 80,
    ry: 40,
    label: '舞台'
  },
  
  // 场馆边界
  boundary: {
    cx: 310,
    cy: 280,
    rx: 300,
    ry: 270
  },
  
  // 区域数据（精简版，包含主要区域）
  areas: [
    // VIP 区域
    {
      id: 'vip1',
      name: 'VIP1区',
      type: 'vip',
      shape: 'polygon',
      points: '364.8,213.1 296.5,213.1 296.5,288.4 328.8,288.4 339.8,296.1 364.8,252.4',
      labelX: 330,
      labelY: 250,
      price: 3280,
      rowCount: 20,
      seatCount: 500,
      disabled: false,
      bubble: { price: 3067 }
    },
    {
      id: 'vip2',
      name: 'VIP2区',
      type: 'vip',
      shape: 'polygon',
      points: '318.8,358 364.8,358 364.8,324.8 360.2,324.8 360.2,328.1 355.9,328.1 355.9,331.8 318.8,331.8',
      labelX: 342,
      labelY: 345,
      price: 3280,
      rowCount: 20,
      seatCount: 500,
      disabled: false,
      bubble: { price: 5289 }
    },
    {
      id: 'vip3',
      name: 'VIP3区',
      type: 'vip',
      shape: 'rect',
      x: 235.8,
      y: 213.1,
      width: 53.4,
      height: 67.7,
      labelX: 262,
      labelY: 247,
      price: 3280,
      rowCount: 20,
      seatCount: 500,
      disabled: false,
      bubble: { price: 3385 }
    },
    {
      id: 'vip4',
      name: 'VIP4区',
      type: 'vip',
      shape: 'rect',
      x: 235.8,
      y: 291.5,
      width: 53.4,
      height: 67.7,
      labelX: 262,
      labelY: 325,
      price: 3280,
      rowCount: 20,
      seatCount: 500,
      disabled: false,
      bubble: { price: 3702 }
    },
    
    // 贵宾区域
    {
      id: 'premium1',
      name: '贵宾1区',
      type: 'premium',
      shape: 'rect',
      x: 189.3,
      y: 212.4,
      width: 38.2,
      height: 50.5,
      labelX: 208,
      labelY: 237,
      price: 2280,
      rowCount: 15,
      seatCount: 300,
      disabled: false,
      bubble: { price: 1893 }
    },
    {
      id: 'premium2',
      name: '贵宾2区',
      type: 'premium',
      shape: 'rect',
      x: 189.3,
      y: 307.5,
      width: 38.2,
      height: 50.5,
      labelX: 208,
      labelY: 332,
      price: 2280,
      rowCount: 15,
      seatCount: 300,
      disabled: false,
      bubble: { price: 1957 }
    },
    
    // 看台区域示例（101-140区部分）
    {
      id: 'a101',
      name: '101区',
      type: 'standard',
      shape: 'path',
      path: 'M174.6,141.4c-8.2,3.4-16,7.2-23.1,11.5c-1,0.6-1.9,1.1-2.9,1.7l19.5,28.1c1.7-1,3.4-2,5.1-2.9c4.8-2.6,9.9-5,15.1-7.2L174.6,141.4z',
      labelX: 165,
      labelY: 155,
      price: 680,
      rowCount: 20,
      seatCount: 500,
      disabled: false
    },
    {
      id: 'a102',
      name: '102区',
      type: 'standard',
      shape: 'path',
      path: 'M210.8,152.3l-5.2-21.2c-9.6,2.5-18.7,5.4-27.2,8.8l8.5,19.6l5.2,11.6c6.9-2.7,14.2-5,21.7-7.1L210.8,152.3z',
      labelX: 200,
      labelY: 160,
      price: 680,
      rowCount: 20,
      seatCount: 500,
      disabled: false
    },
    {
      id: 'a125',
      name: '125区',
      type: 'standard',
      shape: 'path',
      path: 'M313.2,449.3c10.7,0,21.3-0.1,31.8-0.5l-2.6-33c-9.6,0.3-19.5,0.5-29.4,0.5L313.2,449.3z',
      labelX: 328,
      labelY: 435,
      price: 680,
      rowCount: 20,
      seatCount: 500,
      disabled: false,
      bubble: { price: 2433 }
    },
    {
      id: 'a126',
      name: '126区',
      type: 'standard',
      shape: 'path',
      path: 'M277.3,449c10.4,0.3,21,0.3,31.8,0.3l-0.2-32.9c-10.2,0-19.9,0-29.4-0.3L277.3,449z',
      labelX: 293,
      labelY: 435,
      price: 680,
      rowCount: 20,
      seatCount: 500,
      disabled: false
    }
  ]
};

// 转换为云数据库存储格式
function convertToVenueAreas(seatMapData) {
  return seatMapData.areas.map(area => ({
    name: area.name,
    type: area.type,
    shape: area.shape,
    shapeData: {
      points: area.points,
      path: area.path,
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height
    },
    labelPosition: {
      x: area.labelX,
      y: area.labelY
    },
    price: area.price,
    rowCount: area.rowCount,
    seatCount: area.seatCount,
    disabled: area.disabled,
    bubblePrice: area.bubble ? area.bubble.price : null,
    viewBox: seatMapData.viewBox,
    stage: seatMapData.stage,
    boundary: seatMapData.boundary
  }));
}

module.exports = {
  SEAT_MAP_DATA,
  convertToVenueAreas
};
