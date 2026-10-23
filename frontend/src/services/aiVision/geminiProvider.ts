import type { VisionAnalysisResult, VisionProvider, VisionProviderConfig } from './types.ts'
import { validateAndSanitizeVisionOutput, VisionValidationError } from './validator.ts'

export class VisionKeyMissingError extends Error {
  constructor(message = 'No Gemini API key provided. Please configure your key in Settings or enter it below.') {
    super(message)
    this.name = 'VisionKeyMissingError'
  }
}

export class VisionQuotaExceededError extends Error {
  constructor(message = 'Gemini API free-tier quota exceeded. Please wait a moment before trying again, or log foods manually.') {
    super(message)
    this.name = 'VisionQuotaExceededError'
  }
}

export class VisionApiError extends Error {
  public status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'VisionApiError'
    this.status = status
  }
}

const SYSTEM_PROMPT = `You are NutriTrack AI, a nutrition and food identification vision assistant.
Your task is to analyze the food photograph and return a structured JSON response identifying every distinct food item on the plate.

For each distinct food item identify:
- "name": Clean, common food name (e.g. "Chicken Breast", "Brown Rice", "Scrambled Eggs", "Mixed Green Salad", "Paneer Tikka", "Roti", "Dal").
- "likely_preparation": Brief preparation note (e.g. "grilled", "steamed", "fried in oil", "boiled", "raw").
- "estimated_portion_description": Human-friendly portion description (e.g. "1 medium breast", "1 cup cooked", "2 pieces", "1 slice").
- "estimated_weight_g": Realistic estimated weight in grams (number only, between 10 and 2000).
- "confidence": "high", "medium", or "low".
- "estimated_calories": Approximate calories for this estimated portion (number).
- "estimated_protein_g": Approximate protein in grams for this portion (number).
- "estimated_carbs_g": Approximate carbs in grams for this portion (number).
- "estimated_fat_g": Approximate fat in grams for this portion (number).
- "notes": Optional brief detail (e.g. "appears to have cheese topping").

Also provide:
- "meal_description": A 1-sentence summary of the meal plate.
- "overall_confidence": "high", "medium", or "low".
- "clarification_needed": If any component is ambiguous (e.g. "Could not tell if sauce is mayonnaise or yogurt-based"), describe briefly. Otherwise null.

Strictly return ONLY a valid JSON object matching this schema:
{
  "meal_description": "...",
  "overall_confidence": "high" | "medium" | "low",
  "clarification_needed": null | "...",
  "items": [
    {
      "name": "...",
      "likely_preparation": "...",
      "estimated_portion_description": "...",
      "estimated_weight_g": 150,
      "confidence": "high" | "medium" | "low",
      "estimated_calories": 250,
      "estimated_protein_g": 25,
      "estimated_carbs_g": 10,
      "estimated_fat_g": 5,
      "notes": "..."
    }
  ]
}`

export class GeminiVisionProvider implements VisionProvider {
  public readonly name = 'Google Gemini (Free Tier)'

  async analyzeImage(
    base64Data: string,
    mimeType: string,
    config: VisionProviderConfig,
    userPrompt?: string
  ): Promise<VisionAnalysisResult> {
    const key = config.apiKey?.trim()
    if (!key) {
      throw new VisionKeyMissingError()
    }

    const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z+]+;base64,/, '')
    const promptText = userPrompt?.trim()
      ? `${SYSTEM_PROMPT}\n\nAdditional user clarification / context: "${userPrompt.trim()}". Prioritize this context when estimating ingredients and portions.`
      : SYSTEM_PROMPT

    const requestBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }

    // Try gemini-2.5-flash first, then fallback to gemini-1.5-flash
    const candidateModels = [config.model || 'gemini-2.5-flash', 'gemini-1.5-flash']
    let lastError: Error | null = null

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
          const status = response.status
          let errorMsg = `Gemini API returned HTTP ${status}`
          try {
            const errJson = await response.json()
            if (errJson?.error?.message) {
              errorMsg = errJson.error.message
            }
          } catch {
            // Keep default message if json parse fails
          }

          if (status === 429) {
            throw new VisionQuotaExceededError(`Gemini quota limit reached: ${errorMsg}`)
          }
          if (status === 400 || status === 403) {
            throw new VisionApiError(`Gemini authentication error: ${errorMsg}`, status)
          }
          if (status === 404 && model !== candidateModels[candidateModels.length - 1]) {
            // Model not found on this key/version, try next candidate
            continue
          }

          throw new VisionApiError(errorMsg, status)
        }

        const data = await response.json()
        const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text

        if (!rawContent) {
          throw new VisionValidationError('Gemini returned an empty candidate text block.')
        }

        return validateAndSanitizeVisionOutput(rawContent)
      } catch (err: unknown) {
        if (err instanceof VisionQuotaExceededError || err instanceof VisionApiError) {
          throw err
        }
        if (err instanceof VisionValidationError) {
          throw err
        }
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }

    throw lastError || new VisionApiError('Failed to analyze image with Gemini API.')
  }
}
