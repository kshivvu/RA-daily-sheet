"use client";

import katex from "katex";

type RenderedMathProps = {
  text: string;
  className?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLatexText(text: string) {
  const pattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
  let html = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    html += escapeHtml(text.slice(lastIndex, match.index));
    const expression = match[1] ?? match[2] ?? "";
    const displayMode = match[2] !== undefined;

    try {
      html += katex.renderToString(expression, {
        displayMode,
        throwOnError: false,
        strict: false
      });
    } catch {
      html += escapeHtml(match[0]);
    }

    lastIndex = pattern.lastIndex;
  }

  html += escapeHtml(text.slice(lastIndex));
  return html;
}

export function RenderedMath({ text, className }: RenderedMathProps) {
  if (!text.trim()) return null;

  return <div className={className} dangerouslySetInnerHTML={{ __html: renderLatexText(text) }} />;
}
