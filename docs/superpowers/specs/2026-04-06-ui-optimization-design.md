# UI Optimization Design (Night Gold Editorial)

Date: 2026-04-06  
Project: concert-miniprogram  
Scope: Detail page + Subscribe page + Mine page (UI layer only)

## 1. Goals and Success Criteria

### Primary Goal
Increase subscription conversion on the detail page.

### Secondary Goals
- Improve readability for high-density concert information.
- Improve management efficiency in subscription-related pages.

### Success Metrics (MVP)
- Detail page: higher click-through rate on main subscribe CTA.
- Subscribe page: lower interaction cost for finding and managing upcoming concerts.
- Cross-page UI consistency: unified visual language and stable action positioning.

## 2. Visual Direction

### Chosen Direction
Night Gold Editorial

### Design Keywords
- Cinematic dark foundation
- Premium gold accents
- Editorial hierarchy
- Conversion-first CTA emphasis

### Theme Tokens (CSS variables)
Add in `miniprogram/styles/common.wxss`:

- `--bg-page: #0f1115`
- `--bg-surface: #151922`
- `--bg-elevated: #1c2230`
- `--text-primary: #f5f2ea`
- `--text-secondary: #b8b4aa`
- `--text-muted: #8f8a80`
- `--accent-gold: #c9a86a`
- `--accent-gold-strong: #dfbf84`
- `--success: #6fae8a`
- `--warning: #d08a6d`
- `--danger: #c96b6b`
- `--border-soft: rgba(201, 168, 106, 0.18)`
- `--shadow-soft: 0 10rpx 30rpx rgba(0, 0, 0, 0.28)`

## 3. Information Architecture

### 3.1 Detail Page (`pages/detail`)

#### Hero Area (Conversion First)
- Poster + stage tag remain visible.
- Title, artist, city/venue, nearest date shown in one compact summary block.
- Main CTA placed in first screen: `Subscribe Alerts`.
- Trust copy under CTA: "Before-sale alerts / schedule change alerts / cancel anytime".

#### Decision Block (Immediately after Hero)
Three high-priority cards:
- Open Time
- Price Range
- Available Platforms

Only decision-critical fields stay above the fold.

#### Schedule and Status Block
- Keep date list and stage status.
- Unify status badge visual mapping with one semantic color system.

#### Existing Social/Seat/Buddy Capabilities
- Keep current modules and behavior unchanged:
  - Interactive seat map
  - Seat view sharing
  - Buddy posts
  - Report/block moderation actions

Only visual hierarchy and spacing are updated.

### 3.2 Subscribe Page (`pages/subscribe`)

#### Top Structure
- Keep 2-tab layout: `Concerts` / `Artists`.
- Add compact overview strip (count-focused, non-blocking).

#### Concerts Tab
- Notification settings become a concise card with clear grouping.
- Concert cards prioritize:
  1) title + status
  2) open time + platform
  3) venue + price range
- Empty state uses stronger guidance CTA back to index.

#### Artists Tab
- Keep current behavior.
- Improve visual clarity: avatar, name/alias spacing, and unfollow action prominence.

### 3.3 Mine Page (`pages/mine`)

#### Role in This Iteration
- Align this page visually with Night Gold system.
- Do not change business behavior.

#### Key Changes
- Upgrade top user panel from red gradient to dark editorial style.
- Keep existing entry points and tap behaviors unchanged.
- Unify menu card styling with detail/subscribe surfaces.

## 4. File-Level Change Plan

### Batch 1 (Highest ROI)
- `miniprogram/pages/detail/detail.wxml`
- `miniprogram/pages/detail/detail.wxss`

Focus: first-screen conversion, decision info hierarchy, CTA prominence.

### Batch 2 (Efficiency)
- `miniprogram/pages/subscribe/subscribe.wxml`
- `miniprogram/pages/subscribe/subscribe.wxss`

Focus: quick scanning, lower management friction, cleaner notification settings.

### Batch 3 (Consistency)
- `miniprogram/pages/mine/mine.wxml`
- `miniprogram/pages/mine/mine.wxss`
- `miniprogram/styles/common.wxss`

Focus: visual language alignment across user journey.

### Batch 4 (Optional Harmonization)
- `miniprogram/components/concert-card/concert-card.wxss`
- `miniprogram/components/stage-tag/stage-tag.wxss`

Focus: component-level consistency.

## 5. Boundaries and Non-Goals

### In Scope
- WXML/WXSS structure and style optimization.
- Theme tokenization and visual consistency.

### Out of Scope
- No cloud function updates.
- No database schema changes.
- No API contract changes.
- No routing changes.
- No behavior changes for moderation/seat/buddy business flows.

## 6. Interaction and Motion Rules

- Keep interaction patterns minimal and consistent:
  - Page-level fade/slide-in at load
  - Card lift on tap
  - CTA press feedback
- Duration range: 180ms-260ms.
- Avoid excessive glow/parallax effects.

## 7. Error Handling and Edge Cases (UI Layer)

- Long title/artist/venue strings must clamp safely.
- Missing poster falls back to existing placeholder.
- Missing open time/platform/price renders neutral placeholders.
- Empty lists show guided empty state with clear next action.
- Loading state uses consistent skeleton style for primary blocks.

## 8. Testing and Verification Plan

### Visual Regression Checklist
- Detail first screen layout on common phone widths.
- Subscribe tab switching and card readability.
- Mine page menu alignment and interaction hit areas.

### Functional Safety Checks
- Confirm all existing tap handlers still fire correctly.
- Confirm subscribe/unsubscribe flow remains unchanged.
- Confirm seat map, report, block, and buddy modules still work.

### Manual Device Matrix (Minimum)
- Small phone width
- Medium mainstream width
- Larger phone width

## 9. Rollout Strategy

- Phase 1: Release detail page changes first.
- Phase 2: Release subscribe page updates.
- Phase 3: Release mine page + shared tokens.
- Phase 4: Optional component harmonization.

Each phase should be independently testable and reversible.

## 10. Open Implementation Notes

- Reuse existing class names where possible to reduce JS impact.
- Add new utility classes only when they reduce duplication.
- Keep styles maintainable: avoid one-off hardcoded colors once theme tokens are introduced.
