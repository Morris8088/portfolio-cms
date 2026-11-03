// ============================================================
// utils/date.js —— 日期格式化（纯函数）
// ============================================================

const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/** '2026-10-28T10:20:00.000Z' → '2026 年 10 月 28 日' */
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  // 非法日期时 new Date 会得到 NaN，要挡住，否则页面显示 Invalid Date
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()} 年 ${MONTHS[d.getMonth()]} 月 ${d.getDate()} 日`;
}

/** '2026-10-28...' → '2026-10-28' */
export function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * 相对时间：'刚刚' / '3 小时前' / '2 天前' / 超过 30 天显示日期
 * 第二个参数 now 可注入，方便写测试（否则只能靠 mock 时间）
 */
export function relativeTime(iso, now = Date.now()) {
  if (!iso) return '';
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';

  const diff = now - time;
  if (diff < 0) return '刚刚'; // 服务器时间比本地快时的兜底

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDateShort(iso);
}
