# Detail Page Night Gold Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `pages/detail` to the Night Gold Editorial visual system and raise first-screen subscription conversion without changing business logic.

**Architecture:** Keep existing page data flow and handlers in `detail.js`, only adjust first-screen WXML hierarchy plus WXSS theme and hierarchy. Add one display-only computed field (`availablePlatformsDisplay`) in `loadConcertDetail` to keep WXML simple and safe. Preserve all existing seat map, buddy, announcement, and moderation interaction handlers.

**Tech Stack:** WeChat Mini Program (WXML, WXSS, JS), existing page logic in `miniprogram/pages/detail/detail.js`.

---

## File Structure Lock-in

- Modify: `miniprogram/pages/detail/detail.wxml`
  - Responsibility: first-screen structure (hero, CTA, key decision cards), localized labels.
- Modify: `miniprogram/pages/detail/detail.wxss`
  - Responsibility: Night Gold visual styling, first-screen hierarchy, CTA prominence, dark action bar.
- Modify: `miniprogram/pages/detail/detail.js`
  - Responsibility: derive display string `availablePlatformsDisplay` from existing data.
- Verify only (no edits): `scenario_social_moderation_check.py`
  - Responsibility: parse/surface-level guard on key detail page bindings and cloud function wiring.

## Task 1: Restructure Hero and Decision Blocks (`detail.wxml`)

**Files:**
- Modify: `miniprogram/pages/detail/detail.wxml`

- [ ] **Step 1: Replace legacy info block with conversion-first hero layout**

```xml
<view class="info-section card hero-card">
  <view class="hero-head">
    <view class="hero-title-wrap">
      <view class="title">{{concert.title}}</view>
      <view class="artist" wx:if="{{concert.artist}}">
        <text class="value">{{concert.artist}}</text>
      </view>
    </view>
    <button class="hero-subscribe-btn {{concert.subscribed ? 'subscribed' : ''}}" bindtap="onToggleSubscribe">
      {{concert.subscribed ? '已订阅提醒' : '立即订阅提醒'}}
    </button>
  </view>

  <view class="hero-meta-grid">
    <view class="hero-meta-item">
      <text class="hero-meta-label">场馆</text>
      <text class="hero-meta-value">{{concert.city}} · {{concert.venue}}</text>
    </view>
    <view class="hero-meta-item">
      <text class="hero-meta-label">场次时间</text>
      <text class="hero-meta-value">{{concert.dateDisplay}}</text>
    </view>
  </view>

  <view class="hero-trust-copy">开售前提醒 / 状态变化提醒 / 可随时取消</view>
</view>
```

- [ ] **Step 2: Insert key decision card section after hero**

```xml
<view class="decision-section card">
  <view class="decision-title">关键信息</view>
  <view class="decision-grid">
    <view class="decision-item">
      <text class="decision-label">开售时间</text>
      <text class="decision-value">{{concert.platforms.damai.openTime || concert.platforms.maoyan.openTime || '待公布'}}</text>
    </view>
    <view class="decision-item">
      <text class="decision-label">票价区间</text>
      <text class="decision-value">{{concert.priceRange ? '¥' + concert.priceRange : '待公布'}}</text>
    </view>
    <view class="decision-item decision-item-wide">
      <text class="decision-label">开售平台</text>
      <text class="decision-value">{{concert.availablePlatformsDisplay || '待公布'}}</text>
    </view>
  </view>
</view>
```

- [ ] **Step 3: Localize remaining core copy (no behavior change)**

```xml
<view class="section-title">购票平台</view>
<view class="section-title">互动座位图</view>
<view class="section-title">阶段时间线</view>
<view class="section-title">相关演唱会</view>
<button class="btn-share" open-type="share">分享给朋友</button>
```

## Task 2: Add display-safe derived field in `detail.js`

**Files:**
- Modify: `miniprogram/pages/detail/detail.js`

- [ ] **Step 1: Add `availablePlatformsDisplay` right after date formatting in `loadConcertDetail`**

```js
if (Array.isArray(concert.availablePlatforms) && concert.availablePlatforms.length > 0) {
  concert.availablePlatformsDisplay = concert.availablePlatforms.join(' / ');
} else {
  concert.availablePlatformsDisplay = '';
}
```

