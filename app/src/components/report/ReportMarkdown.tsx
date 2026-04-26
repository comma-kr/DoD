import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { slugify } from '@/lib/utils';

interface Props {
  markdown: string;
}

function getText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(getText).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return getText((children as { props: { children: React.ReactNode } }).props.children);
  }
  return '';
}

// 표 셀 안 〔▲최고〕/〔▼최저〕 토큰 → 색상 pill 변환.
// 빨강 위세모(최고) / 파랑 아래세모(최저) — verdict pill과 같은 톤.
const PILL_RE = /(〔▲최고〕|〔▼최저〕)/g;

function renderPill(token: string, key: string | number): React.ReactNode {
  const isMax = token === '〔▲최고〕';
  return (
    <span
      key={key}
      className="ml-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 align-middle text-[10px] font-bold leading-tight"
      style={
        isMax
          ? { background: '#FEE2E2', color: '#B91C1C', borderColor: 'rgba(185,28,28,0.35)' }
          : { background: '#DBEAFE', color: '#1D4ED8', borderColor: 'rgba(29,78,216,0.35)' }
      }
    >
      <span style={{ fontSize: '9px', lineHeight: 1 }}>{isMax ? '▲' : '▼'}</span>
      <span>{isMax ? '최고' : '최저'}</span>
    </span>
  );
}

function processString(text: string): React.ReactNode {
  if (!text.includes('〔')) return text;
  PILL_RE.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = PILL_RE.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    parts.push(renderPill(m[1], `pill-${m.index}`));
    lastIdx = m.index + m[1].length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return <>{parts}</>;
}

function enhanceCellChildren(node: React.ReactNode): React.ReactNode {
  return React.Children.map(node, (child) => {
    if (typeof child === 'string') return processString(child);
    if (React.isValidElement(child)) {
      const props = child.props as { children?: React.ReactNode };
      return React.cloneElement(
        child,
        {} as Record<string, never>,
        enhanceCellChildren(props.children)
      );
    }
    return child;
  });
}

export default function ReportMarkdown({ markdown }: Props) {
  return (
    <div className="prose report-prose max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => {
            const id = slugify(getText(children));
            return (
              <h1
                id={id}
                className="mt-12 mb-5 text-3xl font-bold tracking-tight text-foreground first:mt-0"
              >
                {children}
              </h1>
            );
          },
          h2: ({ children }) => {
            const id = slugify(getText(children));
            return (
              <h2
                id={id}
                className="mt-14 text-2xl font-bold tracking-tight text-foreground first:mt-0 scroll-mt-24"
              >
                {children}
              </h2>
            );
          },
          h3: ({ children }) => (
            <h3 className="mt-10 mb-3 text-xl font-semibold tracking-tight text-foreground">
              <span className="mr-2 inline-block h-1.5 w-1.5 -translate-y-1 rounded-full bg-primary align-middle" />
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-5 text-[15px] leading-[1.8] text-foreground/90">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-5 space-y-2.5 pl-6 text-[15px] leading-[1.8] text-foreground/90">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-5 list-decimal space-y-2.5 pl-6 text-[15px] leading-[1.8] text-foreground/90">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="list-disc marker:text-foreground-sub">{children}</li>,
          strong: ({ children }) => (
            <strong className="report-highlight font-bold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="report-highlight not-italic font-semibold text-foreground">
              {children}
            </em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-[3px] border-primary/50 bg-primary-soft/40 px-4 py-2 text-[14px] leading-[1.6] text-foreground [&>p]:!my-0 [&>p]:!py-0 [&>p]:!text-[14px] [&>p]:!leading-[1.6]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-border" />,
          table: ({ children }) => (
            <div className="my-7 overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-soft">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-4 py-3 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/60 px-4 py-3 text-foreground/90">
              {enhanceCellChildren(children)}
            </td>
          ),
          code: ({ children }) => (
            <code className="rounded bg-surface-soft px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
              {children}
            </code>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
