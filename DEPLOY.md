# FitZone 免费部署指南（Vercel + Render）

> 全程免费，自带 HTTPS，自动从 GitHub 部署。预计 30 分钟完成。

## 架构

```
用户浏览器
    ↓ https://fitzone.vercel.app
Vercel (前端静态托管 + CDN，免费)
    ↓ https://fitzone-backend.onrender.com/api
Render (后端 Node.js + 持久化磁盘，免费)
```

## 准备工作

1. 注册 [GitHub](https://github.com) 账号（已有可跳过）
2. 注册 [Vercel](https://vercel.com) 账号（用 GitHub 登录）
3. 注册 [Render](https://render.com) 账号（用 GitHub 登录）

## 第1步：把代码推到 GitHub

```bash
# 在项目根目录执行
git init
git add .
git commit -m "FitZone 健身网站"

# 在 GitHub 网页上创建一个新仓库（比如 fitzone）
# 然后按 GitHub 给的命令推送
git remote add origin https://github.com/你的用户名/fitzone.git
git branch -M main
git push -u origin main
```

## 第2步：部署后端到 Render

1. 打开 https://dashboard.render.com
2. 点击 **New +** → **Blueprint**
3. 选择你刚推送的 GitHub 仓库 `fitzone`
4. Render 会自动读取 `render.yaml` 配置，点击 **Apply**
5. 等待构建完成（约 3-5 分钟）
6. 部署成功后，你会得到一个后端地址，类似：
   ```
   https://fitzone-backend-xxxx.onrender.com
   ```
7. **测试后端是否正常**：浏览器打开
   ```
   https://fitzone-backend-xxxx.onrender.com/api/health
   ```
   返回 `{"status":"ok",...}` 即正常
8. **保存这个地址**，下一步要用

## 第3步：部署前端到 Vercel

1. 打开 https://vercel.com/new
2. 导入你的 GitHub 仓库 `fitzone`
3. **重要：配置环境变量**
   - 展开下方的 **Environment Variables**
   - 添加一项：
     - Key：`VITE_API_BASE_URL`
     - Value：`https://fitzone-backend-xxxx.onrender.com/api`
     - （把 `fitzone-backend-xxxx` 换成第2步拿到的真实后端地址）
4. 点击 **Deploy**
5. 等待 1-2 分钟，部署完成后会得到：
   ```
   https://fitzone-xxxx.vercel.app
   ```
   这就是你的网站地址！任何时候都能访问。

## 第4步：返回 Render 配置 CORS

1. 回到 Render 控制台 → 点击 `fitzone-backend` 服务
2. 进入 **Environment** 标签
3. 添加环境变量：
   - Key：`FRONTEND_URL`
   - Value：`https://fitzone-xxxx.vercel.app`（第3步拿到的 Vercel 域名）
4. 保存后会自动重新部署

## 第5步：验证

1. 打开 `https://fitzone-xxxx.vercel.app`
2. 尝试注册登录 → 发送验证码 → 应该能正常收到验证码
3. 进入社区广场发动态、加好友
4. 所有功能都应正常工作

## 免费版限制说明

### Vercel 免费套餐
- ✅ 带宽：100GB/月（足够）
- ✅ 自动 HTTPS + CDN 加速
- ✅ 自动从 GitHub 部署
- ⚠️ 每次推送代码自动重新部署

### Render 免费套餐
- ✅ 512MB 内存 + 1GB 持久化磁盘（够用）
- ✅ 自动 HTTPS
- ⚠️ **15 分钟无访问会休眠**，下次访问时自动唤醒（约 30-60 秒等待）
- ⚠️ 每月 750 小时免费时长（足够 1 个服务 24/7 运行）

### 防止 Render 后端休眠（可选）
注册 [UptimeRobot](https://uptimerobot.com)（免费）：
1. 添加 HTTP 监控
2. URL 填 `https://fitzone-backend-xxxx.onrender.com/api/health`
3. 间隔 5 分钟
4. 这样后端就不会休眠了

## 更新部署

以后改了代码：
```bash
git add .
git commit -m "修改说明"
git push
```
Vercel 和 Render 都会自动重新部署，无需手动操作。

## 自定义域名（可选）

**Vercel 前端**：
1. Vercel 控制台 → 你的项目 → Settings → Domains
2. 添加你的域名（如 `fitzone.com`）
3. 按提示到域名服务商修改 DNS 记录

**Render 后端**：
1. Render 控制台 → 你的服务 → Settings → Custom Domains
2. 添加 `api.fitzone.com`
3. 修改对应 DNS

## 数据备份

定期备份用户数据：
```bash
# 在 Render 控制台打开 Shell
cd data
tar -czf backup-$(date +%Y%m%d).tar.gz *.json

# 通过 scp 或其他方式下载
```

## 常见问题

**Q：登录后页面空白？**
A：检查 `VITE_API_BASE_URL` 是否配置正确（必须以 `/api` 结尾）

**Q：接口报 403？**
A：检查 Render 后端的 `FRONTEND_URL` 环境变量是否配置为 Vercel 域名

**Q：第一次访问很慢？**
A：Render 免费版冷启动需要 30-60 秒，等待即可。配置 UptimeRobot 后不会休眠就不会慢。

**Q：数据会丢失吗？**
A：不会。Render 持久化磁盘独立于容器，重新部署数据依然保留。
