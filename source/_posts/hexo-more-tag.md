---
title: Hexo 中 more 标签的使用
date: 2026-08-12 13:10:00
tags:
  - Hexo
categories:
  - 技术
---

Hexo 默认会在文章列表页面展示文章正文。如果文章内容较长，会导致首页被单篇文章占据大量空间。

可以通过 `more` 标签手动指定文章摘要的结束位置。

<!-- more -->

## 使用方式

在 Markdown 正文中需要截断的位置加入：

```html
<!-- more -->