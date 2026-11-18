import React, { useMemo } from 'react';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
  onFormulaClick?: (latex: string) => void;
}

interface Segment {
  type: 'text' | 'inline' | 'display';
  value: string;
}

function parseMathSegments(input: string): Segment[] {
  if (!input) return [];
  const segments: Segment[] = [];
  // Match $$...$$ or $...$ (non-greedy, allowing escaped \$)
  const regex = /(\$\$[\s\S]+?\$\$|\$(?:\\.|[^$\n])+?\$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: input.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('$$') && token.endsWith('$$')) {
      segments.push({ type: 'display', value: token.slice(2, -2).trim() });
    } else {
      segments.push({ type: 'inline', value: token.slice(1, -1).trim() });
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', value: input.slice(lastIndex) });
  }
  return segments;
}

export const MathText: React.FC<MathTextProps> = ({ text, className = '', onFormulaClick }) => {
  const segments = useMemo(() => parseMathSegments(text), [text]);

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          const lines = seg.value.split('\n');
          return (
            <React.Fragment key={idx}>
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {line}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        }

        try {
          const html = katex.renderToString(seg.value, {
            displayMode: seg.type === 'display',
            throwOnError: false,
            strict: false,
          });
          return (
            <span
              key={idx}
              onClick={
                onFormulaClick
                  ? (e) => {
                      e.stopPropagation();
                      onFormulaClick(seg.value);
                    }
                  : undefined
              }
              title={onFormulaClick ? 'Nhấp để chỉnh sửa công thức' : undefined}
              className={
                onFormulaClick
                  ? 'cursor-pointer rounded px-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-300 transition-colors'
                  : undefined
              }
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return (
            <code key={idx} className="rounded bg-slate-100 px-1 text-xs">
              {seg.value}
            </code>
          );
        }
      })}
    </span>
  );
};