- [ ] **Step 2: Keep all existing handlers untouched**

```js
// onToggleSubscribe
// loadSeatViews
// loadBuddyPosts
// loadAnnouncementMessages
// onReportContent / onBlockUser
```

Expected outcome: only render data is enriched; no API behavior changes.

## Task 3: Night Gold Styling for Batch 1 (`detail.wxss`)

**Files:**
- Modify: `miniprogram/pages/detail/detail.wxss`

- [ ] **Step 1: Apply dark cinematic page base + hero card style**

```css
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #0f1115 0%, #151922 42%, #10131a 100%);
  padding-bottom: 140rpx;
}

.hero-card {
  border: 1rpx solid rgba(201, 168, 106, 0.25);
  box-shadow: 0 18rpx 48rpx rgba(0, 0, 0, 0.35);
  background: linear-gradient(160deg, #191d27 0%, #141923 100%);
}
```

- [ ] **Step 2: Add conversion-focused CTA and metadata card styles**

```css
.hero-subscribe-btn {
  min-width: 220rpx;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 38rpx;
  background: linear-gradient(135deg, #c9a86a 0%, #dfbf84 100%);
  color: #12151d;
  font-weight: 600;
}

.hero-meta-item,
.decision-item {
  border: 1rpx solid rgba(201, 168, 106, 0.18);
  background: rgba(255, 255, 255, 0.02);
  border-radius: 14rpx;
}
```

- [ ] **Step 3: Update shared card/action bar palette to match Night Gold**

```css
.card {
  background: #151922;
  border: 1rpx solid rgba(201, 168, 106, 0.14);
}

.action-bar {
  background: rgba(15, 17, 21, 0.95);
  border-top: 1rpx solid rgba(201, 168, 106, 0.18);
}

.btn-subscribe {
  background: linear-gradient(135deg, #c9a86a 0%, #dfbf84 100%);
  color: #10131a;
}
```

## Task 4: Verification (No completion claims without evidence)

**Files:**
- Verify: `scenario_social_moderation_check.py`
- Verify: `miniprogram/pages/detail/detail.wxml`
- Verify: `miniprogram/pages/detail/detail.wxss`
- Verify: `miniprogram/pages/detail/detail.js`

- [ ] **Step 1: Run scenario parser/structure guard**

Run:

```bash
python scenario_social_moderation_check.py
```

Expected:
- Syntax checks for detail-related JS/cloudfunction files show `ok`.
- Required API exposure checks remain `PASS`.
- Final count remains fully passing.

- [ ] **Step 2: Manual UI sanity review in WeChat DevTools**

Checklist:
- Hero section renders title, artist, CTA, and two metadata blocks.
- Decision cards render fallback text when fields are absent.
- Bottom action bar still triggers subscribe/share.
- Seat map, buddy, announcement blocks still visible and interactive.

- [ ] **Step 3: Regression behavior checks**

Manual checks:
- Tap top `hero-subscribe-btn` toggles subscription state.
- Tap bottom `btn-subscribe` toggles same state.
- Tap platform item still triggers `onTapPlatform` behavior.

## Task 5: Commit Batch 1 (Optional, only when requested)

**Files:**
- Stage: `miniprogram/pages/detail/detail.wxml`
- Stage: `miniprogram/pages/detail/detail.wxss`
- Stage: `miniprogram/pages/detail/detail.js`

- [ ] **Step 1: Stage files**

```bash
git add miniprogram/pages/detail/detail.wxml miniprogram/pages/detail/detail.wxss miniprogram/pages/detail/detail.js
```

- [ ] **Step 2: Commit with why-focused message (if user asks)**

```bash
git commit -m "feat: redesign detail hero and decision hierarchy for higher subscription conversion"
```

---

## Self-Review Results

- Spec coverage: Batch 1 (detail-first, conversion-first, Night Gold direction, no business-logic changes) is fully mapped.
- Placeholder scan: no TODO/TBD placeholders remain.
- Naming consistency: `availablePlatformsDisplay` used consistently in JS + WXML.
