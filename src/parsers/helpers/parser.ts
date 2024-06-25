import * as Pinyin from 'jian-pinyin';
import { Stat } from 'obsidian';

export interface FileAccessor {
  isEmbed: boolean;
  target: string;
  stats?: Stat;
}

export function markRangeForDeletion(str: string, range: { start: number; end: number }): string {
  const len = str.length;

  let start = range.start;
  while (start > 0 && str[start - 1] === ' ') start--;

  let end = range.end;
  while (end < len - 1 && str[end + 1] === ' ') end++;

  return str.slice(0, start) + '\u0000'.repeat(end - start) + str.slice(end);
}

export function executeDeletion(str: string) {
  return str.replace(/ *\0+ */g, ' ').trim();
}

export function replaceNewLines(str: string) {
  return str.trim().replace(/(?:\r\n|\n)/g, '<br>');
}

export function replaceBrs(str: string) {
  return str.replace(/<br>/g, '\n').trim();
}

export function indentNewLines(str: string) {
  const useTab = (app.vault as any).getConfig('useTab');
  return str.trim().replace(/(?:\r\n|\n)/g, useTab ? '\n\t' : '\n    ');
}

export function dedentNewLines(str: string) {
  return str.trim().replace(/(?:\r\n|\n)(?: {4}|\t)/g, '\n');
}

export function parseLaneTitle(str: string) {
  str = replaceBrs(str);

  const match = str.match(/^(.*?)\s*\((\d+)\)$/);
  if (match == null) return { title: str, maxItems: 0 };

  return { title: match[1], maxItems: Number(match[2]) };
}

/**
 * 返回给定字符串的第一个字符的拼音。
 * 如果拼音被方括号括起来，则将其转换为字符串数组。
 * 否则，将其作为单个字符串返回。
 *
 * @param str - 输入字符串。
 * @returns 一个对象，包含`type`属性，指示拼音是数组还是字符串，以及`data`属性，包含拼音(或拼音数组)。
 */
export function getUnitTitleSpell(str: string): { type: 0 | 1, data: string[] | string } {
  // 获取输入字符串的第一个字符
  const firstChar = str.slice(0, 1);

  // 获取第一个字符的拼音
  const firstCharSpell = Pinyin.getSpell(firstChar);

  // 检查拼音是否被方括号括起来
  const pattern = /^\[\s*.*\s*\]$/;
  if (pattern.test(firstCharSpell)) {
    // 如果拼音被方括号括起来，则将其转换为字符串数组
    // 删除开头结尾的方括号，并使用逗号分隔剩余的字符串
    const split = firstCharSpell.slice(firstCharSpell.indexOf('[') + 1, firstCharSpell.indexOf(']')).split(',');
    return {
      type: 0,
      data: [...split],
    };
  } else {
    // 如果拼音没有被方括号括起来，则将其作为单个字符串返回
    return {
      type: 1,
      data: firstCharSpell + '',
    };
  }
}

export function parseUnitTitle(str: string) {
  let splitElement = str.split(',')[0].slice(0, 1).toUpperCase();

  // 判断是否是A~Z
  if (splitElement < 'A' || splitElement > 'Z') {
    splitElement = '#1';
  }

  str = replaceBrs(splitElement);

  const match = str.match(/^(.*?)\s*\((\d+)\)$/);
  if (match == null) return { title: str, maxItems: 0 };

  return { title: match[1], maxItems: Number(match[2]) };
}
