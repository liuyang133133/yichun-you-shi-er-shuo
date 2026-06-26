/**
 * 极简 Markdown 渲染器 — T-018 专用
 *
 * 不引入外部依赖（marked/react-markdown），仅支持协议 seed 内容用到的语法：
 *   - # / ## / ### 标题
 *   - **粗体**
 *   - `行内代码`
 *   - - 无序列表
 *   - 1. 有序列表
 *   - > 引用
 *   - | 表格 | (简化为 pre block)
 *   - --- 分隔线
 *   - 段落（空行分隔）
 *
 * 安全：纯文本 → React 元素，无 dangerouslySetInnerHTML。
 */

import type { ReactElement } from 'react';

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'quote' | 'hr' | 'table';
  content?: string;
  items?: string[];
  rows?: string[][];
}

/** 解析 Markdown → blocks */
function parse(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (!line.trim()) {
      i++;
      continue;
    }

    // 分隔线
    if (/^---+\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 标题
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      blocks.push({ type: 'h3', content: h3[1] });
      i++;
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      blocks.push({ type: 'h2', content: h2[1] });
      i++;
      continue;
    }
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      blocks.push({ type: 'h1', content: h1[1] });
      i++;
      continue;
    }

    // 引用
    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      blocks.push({ type: 'quote', content: quote[1] });
      i++;
      continue;
    }

    // 表格 (| a | b |)
    if (/^\|/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        const cells = lines[i]
          .split('|')
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        // 跳过分隔行 |---|---|
        if (cells.every((c) => /^[-:]+$/.test(c))) {
          i++;
          continue;
        }
        rows.push(cells);
        i++;
      }
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }

    // 无序列表
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // 有序列表
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // 段落 (累积到下一空行)
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#|>|---|\||[-*]\s|\d+\.\s)/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', content: paraLines.join(' ') });
  }

  return blocks;
}

/** 行内解析：**bold** + `code` */
function renderInline(text: string): ReactElement[] {
  const result: ReactElement[] = [];
  let key = 0;
  // 同时匹配 ** 和 `
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      result.push(<span key={key++}>{text.slice(lastIdx, match.index)}</span>);
    }
    if (match[2]) {
      // **bold**
      result.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      // `code`
      result.push(
        <code
          key={key++}
          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-pink-600"
        >
          {match[3]}
        </code>,
      );
    }
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < text.length) {
    result.push(<span key={key++}>{text.slice(lastIdx)}</span>);
  }
  return result;
}

interface Props {
  content: string;
}

export function SimpleMarkdown({ content }: Props) {
  const blocks = parse(content);

  return (
    <div className="prose prose-gray max-w-none">
      {blocks.map((b, idx) => {
        switch (b.type) {
          case 'h1':
            return (
              <h1 key={idx} className="mb-4 mt-6 text-3xl font-bold text-gray-900">
                {renderInline(b.content!)}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={idx} className="mb-3 mt-6 text-2xl font-semibold text-gray-900">
                {renderInline(b.content!)}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={idx} className="mb-2 mt-4 text-xl font-semibold text-gray-800">
                {renderInline(b.content!)}
              </h3>
            );
          case 'p':
            return (
              <p key={idx} className="mb-3 leading-relaxed text-gray-700">
                {renderInline(b.content!)}
              </p>
            );
          case 'quote':
            return (
              <blockquote
                key={idx}
                className="my-4 border-l-4 border-amber-400 bg-amber-50 px-4 py-2 italic text-gray-700"
              >
                {renderInline(b.content!)}
              </blockquote>
            );
          case 'ul':
            return (
              <ul key={idx} className="mb-3 ml-6 list-disc space-y-1 text-gray-700">
                {b.items!.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className="mb-3 ml-6 list-decimal space-y-1 text-gray-700">
                {b.items!.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          case 'hr':
            return <hr key={idx} className="my-6 border-gray-200" />;
          case 'table':
            return (
              <div key={idx} className="my-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {b.rows!.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className={`px-3 py-2 ${ci === 0 ? 'font-medium text-gray-900' : 'text-gray-700'}`}
                          >
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
