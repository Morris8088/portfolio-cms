// ============================================================
// test/format.test.js —— 纯函数单元测试（Vitest）
// 运行：npm test
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  parseTags,
  truncate,
  readingTime,
  formatNumber,
  gradientFor,
  initialOf
} from '../src/utils/format';

describe('parseTags 标签解析', () => {
  it('正常逗号分隔', () => {
    expect(parseTags('Vue3,Node,SQLite')).toEqual(['Vue3', 'Node', 'SQLite']);
  });

  it('去掉每项前后的空格', () => {
    expect(parseTags(' Vue3 , Node ')).toEqual(['Vue3', 'Node']);
  });

  it('忽略空项（连续逗号 / 末尾逗号）', () => {
    expect(parseTags('Vue3,,Node,')).toEqual(['Vue3', 'Node']);
  });

  it('空字符串返回空数组', () => {
    expect(parseTags('')).toEqual([]);
  });

  it('null / undefined 返回空数组，不抛错', () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
  });

  it('单个标签', () => {
    expect(parseTags('Vue3')).toEqual(['Vue3']);
  });

  it('已经是数组时也兼容', () => {
    expect(parseTags(['Vue3', ' Node ', ''])).toEqual(['Vue3', 'Node']);
  });

  it('汉字标签不会被拆坏', () => {
    expect(parseTags('测试,性能')).toEqual(['测试', '性能']);
  });
});

describe('truncate 截断', () => {
  it('短文本原样返回', () => {
    expect(truncate('你好', 10)).toBe('你好');
  });

  it('超长文本保留前 N 个字符再加省略号', () => {
    expect(truncate('一二三四五', 3)).toBe('一二三…');
  });

  it('长度刚好相等时不截断', () => {
    expect(truncate('12345', 5)).toBe('12345');
  });

  it('按字符数而不是字节数截断（emoji 不被切开）', () => {
    expect(truncate('😀😀😀', 2)).toBe('😀😀…');
  });

  it('空值返回空字符串', () => {
    expect(truncate(null)).toBe('');
    expect(truncate('')).toBe('');
  });

  it('先 trim 再判断长度', () => {
    expect(truncate('   abc   ', 10)).toBe('abc');
  });
});

describe('readingTime 阅读时长', () => {
  it('空内容至少算 1 分钟', () => {
    expect(readingTime('')).toBe(1);
    expect(readingTime(null)).toBe(1);
  });

  it('短文也返回 1 分钟', () => {
    expect(readingTime('今天天气不错')).toBe(1);
  });

  it('中文按 400 字/分钟估算', () => {
    const text = '字'.repeat(1200);
    expect(readingTime(text)).toBe(3);
  });

  it('中英混排会合并计算', () => {
    const text = `${'字'.repeat(400)} ${'word '.repeat(100)}`;
    // 400 字 = 1 分钟，100 词 = 0.5 分钟 → 四舍五入 2
    expect(readingTime(text)).toBe(2);
  });
});

describe('formatNumber 千分位', () => {
  it('四位数加分隔符', () => {
    expect(formatNumber(1234)).toBe('1,234');
  });

  it('三位数不加', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('零', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('非法值兜底为 0', () => {
    expect(formatNumber(undefined)).toBe('0');
    expect(formatNumber('abc')).toBe('0');
  });
});

describe('gradientFor 渐变封面', () => {
  it('同样的输入永远得到同样的颜色', () => {
    expect(gradientFor('abc')).toBe(gradientFor('abc'));
  });

  it('返回合法的 linear-gradient', () => {
    expect(gradientFor('build-fullstack-cms')).toContain('linear-gradient');
  });

  it('空值也不报错', () => {
    expect(gradientFor(null)).toContain('linear-gradient');
  });
});

describe('initialOf 取首字', () => {
  it('中文取第一个字', () => {
    expect(initialOf('从零搭建')).toBe('从');
  });

  it('英文转大写', () => {
    expect(initialOf('vue')).toBe('V');
  });

  it('emoji 不会被切成乱码', () => {
    expect(initialOf('😀测试')).toBe('😀');
  });

  it('空值返回占位符', () => {
    expect(initialOf('')).toBe('·');
    expect(initialOf(null)).toBe('·');
  });
});
