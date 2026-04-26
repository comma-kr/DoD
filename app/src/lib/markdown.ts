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

/**
 * 특정 H2 섹션을 끝낸 직후 위치에서 마크다운을 두 조각으로 분할.
 * 사용처: 본문 흐름 안에 React 컴포넌트(예: TradeFlowTabs)를 끼워넣기 위함.
 *
 * @param markdown 전체 마크다운
 * @param sectionTitle 분할 기준이 되는 H2 제목 일부 (예: '실거래 흐름')
 * @returns [전반부(해당 섹션까지 포함), 후반부(다음 섹션부터)]
 *          섹션 못 찾으면 [전체, ''] 반환.
 */
export function splitMarkdownAfterSection(
  markdown: string,
  sectionTitle: string
): [string, string] {
  const lines = markdown.split('\n');
  let sectionFoundAt = -1;
  let nextHeadingAt = -1;
  for (let i = 0; i < lines.length; i++) {
    const isH2 = /^##\s+/.test(lines[i]);
    if (sectionFoundAt === -1 && isH2 && lines[i].includes(sectionTitle)) {
      sectionFoundAt = i;
      continue;
    }
    if (sectionFoundAt !== -1 && isH2 && i > sectionFoundAt) {
      nextHeadingAt = i;
      break;
    }
  }
  if (sectionFoundAt === -1) return [markdown, ''];
  if (nextHeadingAt === -1) return [markdown, '']; // 그 다음 섹션 없으면 split 의미 없음
  const before = lines.slice(0, nextHeadingAt).join('\n').trimEnd();
  const after = lines.slice(nextHeadingAt).join('\n').trimStart();
  return [before, after];
}
