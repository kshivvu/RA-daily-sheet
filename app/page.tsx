"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { RenderedMath } from "@/components/RenderedMath";
import { SheetPreview } from "@/components/SheetPreview";
import type { Difficulty, SheetData, SheetQuestion } from "@/lib/sheetTemplate";

const today = new Date().toISOString().slice(0, 10);
const difficulties: Difficulty[] = ["Easy", "Medium", "Hard"];

const defaultData: SheetData = {
  class: "10",
  subject: "Mathematics",
  chapter: "",
  date: today,
  tomorrowTopic: "",
  sections: [
    {
      tag: "A",
      title: "",
      questions: [
        { text: "", difficulty: "Easy", diagram: null },
        { text: "", difficulty: "Easy", diagram: null },
        { text: "", difficulty: "Medium", diagram: null }
      ]
    },
    {
      tag: "B",
      title: "",
      questions: [
        { text: "", difficulty: "Easy", diagram: null },
        { text: "", difficulty: "Medium", diagram: null },
        { text: "", difficulty: "Medium", diagram: null },
        { text: "", difficulty: "Hard", diagram: null }
      ]
    },
    {
      tag: "C",
      title: "",
      questions: [
        { text: "", difficulty: "Easy", diagram: null },
        { text: "", difficulty: "Medium", diagram: null },
        { text: "", difficulty: "Hard", diagram: null }
      ]
    }
  ]
};

function questionNumber(sectionIndex: number, questionIndex: number) {
  const starts = [1, 4, 8];
  return starts[sectionIndex] + questionIndex;
}

