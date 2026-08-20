---
title: MCP 是什么：把外部能力标准化交给 LLM
date: 2026-08-20 14:57
tags:
  - AI
  - LLM
  - Harness
categories:
  - 技术
series: AI Agent Harness 入门
series_order: 4
---

理解 Skill 以后，我们很快遇到了另一个概念：MCP。

最初可以这样理解：

> Tool 是让 LLM 操作外部功能的能力，而 MCP 可以把外部能力和信息标准化接入支持它的 AI 应用，其中一部分可以作为 Tool 使用。

这个理解可以作为起点，但 MCP 并不只有 Tool。

MCP 的全称是 **Model Context Protocol**。

<!-- more -->

## 先从 Tool 说起

假设 Agent 需要查询数据库。

最直接的方式是 Harness 自己实现一个数据库 Tool：

``` text
query(sql)
```

LLM 调用它：

``` text
LLM
 ↓
query("select ...")
 ↓
Database
 ↓
Result
 ↓
LLM
```

问题是，不同 Harness、不同 Agent 应用都可能为同一个外部系统分别实现一套接入方式。

如果需要接入的能力还包括：

``` text
外部业务 API
工单系统
监控平台
知识库
数据库
```

每一种能力都需要分别适配，成本会越来越高。

MCP 可以先理解为：

> 用一套开放协议，让 AI 应用以相对统一的方式连接外部工具和数据源。

在这个过程中，通常由 Harness 或 AI 应用承担 MCP Host 的角色，并通过它管理的 MCP Client 连接 MCP Server，再把 Server 提供的能力暴露给 Agent：

``` text
Agent / LLM
    ↓
MCP Host（Harness / AI 应用）
    ↓
MCP Client
    ↓
MCP Server
    ↓
外部系统
```

因此模型本身不需要处理数据库连接、认证或 MCP 消息格式。

## 数据库 MCP 的例子

假设实现一个 SQL MCP Server。

它可以暴露：

``` text
Tools
├── query
├── explain
├── get_schema
└── get_indexes
```

Agent 不需要直接知道数据库连接细节，只需要通过 MCP 提供的能力完成工作。

例如：

``` text
用户：
分析这条 SQL 为什么慢

↓
LLM

↓ get_schema
SQL MCP

↓ explain
SQL MCP

↓
结果返回 LLM

↓
生成分析
```

这和普通 Tool 的使用体验很像。

因此最开始把 MCP 理解成"标准化 Tool 接入"并没有太大问题。

## MCP 不只有 Tools

继续了解后会发现，MCP 还可以提供其他类型的信息和交互能力。

为了建立心智模型，可以重点关注三个：

``` text
Tools
Resources
Prompts
```

### Tools：能做什么

Tools 最容易理解：

``` text
query()
explain()
create_ticket()
get_order()
```

它表达的是：

> 提供者（MCP Server）提供哪些可以执行的操作。

### Resources：提供者有什么信息

例如数据库 MCP 可能暴露 Schema、表结构等资源。

外部业务系统 MCP 也可能暴露：

``` text
接口定义
服务信息
配置资料
业务文档
```

可以把 Resource 暂时理解成：

> MCP Server 可以提供给 Agent 使用的信息资源。

MCP Server 暴露了 Resource，并不表示 LLM 已经知道其中内容。只有客户端读取并把它提供给模型后，它才会进入当前 Context。

### Prompts：提供哪些可复用交互模板

这一点最容易和 Skill 混淆。

假设 SQL MCP 提供一个：

``` text
analyze_slow_query
```

Prompt 模板：

``` text
分析慢 SQL 时：

1. 获取表结构
2. 获取索引
3. 执行 EXPLAIN
4. 分析扫描量
5. 判断索引使用
6. 输出优化建议
```

这相当于 SQL MCP 的提供者向客户端提供一个模板：

> 如果你要完成"慢 SQL 分析"这种典型任务，提供者推荐按这套模板使用当前能力。

Prompt 不会因为 MCP Server 提供了它就自动约束模型。只有用户或客户端选用它，并把相应内容加入当前交互后，它才会产生作用。

## 预定义 Prompt 为什么能让交互更稳定

如果用户只说：

> 看看这条 SQL 为什么慢。

LLM 可能自己决定先看 Schema，也可能直接执行 EXPLAIN，也可能漏掉索引。

如果用户或客户端选用 MCP 提供的预定义 Prompt，就可以把典型分析流程加入当前交互，使行为更稳定。

但需要注意：

> Prompt 更稳定，不代表天然更正确。

如果 Schema 本身错误、数据不足或者模型判断有问题，Prompt 也不能保证结果正确。

更准确的说法应该是：

> 预定义 Prompt 可以减少模型自由发挥，使典型交互更标准、更符合能力提供者的预期。

## Prompt 不是安全边界

例如 Prompt 写：

``` text
禁止 DELETE
```

不能因此认为数据库已经安全。

更可靠的层次是：

``` text
Prompt
"不要 DELETE"
→ 行为指导

Tool
"不提供写操作"
→ 能力限制

Permission
"写操作禁止"
→ 权限控制

Database Account
"只有 SELECT 权限"
→ 基础设施硬边界
```

越重要的安全限制，越不应该只依赖 LLM 听从 Prompt。

## MCP Prompt、Skill、Instruction 怎么区分

这三个最终都可能表现为自然语言，因此很容易混。

可以使用下面这个模型：

``` text
Instruction
=
在这个环境里必须遵守什么

Skill
=
Agent 完成某类任务通常怎么做

MCP Prompt
=
某个外部能力提供者提供、由用户或客户端选用的典型交互模板
```

例如：

``` text
公司规定禁止生产库写操作
→ Instruction

进行线上 Bugfix 时要经过哪些步骤
→ Skill

SQL MCP 提供慢 SQL 分析模板
→ MCP Prompt
```

它们可以同时存在，并不是互相替代。

## 一个组合起来的例子

假设任务：

> 修改订单查询接口，同时解决 SQL 性能问题。

可能出现：

``` text
Skill: api-change
    ↓
分析 Controller / Service / Mapper
    ↓
需要分析 SQL
    ↓
用户或客户端选用
    ↓
MCP Prompt: analyze_slow_query
    ↓
MCP Tools:
get_schema
get_indexes
explain
    ↓
LLM 分析
    ↓
继续 Skill
    ↓
修改代码
    ↓
mvn test
```

同时整个过程还受到项目 Instruction 约束。

这样就能看到：

> Skill 负责整个任务工作方法，被选用的 MCP Prompt 负责某个外部能力域中的典型交互，而 Tool 真正执行动作。

## 小结

MCP 可以先概括为：

-   MCP 可以标准化外部能力接入；
-   Tool 是其中最直观的一部分；
-   MCP 还可以提供 Resource 和 Prompt，但具体支持情况取决于客户端；
-   Prompt 是推荐交互模板，不是权限控制；
-   Skill 和 MCP Prompt 都可能是流程文本，但来源和作用范围不同；
-   数据库、内部服务等外部能力都可能通过 MCP 提供给 Agent。

理解这些以后，就可以重新回到最开始的 Harness：它显然已经不只是"LLM + Shell"了。
