import { callGemini } from "@/lib/gemini";
import type { Difficulty } from "@/lib/sheetTemplate";

export const runtime = "nodejs";

type GeneratedQuestion = {
  text: string;
  difficulty: Difficulty;
};

export async function POST(req: Request) {
  const { class: cls, chapter, easy, medium, hard } = (await req.json()) as {
    class?: string;
    chapter?: string;
    easy?: number;
    medium?: number;
    hard?: number;
  };

const prompt = `You are a math teacher creating practice questions for Indian school students (CBSE/ICSE).

Generate exactly 10 math questions for:
- Class: ${cls ?? ""}
- Chapter: ${chapter ?? ""}
- Distribution: ${easy ?? 0} Easy, ${medium ?? 0} Medium, ${hard ?? 0} Hard

Rules:
1. Questions must be appropriate for the class level
2. Format ALL mathematical expressions in LaTeX wrapped in \\( \\) for inline math
3. Vary question types within the chapter
4. Keep each question concise enough to fit a printed worksheet row
5. Return exactly the requested difficulty distribution`;

  try {
    const raw = await callGemini(prompt, {
      maxOutputTokens: 4096,
      temperature: 0.35,
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        minItems: 10,
        maxItems: 10,
        items: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING" },
            difficulty: {
              type: "STRING",
              enum: ["Easy", "Medium", "Hard"]
            }
          },
          required: ["text", "difficulty"],
          propertyOrdering: ["text", "difficulty"]
        }
      }
    });
    const clean = raw.replace(/```json|```/g, "").trim();
    let questions: GeneratedQuestion[];
    try {
      questions = JSON.parse(clean) as GeneratedQuestion[];
    } catch (parseError) {
      const repaired = clean.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
      try {
        questions = JSON.parse(repaired) as GeneratedQuestion[];
      } catch {
        console.error("Question JSON parse failed:", {
          message: parseError instanceof Error ? parseError.message : "Unknown parse error",
          clean: clean.slice(0, 500),
          repaired: repaired.slice(0, 500)
        });
        throw parseError;
      }
    }

    if (!Array.isArray(questions) || questions.length !== 10) {
      throw new Error(`Gemini returned ${Array.isArray(questions) ? questions.length : "non-array"} questions instead of 10`);
    }

    return Response.json({ questions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Generation failed:", message);
    return Response.json({ error: "Generation failed", details: message }, { status: 500 });
  }
}
