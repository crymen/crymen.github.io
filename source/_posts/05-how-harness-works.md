---
title: Harness 到底在做什么：Loop、Context 与 State
date: 2026-08-20 15:34
tags:
  - AI
  - LLM
  - Harness
categories:
  - 技术
---

经过 Tool、Context、Instruction、Skill 和 MCP 以后，可以重新回答最开始的问题：

> Harness 到底是什么？

最初把它理解成：

``` text
Harness = LLM + Tools
```

现在这个定义已经明显不够。

更适合将其理解为：

> Harness 是把
> LLM、上下文、规则、工具和执行过程组织起来，让模型能够围绕一个任务持续工作的运行与编排环境。

<!-- more -->

## Agent Loop

先从最重要的 Loop 开始。

假设任务是：

> 编译项目并解决编译问题。

Agent 执行：

``` text
读取 pom.xml
 ↓
mvn compile
 ↓
发现私有依赖缺失
 ↓
搜索 Workspace
 ↓
找到依赖项目
 ↓
mvn install
 ↓
重新 mvn compile
```

从系统角度看，其实是：

``` text
Harness 准备 Context
        ↓
       LLM
        ↓
判断下一步
        ↓
      Tool
        ↓
     Result
        ↓
Harness 更新 Context
        ↓
       LLM
        ↓
再次判断
```

不断循环。

这就是 Agent Loop 的基础形态：

``` text
Decide
→ Act
→ Observe
→ Decide
→ Act
→ Observe
```

直到完成、失败或者需要人工输入。

## Context Management

长任务不能简单把所有历史永远塞给模型。

例如一次升级任务可能产生：

``` text
200 次文件读取
50 次 Maven 编译
大量错误日志
几十个代码修改
大量对话
```

但当前正在解决 Hibernate 问题时，真正需要的可能只有：

``` text
当前目标
项目规则
当前任务状态
相关 Java 文件
pom.xml
最近一次编译错误
```

因此 Harness 需要帮助管理 Context：

``` text
选择
裁剪
摘要
保留
重新读取
```

例如一份五千行 Maven 日志在问题解决后，可以只留下：

``` text
Hibernate 旧 CustomType 不兼容。
已迁移新 API。
mvn compile 已通过。
```

这样才能让长任务持续运行。

## Task、Session 和 State

接下来是三个容易混的概念。

不同 Harness 对 Task、Session 和 State 的命名与边界可能不同，下面仍然只建立阶段性的心智模型。

### Task

Task 表示：

> 要完成什么。

例如：

``` text
完成当前服务的依赖版本升级
```

### Session

Session 更像：

> 一段可以持续和恢复的交互历史。

它可能跨越多次 Agent Run，并在后续交互中继续使用。

可能包含：

``` text
用户消息
模型输出
Tool Calls
Tool Results
与文件操作有关的记录
```

### State

State 回答：

> 任务或 Agent Run 当前处于什么工作状态。

任务进度是其中最直观的一部分。例如：

``` text
Service Dependency Upgrade

✓ 分析项目
✓ 升级统一依赖配置
✓ API 兼容调整
→ Hibernate 兼容
○ Test
```

根据具体实现，State 还可能包含当前步骤或 Agent、中间结果、待处理的 Tool Call、人工审批、重试次数以及恢复执行所需的信息。

所以可以简单记：

``` text
Task
=
要去哪

State
=
当前处于什么工作状态

Session
=
这一路发生了什么
```

## State 和 Context 不一样

这是很关键的区别。

完整 Session 可能非常庞大，但 State 可以很小：

``` text
已完成：
- 统一依赖配置升级
- API 兼容调整

当前：
- Hibernate

待完成：
- Test
```

Current Context 则是当前这一轮 LLM 实际拿到的信息。

因此：

``` text
State
→ 描述任务或 Agent Run 的当前工作状态

Context
→ 当前推理材料
```

Harness 可以根据 State 决定应该重新给模型哪些信息。

## Harness 还负责 Tool 和权限

LLM 判断：

> 应该执行 git push。

并不代表真实环境一定允许。

中间可以存在：

``` text
LLM
 ↓
Tool Call
 ↓
Harness Permission
 ↓
Allow / Confirm / Deny
```

例如：

``` text
read_file   自动
mvn test    自动
git commit  确认
git push    确认
生产库写入  禁止
```

因此 Harness 也是 LLM 与真实环境之间的一层控制。

## Harness 什么时候结束或暂停任务

Agent Loop 不能无限持续。

任务可能以这些状态结束：

``` text
Completed
Failed
Cancelled
```

也可能进入暂停状态，等待条件满足后继续：

``` text
Blocked
Needs Human Input
```

除此之外，Harness 通常还需要设置最大轮数、超时、Token 或成本预算，以及连续失败次数等工程限制，避免 Loop 无边界运行。

例如缺少 Maven 仓库访问配置时，一个成熟的结果不是无限重试，而是：

``` text
Blocked

原因：
缺少 Maven 仓库访问权限。

已经尝试：
- 检查本地仓库
- 检查 Workspace
- 确认依赖未缓存

需要：
有效的 Maven 仓库访问配置。
```

得到有效配置后，Harness 可以根据保存的 State 恢复执行。知道什么时候不能继续、什么时候可以恢复，本身也是 Harness 工程能力的一部分。

## 当前的 Harness 心智模型

现在可以把它扩展成：

``` text
Harness
│
├── LLM
├── Agent Loop
├── Context Management
├── Task / Session / State
├── Instructions
├── Skills
├── Tools
├── MCP
└── Permissions
```

其中 LLM 负责理解和推理，Harness 更偏向于：

> 给这个大脑准备工作环境，并维持它持续、有状态、受控地工作。

可以用一句话概括：

> Harness 不负责替 LLM 变聪明，而是负责让 LLM
> 能够持续、有状态、受控地聪明下去。

## 小结

此时就不应再把 Harness 看成一个"可以执行 Shell 的 Chat"。

它更像 Agent 的运行框架：

-   Loop 维持持续工作；
-   Context Management 管理模型当前看到的信息；
-   State 记录任务或 Agent Run 的当前工作状态；
-   Tool 连接真实环境；
-   Permission 控制实际执行边界；
-   Instruction 和 Skill 提供规则与工作方法。

接下来如果任务变得非常复杂，一个新的问题会出现：

> 一个巨大 Task 是否应该一直在同一个 Loop 中执行？

这会进入 Planning、Subtask 和 Multi-Agent。
