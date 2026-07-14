/**
 * reporter.js — 写 summary.md + report.md + results.json + failures.json
 */
const fs = require('fs');
const path = require('path');

function writeReports(runDir, { results, dimensionsSummary, moduleSummary, t0, t1, layer }) {
  fs.mkdirSync(runDir, { recursive: true });
  fs.mkdirSync(path.join(runDir, 'artifacts'), { recursive: true });

  // 1. results.json
  fs.writeFileSync(
    path.join(runDir, 'results.json'),
    JSON.stringify({ runId: path.basename(runDir), layer, results, generated: new Date().toISOString() }, null, 2),
  );

  // 2. failures.json
  const failures = results.filter((r) => r.outcome === 'FAIL' || r.outcome === 'ISSUE');
  fs.writeFileSync(
    path.join(runDir, 'failures.json'),
    JSON.stringify(failures, null, 2),
  );

  // 3. summary.md (1 页)
  const total = results.length;
  const passed = results.filter((r) => r.outcome === 'PASS').length;
  const failed = results.filter((r) => r.outcome === 'FAIL').length;
  const issues = results.filter((r) => r.outcome === 'ISSUE').length;
  const skipped = results.filter((r) => r.outcome === 'SKIP').length;
  const elapsedMs = t1 - t0;
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = Math.floor((elapsedMs % 60000) / 1000);

  const pCount = (p) => failures.filter((f) => f.severity === p).length;

  let md = `# 后端 API 安全审计 (L${layer}) — ${new Date().toISOString().slice(0, 10)}\n\n`;
  md += `## TL;DR\n`;
  md += `- ✅ 通过 ${passed} / ❌ 失败 ${failed} / ⚠️ 异常 ${issues} / ⏸ 跳过 ${skipped}  / 总 ${total}\n`;
  md += `- 用时 ${minutes}m${seconds}s\n`;
  md += `- P0 阻塞: ${pCount('P0')} | P1 重要: ${pCount('P1')} | P2 一般: ${pCount('P2')} | P3 提示: ${pCount('P3')}\n\n`;

  // 维度成绩
  md += `## 维度成绩 (13 维度横向)\n\n`;
  md += `| 维度 | 通过 | 失败 | 异常 | 跳过 |\n|---|---|---|---|---|\n`;
  const dimLabels = {
    1: '正常参数', 2: '异常参数', 3: '空参数', 4: '超长',
    5: 'SQL 注入', 6: 'XSS', 7: '重复请求', 8: '并发请求',
    9: '权限 bypass', 10: 'Token 过期', 11: 'Token 空', 12: '返回值统一', 13: '状态码',
  };
  for (let i = 1; i <= 13; i++) {
    const d = dimensionsSummary[i] || { pass: 0, fail: 0, issue: 0, skip: 0 };
    md += `| ${i}. ${dimLabels[i]} | ${d.pass} | ${d.fail} | ${d.issue} | ${d.skip} |\n`;
  }

  // 模块成绩
  md += `\n## 模块成绩 (按 controller 聚合)\n\n`;
  md += `| 模块 | 端点数 | 通过 | 失败 | 异常 |\n|---|---|---|---|---|\n`;
  const mEntries = Object.entries(moduleSummary).sort((a, b) => b[1].fail - a[1].fail || b[1].total - a[1].total);
  for (const [mod, s] of mEntries) {
    md += `| ${mod} | ${s.total} | ${s.pass} | ${s.fail} | ${s.issue} |\n`;
  }

  // 失败清单 (按 P 排序)
  md += `\n## 失败清单 (按严重度排序)\n\n`;
  if (failures.length === 0) {
    md += `_无失败用例_\n`;
  } else {
    const sevOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const sortedFails = [...failures].sort((a, b) => (sevOrder[a.severity] || 9) - (sevOrder[b.severity] || 9));
    for (const f of sortedFails) {
      md += `### [${f.severity}] ${f.method} ${f.path} — dim${f.dim}: ${f.testName}\n`;
      md += `- 期望: ${JSON.stringify(f.expected)} | 实际: ${f.actualStatus}${f.actualDetail ? ' ' + f.actualDetail.slice(0, 100) : ''}\n`;
      if (f.reproCurl) md += `- 复现: \`${f.reproCurl}\`\n`;
      if (f.note) md += `- 备注: ${f.note}\n`;
      md += `\n`;
    }
  }

  fs.writeFileSync(path.join(runDir, 'summary.md'), md);

  // 4. report.md (完整维度表)
  let report = `# API 安全审计详细报告 (L${layer})\n\n`;
  const byPath = {};
  for (const r of results) {
    const key = `${r.method} ${r.path}`;
    if (!byPath[key]) byPath[key] = [];
    byPath[key].push(r);
  }
  for (const key of Object.keys(byPath).sort()) {
    const cases = byPath[key];
    const passed = cases.filter((c) => c.outcome === 'PASS').length;
    report += `## ${key} (${passed}/${cases.length})\n\n`;
    for (const c of cases) {
      report += `- dim${c.dim} ${c.testName}: **${c.outcome}**`;
      if (c.outcome !== 'PASS') {
        report += ` — 期望 ${JSON.stringify(c.expected)}, 实际 ${c.actualStatus}`;
        if (c.severity) report += ` [${c.severity}]`;
      }
      if (c.note) report += ` (${c.note})`;
      report += `\n`;
    }
    report += `\n`;
  }
  fs.writeFileSync(path.join(runDir, 'report.md'), report);
}

module.exports = { writeReports };
