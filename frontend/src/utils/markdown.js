// ============================================================
// utils/markdown.js —— Markdown 渲染
// ------------------------------------------------------------
// marked 负责"文本 → HTML"，DOMPurify 负责"清掉危险内容"。
//
// 为什么必须消毒？
//   文章内容最终是 v-html 塞进页面的。
//   如果内容里有 <img src=x onerror="偷令牌">，浏览器会真的执行它。
//   DOMPurify 会把这类标签和属性删掉，只留下安全的排版标签。
// ============================================================

import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  gfm: true, // 支持表格、任务列表、删除线
  breaks: false, // 单个换行不算分段（Markdown 标准行为）
  headerIds: false,
  mangle: false
});

/**
 * @param {string} text Markdown 原文
 * @returns {string} 可安全用于 v-html 的 HTML
 */
export function renderMarkdown(text) {
  if (!text) return '';

  const raw = marked.parse(String(text));

  return DOMPurify.sanitize(raw, {
    // 允许代码高亮类名、外链 target 等常用属性
    ADD_ATTR: ['target', 'rel'],
    // 禁止 iframe / script / style，防止嵌入恶意页面或破坏样式
    FORBID_TAGS: ['iframe', 'script', 'style', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick']
  });
}

/**
 * 从 Markdown 里提取纯文本（用于生成摘要、算字数）
 */
export function markdownToText(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ') // 去掉代码块
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/[#>*`_~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
