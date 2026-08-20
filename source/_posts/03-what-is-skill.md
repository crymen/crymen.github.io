---
title: Skill 是什么：把多轮纠正变成可复用能力
date: 2026-08-20 14:31
tags:
  - AI
  - LLM
  - Harness
categories:
  - 技术
---

使用 Coding Agent 做真实项目时，使用者发现一个很明显的问题：

模型写代码本身往往没问题，但使用者经常需要反复告诉它同一套工作方法。

例如修改接口时，可能不断补充：

``` text
先检查调用方
不要破坏旧接口兼容性
Mapper 改完检查数据库字段
修改后执行 Maven 编译
最后检查 git diff
```

如果每次遇到类似任务都需要重新通过多轮对话把这套流程教一遍，那么这些重复经验能不能被保存下来？

这正是理解 Skill 的一个自然起点。

<!-- more -->

## Skill 可以先理解成可复用 SOP

在当前阶段，可以把 Skill 简化理解为：

> 面对某一类任务时，Agent 可以复用的一套工作流程和经验。

例如一个 `api-change` Skill：

``` text
1. 分析现有接口
2. 阅读 Controller
3. 阅读 Service
4. 阅读 Mapper
5. 搜索调用方
6. 检查兼容性
7. 修改代码
8. 编译
9. 测试
10. 检查 git diff
```

下一次再出现接口修改任务，就不需要使用者重新逐条提醒。

因此 Skill 可以看成是：

> 把过去多轮对话中不断纠正出来的工作方法沉淀下来。

更完整的 Skill 还可以包含参考资料、模板和脚本等资源，SOP 只是最容易理解的一种形式。

## 最简单的 Skill 甚至只是一份 Markdown

从实现上看，一个非常简单的 Skill 完全可能只有：

``` text
skills/
└── api-change/
    └── SKILL.md
```

内容类似：

``` markdown
---
name: api-change
description: 修改已有 API 或增加兼容参数时使用，包含调用方检查、兼容性验证、编译和测试。
---

# API Change

## 适用场景

修改已有接口或新增兼容参数。

## 工作流程

1. 分析接口定义。
2. 搜索调用方。
3. 检查兼容性。
4. 修改实现。
5. 编译。
6. 执行相关测试。
7. 检查 git diff。

## 完成条件

- 编译成功。
- 相关验证通过。
- 不存在无关修改。
```

这已经具备 Skill 的核心含义。

不过需要注意：

> Skill 的概念不是"Markdown 文件"。

Markdown 只是某些 Harness 用来承载 Skill 的一种实现方式。

真正重要的是 Harness 能发现这个 Skill，并根据任务匹配或使用者的显式调用加载它，把相关内容提供给 LLM。

## Skill 和 Instruction 的区别

这两个概念很像，因为最终都可能是一段自然语言。

可以用一个问题区分：

> 它是在告诉 Agent"必须遵守什么"，还是"这类任务应该怎么完成"？

例如：

``` text
禁止修改无关业务代码
```

更像 Instruction。

而：

``` text
修改接口时：
先找调用方 → 检查兼容性 → 修改 → 编译 → 测试
```

明显更像 Skill。

可以简单记：

``` text
Instruction
=
工作规则

Skill
=
工作方法
```

当然真实系统边界并不一定绝对清晰。

## Skill 和 Plan 也不是一回事

假设公司有一个通用项目依赖升级 Skill：

``` text
分析项目
→ 检查依赖
→ 升级
→ 编译
→ 修复兼容问题
→ 测试
```

这是可以跨项目复用的经验。

但今天某个具体项目实际计划可能是：

``` text
1. 基础运行环境无需调整
2. 升级公司统一依赖配置
3. 删除旧 log 配置
4. 项目使用第三方依赖，需要重点检查
5. 不使用 Spring Security
```

这是当前任务的 Plan。

所以：

``` text
Skill
=
这类事情通常怎么做

Plan
=
这一次具体怎么做
```

Plan 可以结合 Skill、当前项目 Context 和用户目标动态生成。

## 什么值得成为 Skill

并不是所有操作都值得做成 Skill。

如果某个任务只会发生一次，而且流程很短，那么直接写当前任务说明可能就够了。

Skill 更适合：

``` text
多人会重复执行
同一个人会多次执行
流程容易遗漏
需要稳定输出
过去经常需要人工纠正
```

例如：

``` text
Code Review
Bugfix
API Change
批量接口调整
数据库变更
发布检查
批量接口参数调整
```

这些都比较有 Skill 的价值。

## 规范性 Skill

Skill 不一定只是"实现某个功能"。

团队还可能沉淀一些规范性的工作方法，例如 `code-review`：

``` text
理解需求
→ 查看 git diff
→ 检查无关修改
→ 检查接口兼容
→ 检查异常处理
→ 检查 SQL
→ 检查测试
→ 输出问题等级
```

这类 Skill 的价值甚至可能比非常具体的业务 Skill 更高，因为它能在大量任务中复用。

## 角色定义是不是 Skill

例如：

``` text
你是一名资深 Java 开发工程师。
擅长 Spring Boot、MyBatis、Maven。
工作时不要修改无关代码。
```

技术上可能被某些 Harness 放进 Skill，但从概念上看它其实混合了：

``` text
角色 / Persona
Instruction
```

更适合将其理解为：

``` text
Role
→ Agent 是谁、负责什么

Instruction
→ Agent 必须遵守什么
```

如果具体 Harness 没有独立 Role 机制，再考虑用其他方式承载。

## Skill 还应该告诉 Agent 怎么证明完成

一个好的 Skill 不只是：

``` text
怎么做
```

还应该包含：

``` text
什么时候算做完
```

例如：

``` text
Completion Criteria

- Maven compile 成功
- 相关测试通过
- 指定修改全部完成
- git diff 已检查
```

这会把 Skill 从简单操作步骤提升为更完整的任务能力。

## 小结

Skill 可以概括为：

> Skill 是可以被 Harness/Agent 复用的任务工作方法。

它可以来源于过去多轮对话中的人工纠正，也可以来自团队已经稳定的 SOP。

最简单的 Skill 可能就是一份 `SKILL.md`，但真正关键的不是文件扩展名，而是它能被 Harness 发现、加载和使用。

下一步会继续遇到一个问题：

> Skill 可以告诉 Agent"怎么做"，但如果 Agent 需要访问数据库、外部业务系统等能力，这些 Tool 应该如何用统一的方式接入和发现？

这会引出一种重要的标准化方案：MCP。
