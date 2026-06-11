# 文档索引（docs/index.md）

> **项目**：伊春有事儿说（Yichun You Shi Er Shuo）
> **作用**：本文件是 `docs/` 的**唯一入口**。任何新会话先读本文件,再按需跳转到具体文档。
> **维护**:每新增/移动/废弃文档时同步更新本文件。
> **最后更新**:2026-06-11(v2 复验后:F-1~F-6 全部通过,见 §3 冲突 1)

---

## 0. 30 秒了解项目

伊春本地分类信息平台(V1 MVP),4 大模块:房屋出租 / 二手交易 / 招聘求职 / 便民信息。
栈:Next.js 15 + NestJS 10 + Prisma 5 + MySQL 8 + Redis 7 + Docker Compose。
进度:后端 ~95%、用户端前端 ~70%、管理后台前端已搭建、**V1.0 P0 阻塞已全部清除(2026-06-11 v2 复验通过),剩余 P1 + 手动事项不阻塞 V1 冒烟**。

---

## 1. 文档地图(按"读取目的"导航)

### 1.1 我想了解项目本身(架构 / API / DB)

→ [ARCHITECTURE.md](./ARCHITECTURE.md)(V1 架构基线,几乎不变)
> 含:产品功能矩阵、数据库 ER 图、MySQL 表设计、API 规范、目录结构、58 项任务拆分。
> **注意**:这是 2026-06-09 写的**计划版**,实际结构以 [project-memory.md](./project-memory.md) §1 为准。

### 1.2 我想知道项目现在到底是什么状态

→ [project-memory.md](./project-memory.md)(状态快照)
> 含:已完成模块清单、API 实际状态、当前缺口、下一步任务、关键文件跳转。
> **注意**:文件声称 P0 25/25 完成,但 [acceptance-report](./acceptance-report-2026-06-11.md) 验收发现 4 项 P0 阻塞,见 §3。

### 1.3 我想知道未来要做什么

→ [development-roadmap.md](./development-roadmap.md)(V1.0 → V2 路线图)
> 含:12 周排期、MUST-N / SHOULD-N / NEXT-N 任务、关键里程碑、资源需求。

### 1.4 我想看代码层面的具体实施步骤

→ `docs/superpowers/plans/` 下的 plan 文件(每个 plan 对应一个任务批次)
- [2026-06-11-p0-critical-batch.md](./superpowers/plans/2026-06-11-p0-critical-batch.md) — 13 项 P0 实施步骤
- [2026-06-10-bugfix-and-refactor.md](./superpowers/plans/2026-06-10-bugfix-and-refactor.md) — 24 项 bug 修复 + 测试基建

> **注意**:这两个 plan 大量重叠(都覆盖 MUST-1~13),06-11 的更新,06-10 的可视为历史。

### 1.5 我想知道历史发生了什么(审计 / 验收)

→ [audit-report-2026-06-11.md](./audit-report-2026-06-11.md)(全量审计快照)
> 5 个并行 SubAgent 完整审计:25 项 P0 + 42 项 P1 + 19 项 P2,含 0458.cn 对标。

→ [acceptance-report-2026-06-11.md](./acceptance-report-2026-06-11.md)(QA 验收报告 v1 + 复验 v2)
> **v1 结论:不允许上线 V1.0**——4 项 P0 阻塞、2 项 BLOCKED、6 项 P1 风险。
> **v2 结论(同日复验):P0 阻塞已全部清除,具备冒烟通过条件**——F-1~F-6 全部修复 + 13 用例 PASS。剩余 P1 + 手动事项不阻塞 V1。

---

## 2. 文档分类(按"内容性质")

| 类别 | 文档 | 说明 |
|---|---|---|
| **基线** | `ARCHITECTURE.md` | 设计决策,改动需评审,长期稳定 |
| **状态** | `project-memory.md` | 反映"现在",每完成任务后更新 |
| **状态** | `acceptance-report-2026-06-11.md` | 反映"当前可上线性",发现 P0 阻塞 |
| **计划** | `development-roadmap.md` | 反映"将做",每完成 P0/P1 后更新 |
| **计划** | `superpowers/plans/2026-06-11-p0-critical-batch.md` | 具体实施步骤 |
| **历史** | `audit-report-2026-06-11.md` | 2026-06-11 审计快照,定型不再改 |
| **历史** | `superpowers/plans/2026-06-10-bugfix-and-refactor.md` | 已被 06-11 plan 取代 |

---

## 3. ⚠️ 已知冲突(读取时务必注意)

### 冲突 1:P0 完成状态(2026-06-11 v1 复验后已解决)

