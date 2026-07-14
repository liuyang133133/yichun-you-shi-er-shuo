/**
 * consolidate.js — 把多次跑出的 report 合并为一份 MASTER 报告
 * 用法: node consolidate.js
 */
const fs = require('fs');
const path = require('path');

const REPORT_DIR = path.join(__dirname, '../reports');
const runs = fs.readdirSync(REPORT_DIR).filter((d) => d.startsWith('run-')).sort();

const all = [];
for (const d of runs) {
  const r = JSON.parse(fs.readFileSync(path.join(REPORT_DIR, d, 'results.json'), 'utf8'));
  all.push({ runId: d, layer: r.layer, results: r.results });
}

const seen = new Set();
const merged = [];
for (const { runId, layer, results } of all) {
  for (const r of results) {
    const k = r.method + ' ' + r.path + ' #' + r.dim + ' ' + r.testName;
    if (!seen.has(k)) {
      seen.add(k);
      merged.push({ ...r, runId, layer });
    }
  }
}

const P = (cond) => (cond ? '✅' : '❌');
const TOT = merged.length;
const PASS = merged.filter((r) => r.outcome === 'PASS').length;
const FAIL = merged.filter((r) => r.outcome === 'FAIL').length;
const ISSUE = merged.filter((r) => r.outcome === 'ISSUE').length;
const SKIP = merged.filter((r) => r.outcome === 'SKIP').length;
const p0 = merged.filter((r) => r.severity === 'P0').length;
const p1 = merged.filter((r) => r.severity === 'P1').length;
const p2 = merged.filter((r) => r.severity === 'P2').length;
const p3 = merged.filter((r) => r.severity === 'P3').length;

// 13 维度
const dimMap = {};
for (const r of merged) {
  if (!dimMap[r.dim]) dimMap[r.dim] = { pass: 0, fail: 0, issue: 0, skip: 0 };
  if (r.outcome === 'PASS') dimMap[r.dim].pass++;
  else if (r.outcome === 'FAIL') dimMap[r.dim].fail++;
  else if (r.outcome === 'ISSUE') dimMap[r.dim].issue++;
  else dimMap[r.dim].skip++;
}
const dimLabels = {
  1: '正常参数', 2: '异常参数', 3: '空参数', 4: '超长',
  5: 'SQL 注入', 6: 'XSS', 7: '重复请求', 8: '并发请求',
  9: '权限 bypass', 10: 'Token 过期', 11: 'Token 空', 12: '返回值统一', 13: '状态码',
};

// 模块
const modMap = {};
for (const r of merged) {
  const mod = r.path.split('/').slice(1, 3).join('/');
  if (!modMap[mod]) modMap[mod] = { total: 0, pass: 0, fail: 0, issue: 0 };
  modMap[mod].total++;
  if (r.outcome === 'PASS') modMap[mod].pass++;
  else if (r.outcome === 'FAIL') modMap[mod].fail++;
  else if (r.outcome === 'ISSUE') modMap[mod].issue++;
}

const allReports = runs.map((d) => {
  const r = JSON.parse(fs.readFileSync(path.join(REPORT_DIR, d, 'results.json'), 'utf8'));
  return { runId: d, layer: r.layer, total: r.results.length };
});

// 失败清单 (按 P 排序)
const failures = merged.filter((r) => r.outcome === 'FAIL' || (r.outcome === 'ISSUE' && (r.severity === 'P0' || r.severity === 'P1')));
const sevOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
failures.sort((a, b) => (sevOrder[a.severity] || 9) - (sevOrder[b.severity] || 9));

// 输出
let out = '# 🎯 后端 API 安全/健壮性全维度审计 — 总报告\n\n';
out += `> 日期: ${new Date().toISOString().slice(0, 10)}  \n`;
out += `> 合并自 ${allReports.length} 次跑批, ${runs.join(', ')}\n\n`;

out += `## TL;DR\n\n`;
out += `| 指标 | 值 |\n|---|---|\n`;
out += `| 去重总用例 | ${TOT} |\n`;
out += `| ✅ 通过 | ${PASS} (${((PASS/TOT)*100).toFixed(1)}%) |\n`;
out += `| ❌ 失败 | ${FAIL} (${((FAIL/TOT)*100).toFixed(1)}%) |\n`;
out += `| ⚠️ 异常 | ${ISSUE} (${((ISSUE/TOT)*100).toFixed(1)}%) |\n`;
out += `| ⏸ 跳过 | ${SKIP} |\n`;
out += `| **P0 阻塞** | **${p0}** |\n`;
out += `| **P1 重要** | **${p1}** |\n`;
out += `| P2 一般 | ${p2} |\n`;
out += `| P3 提示 | ${p3} |\n`;
out += '\n';