function questionKey(sectionIndex: number, questionIndex: number) {
  return `${sectionIndex}-${questionIndex}`;
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [data, setData] = useState<SheetData>(defaultData);
  const [mix, setMix] = useState({ easy: 3, medium: 4, hard: 3 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [enhancing, setEnhancing] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");

  const previewData = useMemo(() => data, [data]);
  const mixTotal = mix.easy + mix.medium + mix.hard;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3500);
  }

  function updateMeta(field: keyof Omit<SheetData, "sections">, value: string) {
    setData((current) => ({ ...current, [field]: value }));
  }

  function updateSectionTitle(sectionIndex: number, value: string) {
    setData((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex ? { ...section, title: value } : section
      )
    }));
  }

  function updateQuestion(sectionIndex: number, questionIndex: number, changes: Partial<SheetQuestion>) {
    setData((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          questions: section.questions.map((question, qIndex) =>
            qIndex === questionIndex ? { ...question, ...changes } : question
          )
        };
      })
    }));
  }

  async function enhanceQuestion(sectionIndex: number, questionIndex: number) {
    const key = questionKey(sectionIndex, questionIndex);
    const raw = data.sections[sectionIndex].questions[questionIndex].text;
    if (!raw.trim()) {
      showToast("Add question text first");
      return;
    }

    setEnhancing((current) => ({ ...current, [key]: true }));
    try {
      const response = await fetch("/api/enhance-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw })
      });

      if (!response.ok) throw new Error("Enhancement failed");
      const result = (await response.json()) as { enhanced: string };
      updateQuestion(sectionIndex, questionIndex, { text: result.enhanced });
    } catch {
      showToast("Could not enhance, please try again");
    } finally {
      setEnhancing((current) => ({ ...current, [key]: false }));
    }
  }

  async function generateQuestions() {
    if (mixTotal !== 10) {
      showToast("Difficulty counts must add up to 10");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class: data.class,
          chapter: data.chapter,
          easy: mix.easy,
          medium: mix.medium,
          hard: mix.hard
        })
      });

      if (!response.ok) throw new Error("Generation failed");
      const result = (await response.json()) as { questions: SheetQuestion[] };
      const questions = result.questions.slice(0, 10);

      setData((current) => ({
        ...current,
        sections: current.sections.map((section, sectionIndex) => {
          const start = [0, 3, 7][sectionIndex];
          return {
            ...section,
            questions: section.questions.map((question, index) => ({
              ...question,
              ...questions[start + index],
              diagram: question.diagram ?? null
            }))
          };
        })
      }));
    } catch {
      showToast("Could not generate questions, please try again");
    } finally {
      setIsGenerating(false);
    }
  }

  async function addDiagram(sectionIndex: number, questionIndex: number, file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      showToast("Use a JPG or PNG under 2MB");
      return;
    }

    try {
      const diagram = await fileToDataUrl(file);
      updateQuestion(sectionIndex, questionIndex, { diagram });
    } catch {
      showToast("Could not add diagram");
    }
  }

  async function downloadPdf() {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `RajAcademy_Class${data.class}_${data.date}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Could not download PDF, please try again");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-5 text-black sm:px-6 lg:px-8">
      {toast ? (
        <div className="fixed right-4 top-4 z-50 border border-black bg-white px-4 py-3 text-sm font-semibold shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(420px,560px)_1fr]">
        <section>
          <div className="mb-6 flex items-center gap-3 border-b-2 border-black pb-4">
            <Image src="/logo.jpg.png" width={68} height={68} alt="Raj Academy" className="h-[68px] w-[68px] object-cover" />
            <div>
              <h1 className="font-playfair text-3xl font-bold uppercase leading-none">Raj Academy</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">Daily Sheet Generator</p>
            </div>
          </div>

          <form className="space-y-8" onSubmit={(event) => event.preventDefault()}>
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em]">Sheet Meta</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-[0.12em]">
                  Class
                  <select value={data.class} onChange={(event) => updateMeta("class", event.target.value)} className="mt-1 h-11 w-full border-0 border-b border-black bg-white px-0 text-base outline-none">
                    {[4, 5, 6, 7, 8, 9, 10].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em]">
                  Subject
                  <input value={data.subject} onChange={(event) => updateMeta("subject", event.target.value)} className="mt-1 h-11 w-full border-0 border-b border-black px-0 text-base outline-none" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em]">
                  Chapter
                  <input value={data.chapter} onChange={(event) => updateMeta("chapter", event.target.value)} className="mt-1 h-11 w-full border-0 border-b border-black px-0 text-base outline-none" />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em]">
                  Date
                  <input type="date" value={data.date} onChange={(event) => updateMeta("date", event.target.value)} className="mt-1 h-11 w-full border-0 border-b border-black px-0 text-base outline-none" />
                </label>
              </div>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em]">
                Tomorrow&apos;s Topic
                <input value={data.tomorrowTopic} onChange={(event) => updateMeta("tomorrowTopic", event.target.value)} className="mt-1 h-11 w-full border-0 border-b border-black px-0 text-base outline-none" />
              </label>
            </div>

            <div className="space-y-4 border-y-2 border-black py-5">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em]">AI Question Generator</h2>
              <div className="grid grid-cols-3 gap-3">
                {(["easy", "medium", "hard"] as const).map((level) => (
                  <label key={level} className="block text-xs font-semibold uppercase tracking-[0.12em]">
                    {level === "medium" ? "Med" : level}
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={mix[level]}
                      onChange={(event) => setMix((current) => ({ ...current, [level]: Number(event.target.value) }))}
                      className="mt-1 h-11 w-full border-0 border-b border-black px-0 text-base outline-none"
                    />
                  </label>
                ))}
              </div>
              <button type="button" onClick={generateQuestions} disabled={isGenerating || mixTotal !== 10} className="min-h-12 w-full bg-black px-4 py-4 font-playfair text-base font-semibold text-white disabled:opacity-50">
                {isGenerating ? "Generating questions..." : "Generate Questions ✨"}
              </button>
            </div>

            {data.sections.map((section, sectionIndex) => (
              <div key={section.tag} className="space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-[0.18em]">Section {section.tag}</h2>
                <label className="block text-xs font-semibold uppercase tracking-[0.12em]">
                  Section Title
                  <input value={section.title} onChange={(event) => updateSectionTitle(sectionIndex, event.target.value)} className="mt-1 h-11 w-full border-0 border-b border-black px-0 text-base outline-none" />
                </label>
                <div className="space-y-5">
                  {section.questions.map((question, questionIndex) => {
                    const key = questionKey(sectionIndex, questionIndex);
                    return (
                      <div key={`${section.tag}-${questionIndex}`} className="border-b border-neutral-200 pb-4">
                        <div className="grid gap-3 sm:grid-cols-[44px_1fr_104px_92px_54px]">
                          <div className="pt-3 text-sm font-bold">Q{questionNumber(sectionIndex, questionIndex)}</div>
                          <textarea value={question.text} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { text: event.target.value })} rows={2} className="min-h-11 resize-y border-0 border-b border-black px-0 py-2 text-sm leading-6 outline-none" />
                          <select value={question.difficulty} onChange={(event) => updateQuestion(sectionIndex, questionIndex, { difficulty: event.target.value as Difficulty })} className="h-11 border-0 border-b border-black bg-white text-sm outline-none">
                            {difficulties.map((difficulty) => (
                              <option key={difficulty} value={difficulty}>
                                {difficulty}
                              </option>
                            ))}
                          </select>
                          <button type="button" onClick={() => enhanceQuestion(sectionIndex, questionIndex)} disabled={Boolean(enhancing[key])} className="min-h-11 border border-black px-3 text-sm font-semibold disabled:opacity-50">
                            {enhancing[key] ? "..." : "Enhance ✨"}
                          </button>
                          <label className="flex min-h-11 cursor-pointer items-center justify-center border border-black text-lg font-semibold">
                            📷
                            <input type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" onChange={(event) => addDiagram(sectionIndex, questionIndex, event.target.files?.[0])} />
                          </label>
                        </div>
                        <RenderedMath text={question.text} className="mt-2 min-h-8 border-l-2 border-black pl-3 text-sm leading-6" />
                        {question.diagram ? (
                          <div className="mt-3 flex items-start gap-3">
                            <Image src={question.diagram} alt="Diagram preview" width={96} height={72} className="max-h-24 w-24 border border-black object-contain" unoptimized />
                            <button type="button" onClick={() => updateQuestion(sectionIndex, questionIndex, { diagram: null })} className="min-h-10 border border-black px-3 text-sm font-semibold">
                              Remove
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <button type="button" onClick={downloadPdf} disabled={isDownloading} className="min-h-12 w-full bg-black px-4 py-4 font-playfair text-base font-semibold text-white disabled:opacity-60">
              {isDownloading ? "Preparing PDF..." : "Download PDF"}
            </button>
          </form>
        </section>

        <section aria-label="Preview" className="min-w-0">
          <SheetPreview data={previewData} />
        </section>
      </div>
    </main>
  );
}
