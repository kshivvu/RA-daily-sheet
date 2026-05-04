type GeminiGenerationConfig = {
  maxOutputTokens?: number;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: unknown;
};

export async function callGemini(prompt: string, config: GeminiGenerationConfig = {}): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          maxOutputTokens: config.maxOutputTokens ?? 2048,
          temperature: config.temperature ?? 0.3,
          ...(config.responseMimeType ? { responseMimeType: config.responseMimeType } : {}),
          ...(config.responseSchema ? { responseSchema: config.responseSchema } : {})
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? "")
    .join("");

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}
