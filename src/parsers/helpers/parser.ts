import { Stat } from 'obsidian';
import * as Pinyin from 'jian-pinyin'

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

export function parseUnitTitle(str: string) {
  // const title = await stateManager.getNewItem(laneTitle);
  // 获取第一个字符，判断是否是中文
  const firstChar = str.slice(0, 1);
  const firstCharSpell = Pinyin.getSpell(firstChar);
  let splitElement = firstCharSpell.split(',')[0].slice(0, 1).toUpperCase();
  // 判断是否是A~Z
  if (splitElement < 'A' || splitElement > 'Z') {
    splitElement = '#1';
  }

  str = replaceBrs(splitElement);

  const match = str.match(/^(.*?)\s*\((\d+)\)$/);
  if (match == null) return { title: str, maxItems: 0 };

  return { title: match[1], maxItems: Number(match[2]) };
}
