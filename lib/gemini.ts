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

  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-2.5-pro",
    "gemini-flash-latest",
    "gemini-pro-latest"
  ];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
        const errorText = await response.text();
        const status = response.status;
        
        // 429 = Rate Limit/Quota, 500+ = Server Error. Try next model.
        if (status === 429 || status >= 500) {
          lastError = new Error(`Gemini error (${model}): ${status} - ${errorText}`);
          console.warn(`[Gemini] Model ${model} failed with ${status}. Falling back...`);
          continue;
        }
        
        // For other errors (like 400 Bad Request, 404 Not Found), throw immediately
        throw new Error(`Gemini error (${model}): ${status} - ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("");

      if (!text) {
        throw new Error(`Gemini (${model}) returned an empty response`);
      }

      return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Gemini] Model ${model} failed with error: ${lastError.message}. Falling back...`);
      // Try next model
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}
