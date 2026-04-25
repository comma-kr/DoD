// 리포트 마크다운에서 h2 제목만 추출 → TOC 생성용
import { slugify } from './utils';

export interface Heading {
  id: string;
  text: string;
}

export function extractH2Headings(markdown: string): Heading[] {
  const lines = markdown.split('\n');
  const result: Heading[] = [];
  let inCodeBlock = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    const text = m[1].replace(/\*+([^*]+)\*+/g, '$1').trim(); // **굵음** 제거
    if (!text) continue;
    result.push({ id: slugify(text), text });
  }
  return result;
}
