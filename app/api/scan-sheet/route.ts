import { callGeminiWithImage } from '@/lib/gemini'
import { cleanDuplicateMath } from '@/lib/cleanMath'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const image = formData.get('image') as File | null

    if (!image) {
      return Response.json({ success: false, error: 'No image provided' }, { status: 400 })
    }

    const imageBytes = await image.arrayBuffer()
    const base64Image = Buffer.from(imageBytes).toString('base64')
    const mimeType = image.type

    const prompt = `You are scanning a handwritten math question sheet for Indian school students (CBSE/ICSE).

Extract all math questions from this image. There should be around 10 questions total.

For each question:
1. Read the handwriting carefully
2. Fix any obvious errors
3. Format ALL mathematical expressions in LaTeX wrapped in \\( \\) for inline math
4. Assign difficulty: Easy, Medium, or Hard based on complexity
5. Preserve the question number order

CRITICAL FORMATTING RULES:
- Never write any expression in both plain text AND LaTeX
- Replace plain text math entirely with LaTeX wrapped version
- Coordinates must be: \\(A(x, y)\\) not (x,y)A\\(x,y\\)
- Equations must be: \\(x - y = 0\\) not x - y = 0\\(x - y = 0\\)

Return ONLY a valid JSON array. No explanation. No markdown. No preamble.

Format:
[
  { "number": 1, "text": "question text with \\(LaTeX\\) math", "difficulty": "Easy" },
  { "number": 2, "text": "...", "difficulty": "Medium" },
  ...
]

If you cannot read a question clearly, include it with text: "[Could not read - please fill manually]" and difficulty: "Easy".`

    const responseText = await callGeminiWithImage(prompt, base64Image, mimeType)

    // Strip markdown code blocks if present
    const cleaned = responseText.replace(/```json|```/g, '').trim()

    const questions = JSON.parse(cleaned).map((q: { number: number; text: string; difficulty: string }) => ({
      ...q,
      text: cleanDuplicateMath(q.text)
    }))
    return Response.json({ success: true, questions })
  } catch (err) {
    console.error('Scan error:', err)
    return Response.json({ success: false, error: 'Could not parse questions' }, { status: 500 })
  }
}
