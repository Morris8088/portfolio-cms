// ============================================================
// utils/date.js —— 日期格式化小工具
// 数据库里存的是 ISO 字符串："2026-11-03T07:40:00.000Z"
// 直接显示给用户太丑，这里转成 "2026年11月3日"
// ============================================================

/**
 * 把 ISO 时间字符串转成中文日期
 * @param {string} iso 形如 2026-11-03T07:40:00.000Z
 * @returns {string} 形如 2026年11月3日
 */
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  // getFullYear / getMonth / getDate 取的是"本地时间"的 年 / 月 / 日
  // 注意 getMonth() 从 0 开始（0 代表 1 月），所以要 +1
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
