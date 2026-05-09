import { callGemini } from "@/lib/gemini";
import { cleanDuplicateMath } from "@/lib/cleanMath";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { raw } = (await req.json()) as { raw?: string };

  const prompt = `You are a math question formatter for Indian school students (CBSE/ICSE class 4-10).

The following text was extracted via OCR from a handwritten math question.

Your job:
1. Fix all OCR errors and spelling mistakes
2. Format the question properly
3. Wrap ALL mathematical expressions in \\( \\) for inline LaTeX
4. Return ONLY the cleaned question string — nothing else

CRITICAL: Never write any mathematical expression twice.
- If you use LaTeX for a coordinate, do NOT also write it in plain text
- Wrong: "point (2, 3)A\\(2, 3\\)" → Right: "point \\(A(2, 3)\\)"
- Wrong: "ratio 3:2 \\(3:2\\)" → Right: "ratio \\(3:2\\)"
- Every math expression appears EXACTLY ONCE

Raw OCR text: "${raw ?? ""}"`;

  try {
    const enhanced = await callGemini(prompt);
    return Response.json({ enhanced: cleanDuplicateMath(enhanced) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Enhancement failed:", message);
    return Response.json({ error: "Enhancement failed", details: message }, { status: 500 });
  }
}
