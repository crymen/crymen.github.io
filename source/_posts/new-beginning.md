---
title: 新的开始 - hexo 升级恢复
date: 2026-08-12 10:59
tags:
  - Hexo
categories:
  - 技术
---

# 使用 Docker 重建 Hexo 环境并通过 GitHub Pages 发布

之前搭建过一个 Hexo 博客，但长时间没有维护后，本地的 Hexo 源码和运行环境已经无法继续使用。考虑到当前本机的 Node.js 环境还有其他用途，因此这次没有直接升级本机 Node.js，而是使用 Docker 重新建立一个独立的 Hexo 运行环境。

最终采用的方案是：

```text
Markdown
    ↓
Hexo 源码
    ├── Docker → 本地预览
    │
    └── Git Push
            ↓
      GitHub Actions
            ↓
      Hexo Generate
            ↓
      GitHub Pages
```

<!-- more -->

## 使用 Docker 初始化 Hexo

首先建立一个空目录：

```bash
mkdir hexo-blog
cd hexo-blog
```

使用 Node.js 22 镜像启动一个临时容器：

```bash
docker run --rm -it \
  -v "$PWD:/app" \
  -w /app \
  node:22 \
  bash
```

其中：

- `--rm`：退出后自动删除临时容器；
- `-it`：使用交互式终端；
- `-v "$PWD:/app"`：将当前目录挂载到容器的 `/app`；
- `-w /app`：将 `/app` 设置为工作目录；
- `node:22`：使用 Node.js 22 环境。

进入容器后初始化 Hexo：

```bash
npx hexo-cli init .
```

完成后退出：

```bash
exit
```

虽然临时容器已经被删除，但 Hexo 项目已经通过 Volume 写入本地目录。

其中比较重要的是：

```text
package.json
package-lock.json
_config.yml
source/
themes/
```

`package.json` 和 `package-lock.json` 保存了 Hexo 及相关 npm 依赖的信息，因此没有必要永久保存初始化时使用的容器。

后续只要 Node.js 版本以及这些项目文件还在，就可以通过：

```bash
npm ci
```

重新构建依赖环境。

## 创建 Docker 预览环境

在项目根目录创建 `Dockerfile`：

```dockerfile
FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 4000

CMD ["npx", "hexo", "server", "-i", "0.0.0.0"]
```

再创建 `compose.yml`：

```yaml
services:
  hexo:
    build: .
    ports:
      - "4000:4000"
    volumes:
      - .:/app
      - /app/node_modules
```

第一次启动：

```bash
docker compose up --build
```

之后正常启动只需要：

```bash
docker compose up
```

浏览器访问：

```text
http://localhost:4000
```

即可查看 Hexo 最终生成的页面。

使用完成后：

```bash
docker compose down
```

这样 Hexo 所需要的 Node.js 环境全部位于 Docker 中，不需要修改本机已有的 Node.js 环境。

## 保存源码而不是运行环境

这次重新搭建后，一个比较重要的变化是：Git 仓库保存完整的 Hexo 源码，而不是只保存 Hexo 生成的静态页面。

需要进入版本控制的主要内容包括：

```text
_config.yml
package.json
package-lock.json
source/
themes/
Dockerfile
compose.yml
.github/workflows/
```

而下面这些内容可以随时重新生成：

```text
node_modules/
public/
```

因此可以加入 `.gitignore`：

```gitignore
node_modules/
public/
db.json
.deploy_git/
.DS_Store
```

这样即使以后更换电脑或者删除 Docker 容器，只需要重新 Clone Git 仓库，就可以再次构建完整环境。

## 使用 GitHub Actions 发布

本地 Docker 只负责预览，正式构建和发布交给 GitHub Actions。

基本流程为：

```text
Git Push
    ↓
GitHub Actions
    ↓
安装 Node.js
    ↓
npm ci
    ↓
Hexo Generate
    ↓
GitHub Pages
```

这样发布博客不再依赖某一台电脑上的 Hexo 环境。

日常完成文章后，只需要：

```bash
git add .
git commit -m "post: add new article"
git push
```

GitHub Actions 会自动完成后续构建和发布。

## 日常写作流程

文章本身仍然只是普通 Markdown 文件，保存在：

```text
source/_posts/
```

例如：

```markdown
---
title: 文章标题
date: 2026-08-12
tags:
  - Hexo
  - Docker
categories:
  - 技术
---

正文内容……
```

平时可以直接使用自己习惯的 Markdown 编辑器编写和初步预览，并不需要为了创建文章而启动 Docker。

普通写作流程变成：

```text
创建 Markdown
    ↓
编写、初步预览
    ↓
Git Commit
    ↓
Git Push
    ↓
GitHub Actions 自动发布
```

只有修改主题、CSS、页面结构，或者需要确认 Hexo 最终渲染效果时，才启动：

```bash
docker compose up
```

进行完整预览。

## 总结

这次重建没有尝试保存一个长期运行的 Hexo 容器，而是保存了**重新构建环境所需要的定义**：

```text
Dockerfile
    +
package.json
    +
package-lock.json
    +
Hexo 配置
    +
Markdown 源文件
```

Docker 解决本地环境隔离问题，Git 保存博客源码和环境定义，GitHub Actions 负责构建，GitHub Pages 负责最终托管。

这样即使以后再次长时间停止维护，只要源码仓库仍然存在，就可以重新构建整个 Hexo 环境，而不再依赖某一台机器上已经安装好的 Node.js 和 Hexo。
