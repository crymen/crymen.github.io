# Hexo Blog

基于 **Hexo 8 + Docker + GitHub Actions + GitHub Pages** 的静态博客。

本仓库保存完整的 Hexo 源码、配置和依赖定义。Docker
用于本地完整预览，GitHub Actions 负责正式构建并发布到 GitHub Pages。

> 核心目标是保存"可重新构建博客环境的完整定义"，而不是保存某一台电脑上的
> Node.js / Hexo 运行环境。

## 1. 架构

``` text
Markdown
   ↓
Hexo Source
   ├─ Docker → 本地完整预览
   └─ Git Push
        ↓
      GitHub Actions
        ↓
      Node.js 22 + npm ci + Hexo Build
        ↓
      GitHub Pages
        ↓
      自定义域名
```

  组件              用途
  ----------------- ------------------------------------------------
  Markdown 编辑器   编写和初步预览文章
  Hexo 8            静态博客生成
  Docker            隔离本地 Node.js / Hexo 环境，提供完整网页预览
  Git               保存博客源码和历史
  GitHub Actions    自动安装依赖、构建 Hexo
  GitHub Pages      托管生成后的静态网站
  Cloudflare        当前主要提供自定义域名 DNS 解析

## 2. 仓库结构

``` text
.
├── .github/workflows/pages.yml
├── scaffolds/
├── source/_posts/
├── themes/
├── .gitignore
├── Dockerfile
├── compose.yml
├── _config.landscape.yml
├── _config.yml
├── package.json
├── package-lock.json
└── README.md
```

`source/_posts/` 用于保存博客文章。

以下内容属于可重新生成的产物，不应提交到 Git：

``` text
node_modules/
public/
db.json
.deploy_git/
```

## 3. 环境要求

只编辑 Markdown 时不需要安装 Node.js 或启动 Docker。

本地完整预览需要 Docker 和 Docker Compose。本项目使用 Docker 内的
Node.js 22，因此无需修改宿主机已有 Node.js 环境。

本文统一使用：

``` bash
docker compose
```

## 4. 日常写作

直接在 `source/_posts/` 创建 Markdown：

``` markdown
---
title: 文章标题
date: 2026-08-12 12:00:00
tags:
  - Hexo
categories:
  - 技术
---

这里是首页摘要。

<!-- more -->

这里是完整正文。
```

`<!-- more -->` 用于指定首页摘要结束位置。

通常无需通过 Hexo 命令创建文章，直接创建 `.md` 文件即可。

## 5. 发布文章

``` bash
git status
git add .
git commit -m "post: add new article"
git push
```

Push 后自动执行：

``` text
Checkout
  ↓
Setup Node.js 22
  ↓
npm ci
  ↓
Hexo Build
  ↓
生成 public/
  ↓
Deploy GitHub Pages
```

正常情况下无需手动执行 `hexo generate` 或 `hexo deploy`，也无需提交
`public/`。

## 6. 本地完整预览

需要确认 Hexo 最终效果时：

``` bash
docker compose up
```

访问：

``` text
http://localhost:4000
```

停止：

``` bash
docker compose down
```

适合用于修改主题、CSS、导航、Hexo
特殊语法、图片路径、代码高亮或页面布局后的检查。

## 7. 什么时候需要 --build

由于项目目录通过 Volume 挂载到容器，普通 Markdown 修改不需要重新 Build。

  修改内容              是否需要 `--build`
  --------------------- ------------------------
  Markdown / 图片       不需要
  主题文件              通常不需要
  `_config.yml`         通常不需要，必要时重启
  `package.json`        需要
  `package-lock.json`   需要
  `Dockerfile`          需要
  Node.js 版本          需要
  新增 Hexo npm 插件    需要

需要重新构建时：

``` bash
docker compose up --build
```

## 8. Docker 环境原理

``` text
Dockerfile
  → 定义 Node.js 22

package.json + package-lock.json
  → 定义并锁定 Hexo / npm 依赖

_config.yml + source/ + themes/
  → 定义博客配置、内容和外观
```

`npm ci` 可以根据 lock file 重新生成
`node_modules/`，因此不需要保存长期存在的 Hexo 容器或 `node_modules/`。

## 9. 从零恢复

其他设备需要维护时：

``` bash
git clone <repository-url>
cd <repository-directory>
docker compose up --build
```

访问 `http://localhost:4000` 即可。

无需从旧电脑复制：

``` text
node_modules/
Docker Container
public/
```

## 10. GitHub Pages

Workflow 位于：

``` text
.github/workflows/pages.yml
```

GitHub 仓库需要在：

``` text
Settings → Pages → Build and deployment
```

将 Source 设置为：

``` text
GitHub Actions
```

Actions 中 `Build` 和 `Deploy` 均成功，表示正式发布完成。

## 11. 自定义域名与 HTTPS

GitHub：

```text
Settings → Pages → Custom domain
```

配置实际博客域名，并确认：

```text
DNS check successful
```

同时启用：

```text
Enforce HTTPS
```

配置自定义域名后，访问默认的 `<username>.github.io` 自动转向自定义域名属于正常行为。

域名的具体 DNS 服务商和解析方式属于站点外部基础设施，不在本仓库的维护范围内。

## 12. 最简速查

写文章：

``` text
source/_posts/<article>.md
```

预览：

``` bash
docker compose up
```

修改依赖后：

``` bash
docker compose up --build
```

停止：

``` bash
docker compose down
```

发布：

``` bash
git add .
git commit -m "post: add new article"
git push
```

当前稳定链路：

``` text
Markdown
  ↓
Hexo 8 Source
  ↓
Git
  ↓
GitHub Actions
  ↓
GitHub Pages
  ↓
Custom Domain
```
