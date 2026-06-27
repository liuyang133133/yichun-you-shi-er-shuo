#!/bin/bash
# ============================================================
# PM 文档体系补全 — 提交脚本
# 生成时间：2026-06-15
# 维护人：Hermes（PM）
# ⚠️  本脚本不会自动执行！请用户 review 后手动运行
# ============================================================

set -e  # 遇错即停

cd /e/workspace/yichun-you-shi-er-shuo

echo "=========================================="
echo "  Step 1: 确认 PM 工作文件清单"
echo "=========================================="
git status --short | grep -E "(docs/PRD\.md|docs/DATABASE\.md|docs/TASKS\.md|docs/CHANGELOG\.md|docs/development-roadmap\.md|docs/index\.md)"
echo ""
echo "预期应看到："
echo "  M docs/development-roadmap.md"
echo "  M docs/index.md"
echo " ?? docs/CHANGELOG.md"
echo " ?? docs/DATABASE.md"
echo " ?? docs/PRD.md"
echo " ?? docs/TASKS.md"
echo ""

read -p "上述 6 个文件是否符合预期？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消提交。请先检查文件。"
    exit 1
fi

echo "=========================================="
echo "  Step 2: 暂存 PM 工作的 6 个文件"
echo "=========================================="
git add \
    docs/PRD.md \
    docs/DATABASE.md \
    docs/TASKS.md \
    docs/CHANGELOG.md \
    docs/development-roadmap.md \
    docs/index.md

echo "✅ 已暂存 6 个文件"
git status --short | grep -E "(docs/PRD\.md|docs/DATABASE\.md|docs/TASKS\.md|docs/CHANGELOG\.md|docs/development-roadmap\.md|docs/index\.md)"
echo ""

echo "=========================================="
echo "  Step 3: 确认未暂存其他无关文件"
echo "=========================================="
OTHER=$(git status --short | grep -vE "(docs/PRD\.md|docs/DATABASE\.md|docs/TASKS\.md|docs/CHANGELOG\.md|docs/development-roadmap\.md|docs/index\.md)" | grep -v "^$" || true)
if [ -n "$OTHER" ]; then
    echo "⚠️  发现暂存区外的修改（PM 工作无关）："
    echo "$OTHER"
    echo ""
    echo "本脚本不会动这些文件，由用户自行处理。"
    echo ""
fi

echo "=========================================="
echo "  Step 4: Commit"
echo "=========================================="

# 单个 commit 信息（按 Keep a Changelog 风格）
cat > /tmp/pm-commit-msg.txt <<'EOF'
docs: PM 文档体系补全 (PRD + DATABASE + TASKS + CHANGELOG) + index/roadmap 同步

为符合 PM 指令要求的 7 份核心文档体系，新增 4 份关键文档，同步 2 份既有文档：

新增：
- PRD.md (229 行)：产品需求 v1.0 — 定位、用户故事、功能矩阵、关键流程、
  非功能需求、验收标准
- DATABASE.md (474 行)：17 model ER 图、表结构、50+ 索引清单、迁移历史、
  Prisma 限制与运维注意
- TASKS.md (231 行)：P0 25 + P1 关键 20 + P1 常规 22 + P2 19 + 手动阻塞 4
  的整合视图 + 风险登记
- CHANGELOG.md (227 行)：62 commit 按 V1.0 beta.10→beta.12→rc.1→rc.6 流水，
  含版本号规则与统计附录

更新：
- index.md：§0 30秒总览、§1 文档地图（新增 PRD/DATABASE/TASKS/CHANGELOG
  导航）、§2 分类表（新增产品/数据/任务/历史行）、§3 已知冲突、§4 重复
  内容地图、§5 更新约定（新增 3 条触发规则）、§6 目录结构建议（产品/数据/
  状态/计划/历史/运维 6 个子目录）
- development-roadmap.md：顶部配套文档链接补全、Week 12+ 收官手动阻塞节
  (B-1~B-4)、末尾更新日期与下次更新触发条件

状态基线：V1.0 P0 25/25 + P1 关键 20/20 全部完成（Sprint 1-6 + 1 bugfix），
admin 业务端到端通过。距生产上线仅剩 4 项手动阻塞 (B-1~B-4)。

PM 角色：Hermes。Closes: PM 文档体系补全 M-PM-01~06。
EOF

echo "Commit 信息预览："
cat /tmp/pm-commit-msg.txt
echo ""
echo "----------------------------------------"

read -p "使用此 commit 信息提交？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 取消提交。"
    exit 1
fi

git commit -F /tmp/pm-commit-msg.txt
echo ""
echo "✅ Commit 成功！"
echo ""

echo "=========================================="
echo "  Step 5: 查看结果"
echo "=========================================="
git log --oneline -1
echo ""
echo "本次 commit 详情："
git show --stat HEAD | head -30
echo ""

echo "=========================================="
echo "  Step 6 (可选): 推送到 origin"
echo "=========================================="
read -p "是否推送到 origin/main？(y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main
    echo "✅ 推送成功"
else
    echo "⏭️  跳过推送，由用户手动处理"
fi

echo ""
echo "=========================================="
echo "  ✅ PM 文档体系补全 — 提交流程结束"
echo "=========================================="
echo ""
echo "后续可选项："
echo "  1. 启动 B-1（MySQL 密码轮换）Claude 任务书"
echo "  2. 启动 B-2/B-3/B-4 任务书"
echo "  3. 启动 V1.1 PRD"
echo "  4. 整理 .gitignore（包含 .codex/ .hermes/ .workbuddy/ 等）"
