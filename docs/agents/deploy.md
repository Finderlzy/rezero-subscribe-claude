# 部署

正式站 <https://re0claude.us.ci/> 部署在 GitHub Pages。推送 `main` 后由 [.github/workflows/deploy.yml](../../.github/workflows/deploy.yml) 构建并发布（`SITE_URL=https://re0claude.us.ci`，根路径，域名在 `public/CNAME`），也可以在 Actions 页手动运行；内容有错时构建失败，不会部署。

换仓库或域名时：

1. 仓库 Settings → Pages → Build and deployment 的 Source 选 **GitHub Actions**。
2. 域名的 DNS 加 4 条 A 记录指向 `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`（可再加 AAAA：`2606:50c0:8000::153` 到 `2606:50c0:8003::153`）；用 Cloudflare 时先关掉代理（灰色云朵），等证书签发后再打开。
3. Settings → Pages 的 Custom domain 填 `re0claude.us.ci`，DNS 检查通过后勾选 **Enforce HTTPS**。

私有仓库开 Pages 需要付费账户；改为公开前先扫一次提交历史（见 [delivery.md](../delivery.md)）。

## 部署到其他静态文件服务器

`dist/` 是一组静态文件，直接放上去即可。子路径部署用 `BASE_PATH=/sub/ npm run build`。站点用目录式 URL（`/overview/` → `overview/index.html`），找不到的地址应返回 `404.html`，Nginx 的常见写法：

```nginx
location /sub/ {
    try_files $uri $uri/index.html =404;
    error_page 404 /sub/404.html;
}
```

`SITE_URL` 可选，填站点的完整域名。