| 文档 | 说法 |
|---|---|
| `project-memory.md` §10.3 | "24/25 完成,96%" |
| `development-roadmap.md` Week 1-9 | 标记 ✅ 多个 MUST-N |
| `acceptance-report-2026-06-11.md` v1 §8 | **"不允许上线 V1.0"** —— F-1/F-2/F-5 是 P0 修复的"完成"实为虚标 |
| `acceptance-report-2026-06-11.md` v2 §12 | **"✅ P0 阻塞已全部清除,具备冒烟通过条件"** —— F-1~F-6 全部修复 + 13 用例冒烟 PASS |
| `project-memory.md` §12 | F-1~F-6 修复明细 + 重新验收通过 |

**v1 时仲裁(已过期)**:**以 [acceptance-report](./acceptance-report-2026-06-11.md) v1 为准**。`project-memory` 和 `roadmap` 的 ✅ 标记需要复核。

**当前仲裁(2026-06-11 v2)**:**以 [acceptance-report v2 §12](./acceptance-report-2026-06-11.md#12--最终结论) 为准** —— V1.0 P0 已全部通过,剩余 P1 + B-1/B-2/B-3 手动事项不阻塞 V1 冒烟。`project-memory.md` §12 与 v2 验收一致。

### 冲突 2:仓库目录(已过时)

| 文档 | 说法 |
|---|---|
| `ARCHITECTURE.md` §5.1 | 计划含 `admin/` `.github/` `scripts/` |
| `project-memory.md` §1.2 "没有的目录" | 列出 `admin/` 不存在 |
| 实际 git log(commit `94028e1`) | `admin/` Next.js 已落地 |

**仲裁**:**以仓库实际为准**。`project-memory` 的"没有的目录"清单已过期。

### 冲突 3:误报项的认定

| 文档 | 说法 |
|---|---|
| `audit-report` §MUST-3 / §MUST-9 | 列为必须修复 |
| `project-memory.md` §10.2 | 标记为"审计误报"(代码已存在) |

**仲裁**:**以 [project-memory.md](./project-memory.md) §10.2 为准**,审计是过期快照。

---

## 4. 重复内容地图(避免重复读)

| 主题 | 主文档 | 重复出现在 |
|---|---|---|
| 4 大模块功能 | `ARCHITECTURE.md` §1.2 | `project-memory.md` §2.1 |
| 数据库 ER + 表 | `ARCHITECTURE.md` §2-3 | `project-memory.md` §4 |
| API 路径规范 | `ARCHITECTURE.md` §4 | `project-memory.md` §5(实际状态) |
| 项目目录结构 | `ARCHITECTURE.md` §5 | `project-memory.md` §1.2 |
| 25 项 P0 任务 | `audit-report` §第一部分 | `roadmap` Week 1-9 + `project-memory` §10.1 + 2 份 plan 文件 |
| 0458.cn 对照 | `audit-report` §第四部分 | `roadmap` 附录 |

**建议读取路径**:
- 想看 V1 设计 → 只读 `ARCHITECTURE.md`
- 想看现在状态 → 只读 `project-memory.md`
- 想看未来计划 → 只读 `development-roadmap.md`
- 想看历史结论 → 读 `audit-report` + `acceptance-report`

---

## 5. 更新约定

| 触发事件 | 必须更新的文档 |
|---|---|
| 完成一个 MUST/SHOULD/NEXT 任务 | `project-memory.md` + `development-roadmap.md`(对应行) |
| 新一轮全量审计 | 新建 `audit-report-YYYY-MM-DD.md` + 在本 index 添加链接 |
| 新一轮 QA 验收 | 新建 `acceptance-report-YYYY-MM-DD.md` + 在本 index 添加链接 |
| 新写实施计划 | 在 `superpowers/plans/YYYY-MM-DD-*.md` 落地 + 在本 index §1.4 加链接 |
| 架构基线变更 | `ARCHITECTURE.md` + 在本 index 顶部加变更注释 |

---

## 6. 推荐的目录结构(优化建议,**未执行**)

当前(扁平):

```
docs/
├── index.md                                       # 入口(本文件,新增)
├── ARCHITECTURE.md
├── project-memory.md
├── development-roadmap.md
├── audit-report-2026-06-11.md
├── acceptance-report-2026-06-11.md
└── superpowers/plans/
    ├── 2026-06-10-bugfix-and-refactor.md
    └── 2026-06-11-p0-critical-batch.md
```

建议(分层,**仅作为建议,不实际移动文件**):

```
docs/
├── index.md                                       # 唯一入口
├── architecture/
│   └── ARCHITECTURE.md                            # 基线
├── status/
│   ├── project-memory.md                          # 当前状态
│   └── acceptance-2026-06-11.md                   # 验收快照
├── plans/
│   ├── development-roadmap.md                     # 长期路线图
│   └── batches/                                   # 短期实施 plan
│       ├── 2026-06-11-p0-critical-batch.md
│       └── 2026-06-10-bugfix-and-refactor.md
└── history/
    └── audits/
        └── 2026-06-11-audit-report.md
```

> 用户已要求"禁止删除任何文件",因此不实际移动,仅作为后续重构参考。

---

**入口结束。请按本文件 §1 的"读取目的"跳转到具体文档。**
