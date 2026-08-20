---
title: Memory、Knowledge 与 RAG：Agent 的信息从哪里来
date: 2026-08-20 16:17
tags:
  - AI
  - LLM
  - Harness
categories:
  - 技术
series: AI Agent Harness 入门
series_order: 8
---

在刚接触 Harness 时，对 Memory、Knowledge 和 RAG 基本没有概念。

第一次看到这些词，很容易把它们都理解成：

> 给 LLM 更多资料。

<!-- more -->

但从 Context 出发，它们其实很好理解。

## 先回到 Context

LLM 当前进行一次推理时，真正能直接使用的是 Current Context。

假设我们问：

> 项目为什么通过统一依赖配置管理 Spring Boot 版本？

模型自身可能知道 Spring Boot、Maven、Dependency Management 等公共知识，但它天然不知道公司的内部设计。

因此最终都需要：

```text
Information
 ↓
Current Context
 ↓
LLM
```

Memory、Knowledge 和 RAG 都可以围绕这个过程理解。

## Knowledge：Agent 外部可用的知识

假设公司有：

```text
architecture.md
dependency-management.md
api-rules.md
database-design.md
```

其中写着：

```text
项目通过统一的 Maven 依赖管理配置维护框架与公共依赖版本。
```

这些信息独立存在于 Agent 之外。

即使 Agent 从来没有看过，文档依然存在。

因此可以先把 Knowledge 理解成：

> Agent 可以使用的外部知识。

来源可能包括：

```text
Markdown
Wiki
PDF
Git Repository
数据库
接口文档
内部平台
```

本文所说的 Knowledge，主要指 Agent 外部可访问的事实、规则和资料。模型参数中也包含公共知识，但这里关注的是 Harness 可以按需读取、检索和管理的外部 Knowledge。

## Knowledge 不等于 Context

公司可能有十万份文档。

显然不能：

```text
十万份 Knowledge
 ↓
全部塞入 Context
```

所以真正的问题是：

> 当前任务需要其中哪些？

这就进入 Retrieval。

## RAG：先查资料，再让 LLM 回答

RAG 全称：

> Retrieval-Augmented Generation。

可以先简单理解为：

> 根据当前问题检索相关信息，把结果加入 Context，再让 LLM
> 基于这些信息生成结果。

流程：

```text
用户问题
 ↓
Retrieval
检索相关资料
 ↓
Candidate Information
 ↓
Filter / Rerank / Permission Check
 ↓
Relevant Information
 ↓
Augmentation
加入 Context
 ↓
LLM
 ↓
Generation
生成结果
```

所以 RAG 不只是"搜索"。

它包含：

```text
检索
+
Context 增强
+
生成
```

## 什么时候直接 grep 就够了

如果知识量很少，完全可以直接 grep。

例如只有：

```text
architecture.md
api-rules.md
dependency.md
```

为了这三个文件建设复杂 RAG 系统明显没有必要。

但 `grep` 和 RAG 并不互斥。`grep`、全文检索、数据库查询和向量检索都可以承担 Retrieval；只要检索结果被加入 Context 并用于生成，就可以构成广义的 RAG 流程。RAG 也不等于向量数据库，关键词搜索同样可以成为它的检索方式。

随着知识规模增长，RAG 的价值通常会更明显。但规模不是唯一原因：当知识经常变化、属于私有领域、需要引用来源、必须按权限过滤，或者不适合全部放入 Context 时，检索增强同样有价值。

而且现代检索可以不只依赖关键词。

例如用户问：

> 退款以后用户奖励怎么处理？

文档写的是：

> 全额退款后撤销已发放积分。

关键词不完全一致，但语义检索可能判断"用户奖励"和"积分"相关，从而找到资料。

这里会涉及 Embedding、Vector Search、Rerank 等实现技术，但在理解 Harness 的阶段暂时没必要深入。

先记住：

> RAG 是一种把相关外部信息按需检索进 Context，并用于生成结果的技术模式。

## Memory：过去发生过什么值得以后继续使用

Memory 解决的是另一个问题。

例如昨天升级项目时，告诉 Agent：

> Hibernate 暂时不要处理，先完成 Jakarta。

今天继续任务时，如果昨天的完整 Context 已经不存在，Agent 怎么知道这个决定？

可以保存：

```text
Memory:
本次升级暂缓 Hibernate，优先 Jakarta。
```

新 Session 中：

```text
当前任务
 ↓
检索相关 Memory
 ↓
"Hibernate 暂缓"
 ↓
Current Context
 ↓
LLM
```

因此这里可以把 Memory 理解成：

> 从过去交互和工作过程中保留下来、未来可能再次使用的信息。

