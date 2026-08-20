---
title: Context 与 Instruction：LLM 到底"知道"什么
date: "2026-08-20 11:31"
tags:
  - AI
  - LLM
  - Harness
categories:
  - 技术
---

上一篇把 Harness 暂时理解成了"LLM + Tools"。有了文件读取和终端能力以后，LLM 可以真正进入项目工作。

但很快会遇到第二个问题：

> 项目里有几千个文件，LLM 是不是天然知道整个项目？

答案显然不是。

这就需要理解 Context。

<!-- more -->

## 文件存在，不等于 LLM 知道

假设项目中存在：

``` text
Controller
Service
Mapper
Entity
pom.xml
README.md
几千个其他文件
```

这些文件存在于磁盘上，但当前这一轮 LLM 推理时，并不会自动获得全部内容。

如果任务是：

> 修改用户查询接口。

Agent 可能先搜索 `UserController`，然后读取 Controller，再根据调用关系读取 Service 和 Mapper。

于是当前模型真正能使用的信息可能是：

``` text
用户需求
+
UserController
+
UserService
+
UserMapper
+
刚刚执行 Tool 得到的结果
```

这些真正提供给当前模型的信息，可以先统称为 **Context**。

因此一个很重要的认识是：

> 项目里存在的信息，不等于当前 Context 中的信息。

模型如果没有读取某个文件，也没有通过其他方式得到其中的内容，就不能假设它已经知道。

## Context Window 是有限的

问题进一步出现。

假设项目有一万个文件，不可能每次都把整个仓库塞给模型。

即使理论上 Context Window 很大，也不意味着应该无限塞入信息。

因为长任务中还会不断产生：

``` text
文件内容
Shell 输出
Maven 错误
Git Diff
用户补充要求
Agent 输出的消息、计划与阶段性总结
```

如果全部长期保留，Context 会越来越臃肿。

因此 Harness 需要解决：

``` text
什么应该读取？
什么应该保留？
什么可以丢弃？
什么应该摘要？
什么时候重新读取原文件？
```

这就是后面会进一步讨论的 Context Management。

## Instruction 又是什么

Context 解决"模型当前知道什么"，但项目开发还有另一类信息：

> 无论当前修改哪个文件，都应该遵守什么规则？

例如：

``` text
禁止修改无关业务代码
禁止通过删除测试让测试通过
不随意修改与当前任务无关的依赖版本
修改接口后必须检查兼容性
```

这些信息不只是某个文件的事实，而是在约束 Agent 的行为。

可以把它们理解为 **Instruction**。

简单来说：

``` text
Context
=
当前工作需要知道什么

Instruction
=
当前工作必须遵守什么
```

从模型输入的角度看，Instruction 最终也会成为 Context 的一部分。这里区分的是信息在系统中承担的角色，而不是两套完全分离的数据。

## Instruction 与普通聊天要求的区别

当然可以在聊天中临时告诉 Agent：

> 不要修改无关代码。

但如果这是所有任务都长期成立的项目规则，每次重复说明显然很浪费。

更合理的是把稳定规则放到 Harness 能持续加载的位置，让 Agent 在不同任务中都能得到它。

例如：

``` text
Project Instructions

- 不修改需求范围之外的业务逻辑
- 不通过跳过测试掩盖错误
- 高风险 Git 操作需要人工确认
```

这样它就从一次对话里的临时要求，变成了项目工作环境的一部分。

## Context 和 Instruction 可能同时来自 Markdown

这里容易产生一个误区：是不是 Markdown 文档就是 Knowledge，某种配置才是 Instruction？

不一定。

从 LLM 最终看到的角度，它们都可能只是一段文本。

区别更重要的是它们在系统中扮演的角色。

例如：

``` text
“订单表逻辑删除字段是 deleted”
```

这是项目中的 Knowledge。只有当它被读取、检索或通过其他方式提供给模型时，才会成为当前 Context 的一部分。

而：

``` text
“禁止直接物理删除订单数据”
```

则是一条 Instruction。它同样需要被加载到当前 Context 中，才能约束模型的行为。

甚至同一个项目文档中可以同时包含事实和规则。

## 为什么 Context 管理会影响 Agent 表现

使用 Coding Agent 时经常会出现一种体验：

> 前面明明已经告诉过它，为什么后面又像忘了一样？

这不一定只是"模型记忆差"。

可能的过程是：

``` text
第 5 轮：
某条要求进入 Context

↓ 长任务持续执行

大量文件、日志、Tool Result 进入 Context

↓ 整理/压缩

原来的信息没有被很好保留

↓ 第 50 轮

模型已经看不到那条要求
```

因此：

> Session 中曾经发生过，不等于当前 Context 里仍然存在。

这也是为什么长期稳定规则不应该完全依赖几十轮之前的一句聊天。

## 一个 Java 项目中的例子

假设任务是：

> 给某个接口增加一个非必填参数。

当前 Context 可能逐步变化：

``` text
第一轮：
需求 + 项目规则

第二轮：
需求 + 项目规则 + Controller

第三轮：
需求 + 项目规则 + Controller + Service

第四轮：
需求 + 项目规则 + Mapper + 调用方

第五轮：
需求 + 项目规则 + 修改结果 + Maven 输出
```

Harness 并不一定需要让所有历史文件永久存在于每一轮 Context。

它需要尽量保证当前决策所需的信息足够，同时避免重要规则在整理过程中丢失。

## 到这里的心智模型

上一篇：

``` text
Harness
=
LLM + Tools
```

现在可以多加两项：

``` text
Harness
=
LLM
+
Tools
+
Context Management
+
Instructions
```

当然这仍然只是一个阶段性简化。

下一步会出现一个新的问题：

> 如果每次修改接口，都要通过多轮对话提醒 Agent："检查调用方、确认兼容性、编译、测试、检查 `diff`"，这些重复的工作经验能不能直接保存下来？

这就进入 **Skill**。

## 小结

这一阶段最重要的几个认识是：

-   磁盘上存在的文件，不等于 LLM 当前知道；
-   LLM 真正用于当前推理的是 Context；
-   Context Window 是有限资源，需要选择、裁剪和整理；
-   Instruction 用来描述工作中需要持续遵守的规则；
-   长任务里"曾经说过"不代表后续模型一定还能看到；
-   Harness 不只是给 LLM Tool，也需要帮助它管理当前工作信息。
