// ============================================================
// utils/format.js —— 纯函数工具箱
// ------------------------------------------------------------
// 这里所有函数都满足：同样输入 → 同样输出，不依赖 Vue、不碰 DOM。
// 好处是能直接用 Vitest 单测，不需要起浏览器。
// ============================================================

/**
 * 把 "Vue3, Node ,,测试" 拆成 ['Vue3', 'Node', '测试']
 * 会自动去掉空格、空项
 */
export function parseTags(tags) {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : String(tags).split(',');
  return list.map((t) => String(t).trim()).filter(Boolean);
}

/**
 * 截断超长文本，超出部分用省略号
 * @param {string} text
 * @param {number} max 最大字数
 */
export function truncate(text, max = 80) {
  const str = String(text ?? '').trim();
  if (!str) return '';
  // 用 Array.from 而不是 str.length，
  // 否则 emoji / 部分生僻字会被从中间切开
  const chars = Array.from(str);
  return chars.length > max ? `${chars.slice(0, max).join('')}…` : str;
}

/**
 * 估算阅读时长（分钟）
 * 中文按每分钟 400 字，代码块按每行折算，最少 1 分钟
 */
export function readingTime(content) {
  const text = String(content ?? '');
  if (!text.trim()) return 1;
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.match(/[a-zA-Z0-9]+/g) || []).length;
  const minutes = cjk / 400 + words / 200;
  return Math.max(1, Math.round(minutes));
}

/** 千分位：1234 → "1,234" */
export function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('zh-CN');
}

// 一组低饱和度的渐变，用文章 id 取模，保证同一篇每次颜色都一样
const GRADIENTS = [
  ['#1f6f5c', '#3f9c84'],
  ['#8a5a44', '#c4643c'],
  ['#2f4858', '#5b7f95'],
  ['#4a4e69', '#8b87ad'],
  ['#3d5a40', '#7d9b6a'],
  ['#6b4d57', '#a87c8a']
];

/**
 * 给没有封面图的文章生成一个稳定的渐变色
 * 为什么不用随机色？因为刷新一次颜色就变，看着很廉价
 */
export function gradientFor(seed) {
  const key = String(seed ?? '');
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  const [from, to] = GRADIENTS[sum % GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

/** 取标题第一个有意义字符，用在渐变封面上的大字母 */
export function initialOf(title) {
  const chars = Array.from(String(title ?? '').trim());
  return chars.length ? chars[0].toUpperCase() : '·';
}
