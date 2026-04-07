# 界面优化说明 - 浮动卡片设计

## 🎨 优化概述

本次界面优化专注于提升**浮动卡片**的视觉表现和交互体验，参考现代 UI 设计趋势，让演唱会卡片更加精美、有层次感。

---

## ✨ 核心优化点

### 1. 卡片立体感增强

#### 原设计
```css
box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
```

#### 优化后
```css
box-shadow: 
  0 8rpx 24rpx rgba(0, 0, 0, 0.06),    /* 主阴影 */
  0 2rpx 8rpx rgba(0, 0, 0, 0.04),     /* 辅助阴影 */
  inset 0 1rpx 0 rgba(255, 255, 255, 0.8);  /* 顶部高光 */
border: 1rpx solid rgba(0, 0, 0, 0.04);
```

**效果**：多层阴影营造更自然的立体感，内阴影增加卡片厚度感

---

### 2. 微交互动画

#### 按压效果
```css
.concert-card-horizontal {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.concert-card-horizontal:active {
  transform: translateY(4rpx) scale(0.99);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.04);
}
```

#### 顶部渐变条动画
```css
.concert-card-horizontal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: linear-gradient(90deg, #FF6B6B, #FF8E8E, #FFB4B4);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.concert-card-horizontal:active::before {
  opacity: 1;
}
```

**效果**：点击时卡片下沉并显示顶部彩色条，提供清晰的视觉反馈

---

### 3. 海报区域优化

#### 渐变遮罩
```css
.card-poster::after {
  content: '';
  position: absolute;
  background: linear-gradient(180deg, transparent 60%, rgba(0, 0, 0, 0.3) 100%);
}
```

#### 图片缩放动画
```css
.card-poster image {
  transition: transform 0.5s ease;
}

.concert-card-horizontal:active .card-poster image {
  transform: scale(1.05);
}
```

**效果**：底部渐变更柔和，点击图片有轻微放大效果

---

### 4. 阶段标签美化

#### 渐变背景
```css
.stage-badge.stage-first { 
  background: linear-gradient(135deg, #FF6B6B 0%, #e74c3c 100%);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(4px);
}
```

**各阶段颜色**：
- 网传：灰色渐变
- 上架：蓝色渐变
- 一开：红色渐变（醒目）
- 二开：紫色渐变
- 三开：橙色渐变
- 已结束：灰白渐变

---

### 5. 艺人名字渐变效果

```css
.artist-name {
  background: linear-gradient(90deg, #FF6B6B 0%, #FF8E8E 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**效果**：艺人名字呈现渐变色，更加醒目

---

### 6. 预售时间高亮

```css
.card-presale {
  background: linear-gradient(90deg, #FFF5F5 0%, rgba(255, 107, 107, 0.05) 100%);
  border: 1rpx solid rgba(255, 107, 107, 0.1);
  border-radius: 10rpx;
}
```

**效果**：预售时间区域有淡红色背景，突出显示

---

### 7. 平台标签优化

```css
.platform-tag {
  background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%);
  border: 1rpx solid rgba(255, 107, 107, 0.2);
  box-shadow: 0 2rpx 6rpx rgba(255, 107, 107, 0.1);
}
```

**效果**：平台标签有微妙的阴影和边框，更精致

---

### 8. 价格标签优化

```css
.card-price {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
  padding: 8rpx 16rpx;
  border-radius: 12rpx;
  border: 1rpx solid rgba(255, 107, 107, 0.15);
}
```

**效果**：价格区域有圆角背景和边框，更加突出

---

### 9. 订阅按钮升级

```css
.subscribe-btn {
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
  box-shadow: 
    0 6rpx 16rpx rgba(255, 107, 107, 0.4),
    inset 0 1rpx 0 rgba(255, 255, 255, 0.3);
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
}

.subscribe-btn:active {
  transform: scale(0.95);
}
```

**效果**：
- 渐变背景
- 双层阴影（外发光 + 内高光）
- 按压时缩小反馈
- 已订阅状态为灰色渐变

---

### 10. 新增骨架屏

```css
.skeleton-poster {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

**效果**：加载时显示闪烁的骨架屏，提升等待体验

---

### 11. 空状态动画

```css
.empty-icon {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20rpx); }
}
```

**效果**：空状态图标有上下浮动动画，更生动

---

### 12. 搜索栏优化

```css
.search-header {
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 50%, #FFB4B4 100%);
  border-radius: 0 0 30rpx 30rpx;
  box-shadow: 0 8rpx 32rpx rgba(255, 107, 107, 0.25);
}

.search-box {
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.search-box:focus-within {
  transform: translateY(-2rpx);
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.12);
}
```

**效果**：
- 搜索栏底部圆角
- 输入框聚焦时上浮
- 毛玻璃效果

---

### 13. 城市选择优化

```css
.city-filter {
  background-color: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.city-item {
  transition: all 0.3s ease;
}

.city-item:active {
  transform: scale(0.95);
}

.city-item.active {
  box-shadow: 0 6rpx 20rpx rgba(255, 107, 107, 0.35);
}
```

**效果**：
- 城市筛选有卡片背景
- 选中状态有阴影
- 按压时缩小反馈

---

## 📝 使用说明

### 1. 替换样式文件
```bash
# 备份原文件
mv pages/index/index.wxss pages/index/index-backup.wxss
mv pages/index/index-optimized.wxss pages/index/index.wxss
```

### 2. 替换模板文件（可选）
如果想使用骨架屏等新功能：
```bash
mv pages/index/index.wxml pages/index/index-backup.wxml
mv pages/index/index-optimized.wxml pages/index/index.wxml
```

### 3. 在 JS 中启用骨架屏
```javascript
Page({
  data: {
    showSkeleton: true,  // 添加这个字段
    // ... 其他数据
  },
  
  async loadConcerts() {
    this.setData({ 
      loading: true,
      showSkeleton: this.data.concerts.length === 0  // 首次加载显示骨架屏
    });
    
    // ... 加载逻辑
    
    this.setData({
      concerts: data,
      showSkeleton: false  // 加载完成隐藏
    });
  }
});
```

---

## 🎨 设计原则

### 1. 层次感
- 多层阴影营造立体效果
- 内阴影和外阴影结合
- 渐变背景增加深度

### 2. 一致性
- 所有阴影使用相同的颜色和透明度规律
- 圆角保持一致（卡片24rpx，按钮28rpx）
- 渐变使用相同的角度（135deg）

### 3. 反馈感
- 所有可点击元素都有按压效果
- 状态变化有平滑过渡动画
- 加载状态有视觉反馈

### 4. 呼吸感
- 适当的留白（padding/margin）
- 柔和的阴影而非生硬的边框
- 渐变色而非纯色

---

## 📱 预览效果

优化后的卡片具有以下特点：

1. **悬浮感**：卡片像浮在背景之上
2. **精致感**：细节丰富，圆角、阴影、渐变都很柔和
3. **交互感**：点击有反馈，状态变化流畅
4. **专业感**：整体视觉更加现代、高端

---

## 🔧 性能注意

虽然增加了视觉效果，但优化了性能：

- 使用 `transform` 和 `opacity` 做动画（GPU加速）
- 阴影使用较小的模糊半径
- 动画时长控制在 300ms 以内
- 骨架屏使用 CSS 动画而非 JS
