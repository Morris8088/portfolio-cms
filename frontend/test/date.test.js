// ============================================================
// test/date.test.js —— 日期格式化单元测试
// 关键技巧：relativeTime 的时间基准可以注入，
// 所以测试不依赖"现在几点"，永远稳定。
// ============================================================

import { describe, it, expect } from 'vitest';
import { formatDate, formatDateShort, relativeTime } from '../src/utils/date';

// 固定一个"现在"：2026-11-03 12:00:00
const NOW = new Date('2026-11-03T12:00:00.000Z').getTime();

describe('formatDate 中文日期', () => {
  it('格式化 ISO 字符串', () => {
    // 用本地时区构造，避免不同时区下断言失败
    const iso = new Date(2026, 9, 28, 10, 20).toISOString();
    expect(formatDate(iso)).toBe('2026 年 10 月 28 日');
  });

  it('月份不加前导零', () => {
    const iso = new Date(2026, 0, 5, 8, 0).toISOString();
    expect(formatDate(iso)).toBe('2026 年 1 月 5 日');
  });

  it('空值返回空字符串', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
  });

  it('非法日期不会显示 Invalid Date', () => {
    expect(formatDate('不是日期')).toBe('');
  });
});

describe('formatDateShort 短日期', () => {
  it('输出 YYYY-MM-DD', () => {
    const iso = new Date(2026, 9, 8, 10, 20).toISOString();
    expect(formatDateShort(iso)).toBe('2026-10-08');
  });

  it('月和日补零', () => {
    const iso = new Date(2026, 0, 1, 10, 20).toISOString();
    expect(formatDateShort(iso)).toBe('2026-01-01');
  });

  it('非法值返回空字符串', () => {
    expect(formatDateShort('x')).toBe('');
  });
});

describe('relativeTime 相对时间', () => {
  it('30 秒内显示刚刚', () => {
    expect(relativeTime(new Date(NOW - 30 * 1000).toISOString(), NOW)).toBe('刚刚');
  });

  it('分钟级', () => {
    expect(relativeTime(new Date(NOW - 5 * 60 * 1000).toISOString(), NOW)).toBe('5 分钟前');
  });

  it('小时级', () => {
    expect(relativeTime(new Date(NOW - 3 * 60 * 60 * 1000).toISOString(), NOW)).toBe('3 小时前');
  });

  it('天级', () => {
    expect(relativeTime(new Date(NOW - 2 * 24 * 60 * 60 * 1000).toISOString(), NOW)).toBe('2 天前');
  });

  it('超过 30 天改为显示日期', () => {
    const old = new Date(NOW - 40 * 24 * 60 * 60 * 1000);
    expect(relativeTime(old.toISOString(), NOW)).toBe(formatDateShort(old.toISOString()));
  });

  it('未来时间兜底为刚刚（防止服务器时钟偏差显示负数）', () => {
    expect(relativeTime(new Date(NOW + 60 * 1000).toISOString(), NOW)).toBe('刚刚');
  });

  it('空值返回空字符串', () => {
    expect(relativeTime('', NOW)).toBe('');
    expect(relativeTime(null, NOW)).toBe('');
  });

  it('边界：刚好 60 秒算 1 分钟', () => {
    expect(relativeTime(new Date(NOW - 60 * 1000).toISOString(), NOW)).toBe('1 分钟前');
  });
});
