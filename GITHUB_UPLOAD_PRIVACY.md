# GitHub 上传与隐私保护说明

本仓库已按“默认不上传个人隐私”的原则处理，核心策略如下。

## 1. 明确不会上传的内容

以下内容已通过 `.gitignore` 屏蔽，不会被新提交带上：

- `project.private.config.json`（微信开发者工具本地私有配置）
- `.env` / `.env.*`（本地密钥、口令）
- `node_modules`、`__pycache__`、日志与临时文件
- 本地数据库文件（`*.db` / `*.sqlite*`）

## 2. 已做的隐私安全处理

- 将 `project.config.json` 的 `appid` 改为占位值：`touristappid`
- 云函数 `adminLogin` 不再硬编码密码，改为读取环境变量 `ADMIN_PASSWORD`

## 3. 上传前检查（建议每次执行）

```bash
git status --short
git check-ignore -v project.private.config.json .env
```

可选敏感词检查：

```bash
rg -n --hidden --glob '!**/node_modules/**' --glob '!.git/**' "(secret|token|password|private[_-]?key|AKIA)"
```

## 4. 标准上传命令

```bash
git add -A
git commit -m "chore: privacy-safe upload to github"
git push origin main
```

## 5. 部署时必须配置

请在云函数运行环境中设置：

- `ADMIN_PASSWORD=<你的管理员密码>`

> 注意：不要把真实密码写回代码仓库。

