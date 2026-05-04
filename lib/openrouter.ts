export async function callOpenRouter(prompt: string): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const models = [
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "google/gemini-3.0-flash",
    "google/gemini-2.5-pro",
    "google/gemini-1.5-flash",
    "google/gemini-1.5-pro"
  ];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://rajacademy.app",
          "X-Title": "Raj Academy Sheet Generator"
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2048,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const status = response.status;
        
        // If it's a rate limit (429), payment required/quota (402), or server error (500+), try the next model
        if (status === 429 || status === 402 || status >= 500) {
          lastError = new Error(`OpenRouter error (${model}): ${status} - ${errorText}`);
          console.warn(`[OpenRouter] Model ${model} failed with ${status}. Falling back to next...`);
          continue;
        }
        
        // For bad requests (400) or other issues, throw immediately
        throw new Error(`OpenRouter error (${model}): ${status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (err) {
      // Network errors or parsing errors will fall through here
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[OpenRouter] Model ${model} failed with error: ${lastError.message}. Falling back...`);
      // Try next model
    }
  }

  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}