out += `## 📋 各次跑批汇总\n\n`;
out += `| 跑批 | Layer | 用例 |\n|---|---|---|\n`;
for (const r of allReports) {
  out += `| ${r.runId} | L${r.layer} | ${r.total} |\n`;
}
out += '\n';

out += `## 📊 维度成绩 (13 维度横向)\n\n`;
out += `| # | 维度 | ✅ | ❌ | ⚠️ | ⏸ | 备注 |\n|---|---|---|---|---|---|---|\n`;
for (let i = 1; i <= 13; i++) {
  const d = dimMap[i] || { pass: 0, fail: 0, issue: 0, skip: 0 };
  const total = d.pass + d.fail + d.issue + d.skip;
  const rate = total > 0 ? ((d.pass/total)*100).toFixed(1) + '%' : '-';
  out += `| ${i} | ${dimLabels[i]} | ${d.pass} | ${d.fail} | ${d.issue} | ${d.skip} | 通过率 ${rate} |\n`;
}
out += '\n';

out += `## 🏢 模块成绩 (按 controller 路径前缀)\n\n`;
out += `| 模块 | 端点 | ✅ | ❌ | ⚠️ |\n|---|---|---|---|---|\n`;
const sortedMod = Object.entries(modMap).sort((a, b) => (b[1].fail + b[1].issue) - (a[1].fail + a[1].issue) || b[1].total - a[1].total);
for (const [mod, s] of sortedMod) {
  out += `| ${mod} | ${s.total} | ${s.pass} | ${s.fail} | ${s.issue} |\n`;
}
out += '\n';

out += `## 🚨 关键发现 (P0/P1)\n\n`;
const topFindings = failures.filter((f) => f.severity === 'P0').slice(0, 30);
const groupedByPath = {};
for (const f of topFindings) {
  const key = f.method + ' ' + f.path;
  if (!groupedByPath[key]) groupedByPath[key] = [];
  groupedByPath[key].push(f);
}
for (const [path, fs] of Object.entries(groupedByPath)) {
  out += `### ${path}\n`;
  const tests = [...new Set(fs.map((f) => f.testName))].slice(0, 3);
  for (const t of tests) {
    const sev = fs.find((f) => f.testName === t)?.severity || '?';
    out += `- [${sev}] ${t}\n`;
  }
  out += '\n';
}
if (topFindings.length === 0) {
  out += '_无 P0 问题_\n\n';
}

// 失败清单
out += `## 📋 完整失败清单 (按 P 排序, 仅列 P0/P1)\n\n`;
if (failures.filter((f) => f.severity === 'P0' || f.severity === 'P1').length === 0) {
  out += '_无 P0/P1_\n\n';
} else {
  out += `| 端点 | 维度 | 用例 | 状态 | 期望 |\n|---|---|---|---|---|\n`;
  for (const f of failures.filter((f) => f.severity === 'P0' || f.severity === 'P1').slice(0, 100)) {
    const exp = typeof f.expected === 'string' ? f.expected : JSON.stringify(f.expected);
    out += `| ${f.method} ${f.path} | ${f.dim} | ${f.testName} | ${f.actualStatus} | ${exp.slice(0, 30)} |\n`;
  }
}

fs.writeFileSync(path.join(REPORT_DIR, 'MASTER.md'), out);
fs.writeFileSync(path.join(REPORT_DIR, 'MASTER.json'), JSON.stringify({
  generated: new Date().toISOString(),
  totalUniqCases: TOT, pass: PASS, fail: FAIL, issue: ISSUE, skip: SKIP,
  severity: { P0: p0, P1: p1, P2: p2, P3: p3 },
  dimensions: dimMap,
  modules: modMap,
  runs: allReports,
}, null, 2));

console.log(`MASTER 报告已生成:`);
console.log(`  ${path.join(REPORT_DIR, 'MASTER.md')}`);
console.log(`  ${path.join(REPORT_DIR, 'MASTER.json')}`);
console.log(`\n去重总用例 ${TOT}, ✅ ${PASS} ❌ ${FAIL} ⚠️ ${ISSUE}`);
console.log(`P0 ${p0} | P1 ${p1} | P2 ${p2} | P3 ${p3}`);
