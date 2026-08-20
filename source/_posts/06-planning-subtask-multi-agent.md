---
title: 从一个任务到多个 Agent：Planning、Subtask 与 Multi-Agent
date: 2026-08-20 15:50
tags:
  - AI
  - LLM
  - Harness
categories:
  - 技术
series: AI Agent Harness 入门
series_order: 6
---

Harness 已经可以通过 Loop 让 Agent 持续工作，但复杂任务还有另一个问题：

> 一个非常大的任务，是否应该一直在同一个 Loop 中跑到底？

例如：

> 升级当前服务中的一项关键依赖。

它可能包含：

``` text
分析项目
检查 JDK
升级依赖
API 兼容调整
依赖兼容处理
配置兼容处理
第三方组件兼容
编译
单测
集成测试
```

如果所有事情都混在一个巨大 Loop 里，Context、状态和目标都容易变得混乱。

<!-- more -->

## Planning：先决定怎么做

Planning 可以先理解为：

> 把"要完成什么"转换成"这一次准备怎么完成"。

例如：

``` text
Task:
升级目标依赖版本

↓ Planning

1. 分析当前项目
2. 确认目标版本
3. 检查 JDK
4. 检查依赖
5. 升级基础依赖
6. 处理兼容问题
7. 编译
8. 测试
9. 验证
```

Plan 不一定是固定模板，它应该结合当前项目实际情况。

## Skill 和 Plan 的区别

这两个概念很容易混。

Skill 可能写：

``` text
服务依赖升级通常：
分析 → 升级 → 编译 → 修复 → 测试
```

而当前项目 Plan：

``` text
1. 保持当前 JDK 和基础运行环境不变
2. 升级公司统一依赖配置
3. 逐一检查项目依赖
4. 处理第三方依赖兼容问题
5. 编译并运行测试
```

所以：

``` text
Skill
=
通用经验

Plan
=
当前任务的具体方案
```

可以理解成：

``` text
Skill
+
Current Context
+
User Task
 ↓
Planning
 ↓
Plan
```

## Subtask：把 Plan 拆成可跟踪的小任务

复杂 Plan 可以进一步拆成：

``` text
Main Task
│
├── Analyze Project
├── Upgrade Dependencies
├── API Compatibility
├── Dependency Compatibility
└── Test & Verify
```

这样 State 也更清楚：

``` text
✓ Analyze
✓ Dependencies
→ API 兼容调整
○ Hibernate
○ Test
```

Subtask 的意义不只是 Todo List。

每个 Subtask 都可以拥有更聚焦的 Context。

例如 Dependency Compatibility 阶段可能只需要：

``` text
总任务目标
当前 Subtask
Hibernate 相关代码
相关 Skill
当前编译错误
```

而不需要把前面所有 Security、Controller 和 Maven 历史全部带进来。

因此任务拆分也能帮助 Context Management。

## 谁负责 Planning

一种方式是 LLM 自己规划：

``` text
Harness
 ↓
LLM
 ↓
生成 Plan
 ↓
LLM 按 Plan 执行
```

另一种方式是 Harness 把 Plan 结构化管理：

``` text
Task
├── Subtask A [DONE]
├── Subtask B [RUNNING]
└── Subtask C [PENDING]
```

然后 Harness 根据依赖关系选择下一个任务、准备 Context、执行 Loop、更新 State。

这就开始进入真正的 Orchestration。

## Sub-Agent 为什么出现

既然任务已经拆成多个 Subtask，自然会出现：

> 为什么所有 Subtask 都必须由同一个 Agent 完成？

不一定。

例如：

``` text
Main Task
   │
   ├── Database Analysis
   ├── Code Change
   ├── Test
   └── Code Review
```

可以分别交给不同 Agent。

每个 Agent 甚至可以使用同一个底层模型，但拥有不同的配置和工作上下文：

``` text
Developer Agent
Context = Java 代码
Tools = File + Shell
Permission = 可修改

Reviewer Agent
Context = Requirement + Git Diff
Tools = Read Only
Permission = 不可修改

Database Agent
Context = Schema
Tools = Database MCP
Permission = SELECT Only
```

因此：

> Agent 的角色差异不一定来自不同模型，也可能来自不同
> Context、Instruction、Skill、Tool 和 Permission。

## Multi-Agent 的潜在价值之一：Context 隔离

假设 Database Agent 为了分析 SQL 工作了三十轮。

Developer Agent 没必要继承全部历史。

Database Agent 最终只交付：

``` text
数据库分析结果：
- 当前索引情况
- SQL 问题
- 建议方案
```

Developer Agent 只接收这个结果。

于是：

``` text
巨大 DB Context
 ↓
压缩为 Result
 ↓
Developer Context
```

这可以明显降低不同工作之间的 Context 污染。

但这种隔离来自具体的编排策略，而不是创建多个 Agent 后自动获得。Orchestrator 需要控制输入、过滤历史或压缩交付结果；如果直接 Handoff 完整对话历史，下一个 Agent 仍然可能继承大量 Context。

## Orchestrator

多个 Agent 出现以后，就需要某种 Orchestration 机制。它可以由中央 Manager Agent、Agent 之间的 Handoff、Harness 中的确定性代码，或者几种方式共同实现。

下面先以中心化 Orchestrator 为例。

Orchestrator 需要处理：

``` text
任务怎么拆
谁执行
哪些任务可以并行
哪些任务有依赖
结果怎么汇总
失败怎么办
什么时候完成
```

例如：

``` text
Analysis ──┐
           ├── Developer → Test → Review
Database ──┘
```

Analysis 和 Database 可以并行，但 Developer 必须等待它们完成。

任务没有逻辑依赖，也不代表一定可以安全并行。如果多个 Agent 会修改相同文件或共享外部状态，还需要工作区隔离、锁定或结果合并策略。

这已经不仅是 LLM → Tool 的简单 Loop，而是 Task Graph、Dependency 和 Scheduling。

## Multi-Agent 不是越多越好

这是必须保留的认识。

如果只是：

> Controller 增加一个参数。

却拆成：

``` text
Controller Agent
Service Agent
Mapper Agent
Test Agent
Review Agent
```

很可能只是增加：

``` text
Context 交接
Token 成本
状态同步
误解风险
调度复杂度
```

因此更合理的是：

``` text
简单任务
→ Single Agent

复杂任务
→ Planning + Subtask

需要明显 Context / 权限 / 专业能力隔离
→ Sub-Agent

确实需要多个角色协同
→ Multi-Agent
```

## 小结

这一层可以压缩成：

``` text
Task
=
要完成什么

Skill
=
这类事情通常怎么做

Plan
=
这一次具体怎么做

Subtask
=
把 Plan 拆成边界明确、可以跟踪和调度的任务单元

Sub-Agent
=
针对某个 Subtask 配置或调用的专门 Agent，可以拥有独立的 Context、Instruction、Tool 和 Permission

Orchestrator
=
负责多个任务和 Agent 的协调
```

Multi-Agent 并不天然比 Single Agent 高级。真正应该考虑的是：任务拆分带来的收益，是否超过协调成本。

接下来还有一个更现实的问题：即使 Agent 顺利执行完了，它说"完成了"，是否真的代表任务完成？
