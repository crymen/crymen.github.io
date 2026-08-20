---
title: Agent 怎么证明自己做完了：Verification、Guardrail 与 Recovery
date: 2026-08-20 16:11
tags:
  - AI
  - LLM
  - Harness
categories:
  - 技术
series: AI Agent Harness 入门
series_order: 7
---

Agent 可以读取文件、修改代码、执行 Maven，甚至可以规划任务和调用多个 Sub-Agent。

但最终还有一个非常现实的问题：

> Agent 说"已经修复"，凭什么相信？

<!-- more -->

这就需要 Verification。

## Agent Claim 不等于完成

例如 Bugfix：

```text
读取代码
 ↓
发现问题
 ↓
修改
 ↓
"问题已修复"
```

至少还存在：

```text
能编译吗？
测试通过吗？
满足需求吗？
有没有破坏旧功能？
有没有无关修改？
```

因此一个可靠的 Agent 不能只靠自己的语言判断宣布完成。

## Verification：用证据证明完成

最简单的代码验证：

```bash
mvn compile
mvn test
git diff
```

它们分别提供不同证据。

`BUILD SUCCESS` 可以证明代码至少能完成当前编译。

测试结果可以证明已有测试集没有发现问题。

`git diff` 可以检查到底改了什么。

因此：

```text
Agent Claim
"完成了"
    ↓
Verification
    ↓
Evidence
```

Evidence 可以来自：

```text
编译结果
测试结果
接口响应
数据库查询
静态检查
Git Diff
```

重要原则是：

> 尽可能不要让 LLM 自己的判断成为唯一完成依据。

## Completion Criteria

Skill 中的完成条件也因此变得重要。

例如：

```text
Completion Criteria

- 指定修改已经完成
- Maven compile 成功
- 相关测试通过
- git diff 中没有无关修改
```

Agent Loop 可以变成：

```text
修改
 ↓
Verification
 ↓
满足完成条件？
 ├─ No → 继续处理
 └─ Yes → Complete
```

一个好的 Skill 不只是告诉 Agent 怎么做，也应该告诉它怎么证明自己做完。

## 没有测试怎么办

历史 Java 项目经常没有完善测试。

这时不应该为了使用 Agent，先把整个项目测试体系补齐。

更现实的是按风险建立最低验证依据：

```text
最低要求
- compile
- 应用正常启动
- 关键配置正常
- diff 检查

修改到哪里
- 对对应兼容点补验证

关键业务
- 少量 smoke test
```

如果第三方依赖 API 因升级发生代码修改，就重点验证对应受影响功能。

如果只是 POM 依赖调整、业务代码完全没变，也没有必要为了形式给整个项目补大量单元测试。但依赖变更仍可能影响传递依赖、运行时兼容性、配置加载和安全风险，因此至少应该检查依赖解析、编译、应用启动和受影响功能的 smoke test；必要时还要检查依赖树与安全风险。

测试的目的不是满足 Skill 格式，而是提供可靠证据。

## Evaluation：不仅做完，还要看做得怎么样

即使 `mvn test` 全部通过，也不能证明实现一定合理。

可能出现：

```text
测试覆盖不足
性能明显下降
实现破坏架构
存在安全问题
修改范围过大
```

因此还可以有 Evaluation：

```text
Correctness
Compatibility
Maintainability
Performance
Security
Scope Control
```

Code Review 就可以看成一种 Evaluation。

Verification 更关注是否满足明确的完成条件；Evaluation 则关注完成质量如何，既可以用于当前任务的质量审查，也可以跨任务、跨数据集进行系统评估。两者可能使用相同证据，也不一定是严格前后相邻的两个阶段。

甚至可以让 Reviewer Agent 独立执行：

```text
Developer Agent
 ↓
修改代码
 ↓
Compile / Test
 ↓
Reviewer Agent
 ↓
需求 + Diff + 测试结果
 ↓
Evaluation
```

