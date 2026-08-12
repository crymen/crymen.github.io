---
title: Docker 环境下升级 Hexo 的基本流程
date: 2026-08-12 13:30:00
tags:
  - Hexo
  - Docker
categories:
  - 技术
---

当前 Hexo 环境运行在 Docker 中，因此后续升级 Hexo 时，并不需要修改本机的 Node.js 或 Hexo 环境。

升级的核心思路是：**修改项目的依赖定义和运行环境，然后通过 Docker 和 GitHub Actions 分别验证。**

<!-- more -->

## 升级前确认

首先查看当前 Hexo 版本：

```bash
docker compose run --rm hexo npx hexo version
```

准备升级时，需要先确认目标 Hexo 版本的更新说明，尤其是：

- Node.js 最低版本要求；
- 是否存在 Breaking Changes；
- 现有主题是否兼容；
- 现有 Hexo 插件是否兼容；
- 配置文件格式是否发生变化。

如果只是小版本升级，通常变化较小。

如果是类似：

```text
Hexo 8 → Hexo 9
```

这样的大版本升级，则应先查看对应版本的 Migration Guide 或 Release Notes，再进行实际升级。

## 升级 Hexo

如果当前 Node.js 版本仍然满足新版 Hexo 的要求，可以直接在 Docker 环境中升级：

```bash
docker compose run --rm hexo npm install hexo@latest
```

执行后主要会修改：

```text
package.json
package-lock.json
```

其中：

```text
package.json
```

记录项目使用的依赖，而：

```text
package-lock.json
```

锁定实际安装的依赖版本。

正式构建时仍然通过：

```bash
npm ci
```

根据 lock file 恢复确定的依赖环境。

## Node.js 版本发生变化

如果新版 Hexo 提高了 Node.js 最低版本要求，则除了升级 Hexo，还需要修改项目使用的 Node.js 版本。

例如 Dockerfile：

```dockerfile
FROM node:22
```

需要调整为新的目标版本。

同时 GitHub Actions 中用于构建博客的 Node.js 版本也需要保持一致。

最终应尽量保证：

```text
本地 Docker
    ↓
Node.js Version

GitHub Actions
    ↓
Node.js Version
```

两边使用相同的主要版本。

这样可以减少：

```text
本地构建正常
GitHub Actions 构建失败
```

这种环境差异问题。

## 重新构建 Docker 环境

修改依赖或 Node.js 版本后，需要重新 Build：

```bash
docker compose up --build
```

然后访问：

```text
http://localhost:4000
```

检查博客是否正常。

建议至少确认：

```text
首页
文章详情
文章摘要
Tags
Categories
主题样式
代码块
图片
历史文章链接
```

如果只是普通小版本升级，可以进行基本检查。

如果是大版本升级，则应该对整个博客进行一次较完整的检查。

## 提交升级

本地验证正常后：

```bash
git status
```

如果只是升级 Hexo，通常主要变化是：

```text
package.json
package-lock.json
```

如果同时升级 Node.js，则还可能包括：

```text
Dockerfile
.github/workflows/pages.yml
```

确认变更后提交：

```bash
git add .
git commit -m "chore: upgrade Hexo"
git push
```

Push 后 GitHub Actions 会再次执行：

```text
安装 Node.js
    ↓
npm ci
    ↓
Hexo Build
    ↓
GitHub Pages Deploy
```

因此整个升级过程实际上存在两次验证：

```text
第一次
Docker 本地构建
    ↓
确认博客正常

第二次
GitHub Actions
    ↓
确认正式构建环境正常
```

两次都成功后，本次升级即可完成。

## 不要一次升级所有依赖

如果只是希望升级 Hexo 本身，没有必要同时执行一次大范围的依赖升级。

更稳妥的方式是：

```text
升级 Hexo
    ↓
验证
    ↓
升级必要插件
    ↓
验证
    ↓
升级主题
    ↓
验证
```

这样如果出现兼容性问题，更容易确定是哪个组件导致。

## 总结

当前博客的 Hexo 环境由仓库中的文件定义：

```text
Dockerfile
    ↓
Node.js 运行环境

package.json
package-lock.json
    ↓
Hexo 与 npm 依赖

_config.yml
source/
themes/
    ↓
博客本身
```

因此升级 Hexo 的本质并不是升级某台电脑上的 Hexo，而是：

```text
确认新版要求
    ↓
更新依赖
    ↓
必要时更新 Node.js
    ↓
Docker 重新 Build
    ↓
本地验证
    ↓
Git Commit / Push
    ↓
GitHub Actions 再次验证
```

只要这些环境定义仍然保存在 Git 仓库中，即使以后更换电脑，也可以按照相同方式重新构建和升级博客环境。