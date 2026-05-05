import katex from "katex";

export type Difficulty = "Easy" | "Medium" | "Hard";

export type SheetQuestion = {
  text: string;
  difficulty: Difficulty;
  diagram?: string | null;
};

export type SheetSection = {
  tag: "A" | "B" | "C";
  title: string;
  questions: SheetQuestion[];
};

export type SheetData = {
  class: string;
  subject: string;
  chapter: string;
  date: string;
  tomorrowTopic: string;
  sections: SheetSection[];
};

const QUESTION_STARTS: Record<string, number> = { A: 1, B: 4, C: 8 };
let katexAssets: { css: string; js: string; autoRenderJs: string; external: boolean } | null = null;

function readKatexAssets() {
  if (katexAssets) return katexAssets;
  if (typeof window !== "undefined") {
    katexAssets = {
      css: "@import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');",
      js: "",
      autoRenderJs: "",
      external: true
    };
    return katexAssets;
  }

  try {
    const nodeRequire = eval("require") as NodeRequire;
    const fs = nodeRequire("fs") as typeof import("fs");
    const path = nodeRequire("path") as typeof import("path");
    const katexDir = path.dirname(nodeRequire.resolve("katex/package.json"));
    let css = fs.readFileSync(path.join(katexDir, "dist", "katex.min.css"), "utf8");
    
    const fontsDir = path.join(katexDir, "dist", "fonts");
    css = css.replace(/url\((?:'|")?fonts\/([^)"']+)(?:'|")?\)/g, (match, fontFile) => {
      const fontPath = path.join(fontsDir, fontFile);
      if (fs.existsSync(fontPath)) {
        const fontData = fs.readFileSync(fontPath).toString("base64");
        const ext = path.extname(fontFile).slice(1);
        const mimeType = ext === "woff2" ? "font/woff2" : ext === "woff" ? "font/woff" : "font/truetype";
        return `url(data:${mimeType};base64,${fontData})`;
      }
      return match;
    });

    katexAssets = {
      css: css,
      js: fs.readFileSync(path.join(katexDir, "dist", "katex.min.js"), "utf8"),
      autoRenderJs: fs.readFileSync(path.join(katexDir, "dist", "contrib", "auto-render.min.js"), "utf8"),
      external: false
    };
  } catch {
    katexAssets = { css: "", js: "", autoRenderJs: "", external: false };
  }

  return katexAssets;
}

function escapeHtml(value: string | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMathHtml(value: string): string {
  const pattern = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
  let html = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value)) !== null) {
    html += escapeHtml(value.slice(lastIndex, match.index));
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

  html += escapeHtml(value.slice(lastIndex));
  return html;
}

function formatDate(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return escapeHtml(value);
  return `${day}/${month}/${year}`;
}

function difficultyLabel(difficulty: Difficulty): string {
  return difficulty === "Medium" ? "Med" : difficulty;
}

function diagramSrc(diagram: string): string {
  if (diagram.startsWith("data:image/")) return diagram;
  return `data:image/jpeg;base64,${diagram}`;
}

function sectionRange(tag: string, questionCount: number): string {
  const start = QUESTION_STARTS[tag] ?? 1;
  const end = start + Math.max(questionCount, 1) - 1;
  return `Q.${start} – Q.${end}`;
}

function renderQuestion(question: SheetQuestion, number: number): string {
  const diagram = question.diagram
    ? `<img class="diagram-img" src="${escapeHtml(diagramSrc(question.diagram))}" alt="Question diagram"/>`
    : "";

  return `
    <div class="question">
      <div class="q-num">Q.${number}</div>
      <div class="q-text">${renderMathHtml(question.text)}${diagram}</div>
      <div class="difficulty"><span class="diff-badge">${difficultyLabel(question.difficulty)}</span></div>
    </div>`;
}

function renderSection(section: SheetSection): string {
  const start = QUESTION_STARTS[section.tag] ?? 1;
  const questions = section.questions.map((question, index) => renderQuestion(question, start + index)).join("");

  return `
  <div class="section">
    <div class="section-header">
      <span class="section-tag">Section ${escapeHtml(section.tag)}</span>
      <span class="section-title">${escapeHtml(section.title)}</span>
      <span class="section-range">${sectionRange(section.tag, section.questions.length)}</span>
    </div>${questions}
  </div>`;
}