执行者和评价者分离，有时比让同一个 Agent 自己评价自己更有效。但角色分离并不自动等于评价独立：如果两个 Agent 使用相同模型、相同上下文和相似指令，错误仍可能高度相关。独立 Context、不同检查工具和确定性验证都可以进一步降低这种风险。

## Guardrail：为执行划定边界

Verification 关注结果是否满足完成条件。

Guardrail 则关注输入、输出和操作是否满足预先设定的约束；检查既可以发生在执行前，也可以发生在执行过程中或产生结果之后。不满足约束时，Harness 应该阻止、拒绝或升级处理。

例如数据库 Agent：

```text
允许：
SELECT
EXPLAIN
SHOW

禁止：
DROP
TRUNCATE
DELETE
UPDATE
INSERT
```

这只是一个简化示例。即使只允许读取，查询仍可能暴露敏感信息、消耗大量资源，某些数据库函数也可能产生副作用。因此还需要结合数据范围、查询超时、资源限制和审计机制。

安全控制可以有不同层级：

```text
Instruction
"不要 DELETE"
→ 软约束

Tool
"不提供写操作"
→ 能力约束

Permission
"写操作禁止"
→ 权限约束

数据库账号
"只授予必要的只读权限"
→ 硬边界
```

重要操作越危险，越不能只依赖 Prompt。

## Human-in-the-loop

人工确认本身也是 Guardrail。

例如：

```text
读取文件    自动
修改代码    自动
mvn test    自动
git commit  确认
git push    确认
生产变更    禁止或严格审批
```

Agent 自动化的目标并不是取消所有人工参与，而是把人工放在真正高风险和高价值的决策点。

## Retry：失败后不是原样再来一次

Tool 失败很正常。

例如：

```text
mvn test
→ BUILD FAILURE
```

健康的 Retry 应该是：

```text
失败
 ↓
Observe
 ↓
分析原因
 ↓
改变策略
 ↓
Retry
```

而不是：

```text
失败
 ↓
原样重试
 ↓
失败
 ↓
原样重试
```

否则只是死循环。

并不是所有失败都适合重试。Retry 还应该满足几个条件：

```text
失败具有可恢复性
设置最大重试次数和退避策略
确认操作具备幂等性，或能识别上一次是否已经成功
```

对于写数据库、发送消息或调用支付接口等存在副作用的操作，盲目重试可能导致同一动作被执行多次。

## Recovery：当前路径错了怎么办

Retry 解决当前步骤失败。

Recovery 更像：

> 当前执行状态已经不可靠，需要回退到一个合理状态再继续。

例如 Agent 为了解决依赖问题错误修改了 `pom.xml`，导致更多冲突。

这时可能：

```text
检查 git diff
 ↓
识别错误修改
 ↓
恢复
 ↓
重新分析
 ↓
换方案
```

Git、Checkpoint、Task State 都可以帮助恢复。

但恢复之前必须区分 Agent 本轮产生的修改和使用者原有的工作，不能为了回退任务状态而覆盖无关改动。Checkpoint 也应该是明确、可追踪且作用域受限的恢复点。

## Harness 还需要知道什么时候停止

失败并不意味着一定要无限重试。

任务可能合理结束为：

```text
Completed
Failed
Blocked
Needs Human Input
Cancelled
```

例如缺少 Maven 仓库凭证：

```text
Blocked

原因：
无法访问目标 Maven 仓库。

已尝试：
- 检查本地仓库
- 检查 Workspace
- 确认依赖不存在

需要：
Maven 仓库访问配置
```

知道"现在无法继续"比继续胡乱修改更可靠。

## 小结

到这里，"Agent 自动化"已经变成一个可靠性工程问题。

真正可靠的流程应该包含：

```text
执行
→ Verification
→ Evaluation
→ 完成

失败
→ Diagnose
→ Retry / Recovery
→ 继续或停止
```

外围还有 Permission、Guardrail 和 Human Approval。

目标不是让模型更自信，而是让模型的结论尽可能有外部证据支持，并且让失败成为一种可管理的状态。