Memory 没有跨框架统一的严格定义。Session Memory 可能保存完整对话历史，长期 Memory 也可能只保留从历史任务中提炼出的偏好、经验或事实。本文主要把它理解为从过去交互或工作过程中保留下来、未来可能再次进入 Context 的信息。

Memory 可以是短期，也可以长期。

关键不是保存多久，而是它来自过去的经历。

Memory 也不是保存得越多越好。可靠的 Memory 机制还需要考虑信息来源、作用域、更新时间、过期策略、访问权限和删除能力，避免过期、冲突或敏感信息被错误带入后续任务。

## Memory 和 Knowledge 的区别

一个简单例子：

```text
"Spring Boot 版本由公司统一依赖配置管理"
```

如果它来自正式公司文档，是 Knowledge。

而：

```text
"昨天决定这次升级暂时不处理某组件"
```

来自过去任务过程，更像 Memory。

可以粗略记：

```text
Knowledge
=
外部本来就存在的知识

Memory
=
过去工作过程中保存下来的信息
```

当然真实系统中它们可以相互转化。

## Memory 可以转成 Knowledge 或 Instruction

例如第一次任务发现：

```text
某项目依赖在目标依赖版本下必须升级到 3.2
```

先作为本次升级过程中的 Memory。

后续多个服务都验证成立，而且确认这是公司长期事实，就可能整理进：

```text
dependency-management.md
```

成为 Knowledge。

如果进一步确认：

> 所有业务服务都禁止自行覆盖该依赖版本。

那么执行任务时它还可以作为 Instruction。

因此信息不是一出生就永久属于某个分类。

更重要的是：

> 它当前在 Agent 系统里扮演什么角色？

## State 和 Memory 也不同

State：

```text
✓ 统一依赖配置升级
→ 第三方依赖兼容
○ Test
```

回答：

> 当前任务做到哪里了？

Memory：

```text
之前确认某内部组件不能自行升级。
```

回答：

> 过去有什么信息值得现在继续使用？

Task 完成以后，很多 State 没有长期价值。

Memory 也不一定都要长期保存。

## 一次性任务不需要建设完整知识体系

这里有一个很重要的实践结论。

假设一批服务只进行一次服务依赖升级。

过程中产生的大量兼容经验未必都值得进入长期 Knowledge。

完全可以：

```text
当前 Task 需要
→ Context / State

后续几个服务需要复用
→ Task-scoped Memory

整个升级结束后不再需要
→ 丢弃
```

这里的 Task-scoped Memory 是一种角色描述；在具体 Harness 中，它也可能被实现成持久化 State，而不一定被命名为 Memory。

只有真正长期稳定、多人会重复使用的信息，才值得继续沉淀。

例如：

> 项目统一使用约定的 Maven 依赖管理方式。

这显然比某个历史服务的特殊第三方依赖 Bug 更值得成为长期 Knowledge。

## RAG 也不是 Agent 的标配

理解 RAG 后，很容易产生：

> 是不是做 Agent 就要向量数据库？

并不是。

如果当前项目只有几份明确文档，直接读取文件可能更简单、更可靠。

更合理的顺序是：

```text
先整理有价值的 Knowledge
 ↓
明确当前任务需要什么
 ├─ 文件少、位置明确 → 直接读取或关键词搜索
 └─ 规模、语义、时效、引用或权限要求变复杂 → 考虑完整 RAG 流程
```

而不是为了"做 AI"先建设一套复杂检索平台。

## 最后的心智模型

到这里，可以把几个概念压缩成：

```text
Context
=
LLM 这一轮真正能看到的信息

Knowledge
=
外部已经存在、Agent 可以使用的知识

Memory
=
过去工作过程中保存下来、未来可能复用的信息

RAG
=
检索相关信息
→ 加入 Context
→ 让 LLM 基于它生成结果
```

最终很多信息都会汇入：

```text
Instruction ───────────────────────────┐
Skill ─────────────────────────────────┤
State ─────────────────────────────────┤
Tool Results ──────────────────────────┤
                                       ├──→ Current Context → LLM
Memory / Knowledge / Files             │
        ↓                              │
Direct Read / Retrieval                │
        ↓                              │
Candidate Information                  │
        ↓                              │
Filter / Rerank / Permission Check     │
        ↓                              │
Relevant Information ──────────────────┘
```

这也是目前理解 Agent Harness 信息体系最基础、也最实用的一张地图。

至此，从 Chat、Tool、Context、Instruction、Skill、MCP，到 Harness、Planning、Multi-Agent、Verification、Memory、Knowledge 和 RAG，第一轮理论学习基本形成了完整框架。

下一阶段不应该继续堆概念，而应该真正拿一个项目去跑，在真实任务中观察这些东西究竟如何工作。
