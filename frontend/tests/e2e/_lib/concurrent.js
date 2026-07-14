/**
 * concurrent.js — 并发 / 重复 测试工具
 *
 * runConcurrent(label, fn, n=20):
 *   并发发 n 次请求, 用 Promise.allSettled, 容忍失败, 输出 status 分布 + 副作用统计
 *
 * sendRepeated(label, fn, intervals):
 *   按时间间隔连发, 用于幂等性探测
 */
async function runConcurrent(label, fn, n = 20) {
  const t0 = Date.now();
  const results = await Promise.allSettled(
    Array.from({ length: n }, (_, i) => fn(i))
  );
  const elapsed = Date.now() - t0;
  const stats = {
    label, n, elapsedMs: elapsed,
    fulfilled: 0, rejected: 0,
    byStatus: {},
    errors: [],
  };
  for (const r of results) {
    if (r.status === 'fulfilled') {
      stats.fulfilled++;
      const s = r.value.status || 0;
      stats.byStatus[s] = (stats.byStatus[s] || 0) + 1;
    } else {
      stats.rejected++;
      stats.errors.push(String(r.reason));
    }
  }
  return stats;
}

/**
 * 相同请求按间隔连发
 * @param intervalsMs {number[]} 毫秒
 */
async function sendRepeated(label, fn, intervalsMs = [0, 50, 100, 1000, 60000]) {
  const results = [];
  let cumulative = 0;
  for (const ms of intervalsMs) {
    cumulative += ms;
    await new Promise((r) => setTimeout(r, ms));
    results.push(await fn(cumulative));
  }
  return { label, results };
}

module.exports = { runConcurrent, sendRepeated };
