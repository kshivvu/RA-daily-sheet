import { callGemini } from "@/lib/gemini";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { raw } = (await req.json()) as { raw?: string };

  const prompt = `You are a math question formatter for an Indian school (CBSE/ICSE class 4-10).

The following text was extracted via OCR from a handwritten math question. It may have spelling errors, missing spaces, broken symbols, or formatting issues.

Your job:
1. Fix all OCR errors and spelling mistakes
2. Format the question properly
3. Return the question in LaTeX format for any mathematical expressions
4. Wrap ALL math expressions in \\( \\) for inline math
5. Return ONLY the cleaned question string, nothing else, no explanation, no preamble

Raw OCR text: "${raw ?? ""}"`;

  try {
    const enhanced = await callGemini(prompt);
    return Response.json({ enhanced: enhanced.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Enhancement failed:", message);
    return Response.json({ error: "Enhancement failed", details: message }, { status: 500 });
  }
}
