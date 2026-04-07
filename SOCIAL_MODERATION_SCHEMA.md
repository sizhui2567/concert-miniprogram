# 社交风控与公告运营数据结构（MVP）

## 1. 内容状态约定
- `pending`: 待审核
- `approved`: 已通过（前台默认可见）
- `offline`: 已下线

---

## 2. seatViews（新增字段）

```json
{
  "_id": "xxx",
  "concertId": "concert_xxx",
  "openid": "user_openid",
  "userName": "用户8888",
  "seatInput": "101区12排8座",
  "areaId": "A101",
  "row": 12,
  "seat": 8,
  "rating": "clear",
  "note": "无遮挡，侧屏清晰",
  "images": ["cloud://.../a.jpg"],
  "status": "approved",
  "reviewReason": "",
  "reportCount": 0,
  "helpfulScore": 0,
  "createTime": "2026-04-04T08:00:00.000Z",
  "updateTime": "2026-04-04T08:00:00.000Z"
}
```

`rating` 枚举：
- `clear`：无遮挡
- `side`：偏侧
- `blocked`：被挡

---

## 3. buddyPosts（新增字段）

```json
{
  "_id": "xxx",
  "concertId": "concert_xxx",
  "openid": "user_openid",
  "type": "photo",
  "content": "入场前一起拍照",
  "contact": "wechat_xxx",
  "expectedCount": 3,
  "joinedCount": 1,
  "status": "approved",
  "reviewReason": "",
  "reportCount": 0,
  "hotScore": 0,
  "createTime": "2026-04-04T08:00:00.000Z",
  "updateTime": "2026-04-04T08:00:00.000Z"
}
```

---

## 4. concertAnnouncements（新增字段）

```json
{
  "_id": "xxx",
  "concertId": "concert_xxx",
  "openid": "user_openid",
  "content": "2号门集合",
  "isOfficial": false,
  "isPinned": false,
  "status": "approved",
  "reviewReason": "",
  "reportCount": 0,
  "hotScore": 0,
  "createTime": "2026-04-04T08:00:00.000Z",
  "updateTime": "2026-04-04T08:00:00.000Z"
}
```

---

## 5. contentReports（新集合）

```json
{
  "_id": "xxx",
  "reporterOpenid": "report_user",
  "targetOpenid": "target_user",
  "concertId": "concert_xxx",
  "contentType": "announcement",
  "contentId": "target_content_id",
  "reasonType": "abuse",
  "detail": "",
  "status": "pending",
  "handledBy": "",
  "handledTime": null,
  "createTime": "2026-04-04T08:00:00.000Z",
  "updateTime": "2026-04-04T08:00:00.000Z"
}
```

---

## 6. userBlocks（新集合）

```json
{
  "_id": "xxx",
  "ownerOpenid": "me_openid",
  "targetOpenid": "blocked_openid",
  "status": "active",
  "reason": "",
  "createTime": "2026-04-04T08:00:00.000Z",
  "updateTime": "2026-04-04T08:00:00.000Z"
}
```

---

## 7. userMutes（新集合）

```json
{
  "_id": "xxx",
  "userId": "target_openid",
  "scope": "announcement",
  "status": "active",
  "endTime": "2026-04-05T08:00:00.000Z",
  "operatorOpenid": "admin_openid",
  "createTime": "2026-04-04T08:00:00.000Z",
  "updateTime": "2026-04-04T08:00:00.000Z"
}
```

`scope` 建议枚举：`announcement` / `buddy` / `seatView` / `all`