export function generateSheetHTML(data: SheetData, baseUrl: string): string {
  const trimmedBaseUrl = baseUrl.replace(/\/$/, "");
  const logoUrl = trimmedBaseUrl ? `${trimmedBaseUrl}/logo.jpg.png` : "/logo.jpg.png";
  const classLabel = data.class ? `${escapeHtml(data.class)}th` : "";
  const { css: katexCSS, js: katexJS, autoRenderJs, external } = readKatexAssets();
  const katexScripts = external
    ? `<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>`
    : `<script>${katexJS}</script>
<script>${autoRenderJs}</script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Raj Academy - Daily Sheet</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Montserrat:wght@300;400;500;600&display=swap');

${katexCSS}

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Montserrat', sans-serif;
    background: #f0f0f0;
    padding: 0;
  }

  .page {
    width: 186mm;
    min-height: 277mm;
    background: #fff;
    margin: 0 auto;
    padding: 0;
    box-shadow: none;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 2px solid #000;
    margin-bottom: 6px;
  }

  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-svg { width: 68px; height: 68px; object-fit: cover; object-position: center; display: block; }

  .brand-text h1 { white-space: nowrap;
    font-family: 'Playfair Display', serif;
    font-size: 26px;
    font-weight: 700;
    color: #000;
    letter-spacing: 0px;
    text-transform: uppercase;
  }

  .header-right {
    text-align: right;
    font-size: 9px;
    color: #333;
    line-height: 1.8;
    font-weight: 500;
    letter-spacing: 0.5px;
  }

  .subject-bar {
    text-align: center;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #555;
    margin: 6px 0 2px;
  }

  .meta-bar {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    gap: 10px;
    margin: 10px 0;
  }

  .meta-field label {
    font-size: 7.5px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #555;
    font-weight: 600;
    display: block;
    margin-bottom: 3px;
  }

  .meta-field .line {
    border-bottom: 1px solid #000;
    height: 16px;
    font-size: 10px;
    font-weight: 600;
  }

  .chapter-badge {
    background: #000;
    color: #fff;
    text-align: center;
    padding: 7px 0;
    font-family: 'Playfair Display', serif;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 1.5px;
    margin-bottom: 12px;
  }

  .section { margin-bottom: 12px; }

  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
  }

  .section-tag {
    background: #000;
    color: #fff;
    font-size: 8px;
    font-weight: 600;
    padding: 2px 8px;
    letter-spacing: 0px;
    text-transform: uppercase;
  }

  .section-title { font-size: 10px; font-weight: 600; color: #000; }
  .section-range { font-size: 9px; color: #888; margin-left: auto; font-style: italic; }

  .question {
    display: grid;
    grid-template-columns: 28px 1fr 36px;
    align-items: start;
    gap: 6px;
    padding: 6px 4px;
    border-bottom: 0.8px solid #eee;
    min-height: 36px;
  }

  .question:last-child { border-bottom: none; }

  .q-num { font-size: 9.5px; font-weight: 700; color: #000; padding-top: 1px; }
  .q-text { font-size: 10px; color: #111; line-height: 1.5; }
  .q-text .katex { font-size: 1em; }
  .diagram-img { display: block; max-width: 100%; max-height: 120px; object-fit: contain; margin-top: 6px; border: 1px solid #ccc; }

  .difficulty { text-align: center; padding-top: 2px; }

  .diff-badge {
    font-size: 7px;
    font-weight: 700;
    padding: 2px 4px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    border: 1px solid #000;
    color: #000;
    background: #fff;
  }

  .footer {
    margin-top: 14px;
    padding-top: 8px;
    border-top: 2px solid #000;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }

  .tomorrow-box strong {
    display: block;
    font-size: 8px;
    text-transform: uppercase;
    letter-spacing: 0px;
    margin-bottom: 6px;
    color: #000;
  }

  .tomorrow-line { border-bottom: 1px solid #000; width: 180px; font-size: 10px; font-weight: 600; min-height: 16px; }

  .footer-brand {
    text-align: right;
    font-size: 7.5px;
    color: #555;
    letter-spacing: 0px;
    text-transform: uppercase;
  }

  @media print {
    body { background: none; padding: 0; }
    .page { box-shadow: none; margin: 0; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="logo-area">
      <img class="logo-svg" src="${escapeHtml(logoUrl)}" alt="Raj Academy"/>
      <div class="brand-text"><h1>Raj Academy</h1></div>
    </div>
    <div class="header-right">
      <div>Contact: 9199796653</div>
      <div>Class 4–10 · Patna</div>
    </div>
  </div>

  <!-- SUBJECT BAR -->
  <div class="subject-bar">Subject: ${escapeHtml(data.subject)} &nbsp;·&nbsp; Class ${classLabel}</div>

  <!-- META BAR -->
  <div class="meta-bar">
    <div class="meta-field">
      <label>Student Name</label>
      <div class="line"></div>
    </div>
    <div class="meta-field">
      <label>Class</label>
      <div class="line">${escapeHtml(data.class)}</div>
    </div>
    <div class="meta-field">
      <label>Date</label>
      <div class="line">${formatDate(data.date)}</div>
    </div>
    <div class="meta-field">
      <label>Score</label>
      <div class="line">/10</div>
    </div>
  </div>

  <!-- CHAPTER -->
  <div class="chapter-badge">Chapter: ${escapeHtml(data.chapter)}</div>

  ${data.sections.map(renderSection).join("")}

  <!-- FOOTER -->
  <div class="footer">
    <div class="tomorrow-box">
      <strong>Tomorrow's Topic</strong>
      <div class="tomorrow-line">${escapeHtml(data.tomorrowTopic)}</div>
    </div>
    <div class="footer-brand">Best of Luck · Raj Academy · 9199796653</div>
  </div>

</div>
${katexScripts}
<script>
  window.__RAJ_MATH_RENDERED__ = false;
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(document.body, {
      delimiters: [
        {left: "\\\\(", right: "\\\\)", display: false},
        {left: "\\\\[", right: "\\\\]", display: true}
      ],
      throwOnError: false
    });
  }
  window.__RAJ_MATH_RENDERED__ = true;
</script>
</body>
</html>`;
}
