import type { ConfidenceLevel, DetectedFoodItem, RawVisionResponse, VisionAnalysisResult } from './types.ts'

export class VisionValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VisionValidationError'
  }
}

let nextItemId = 1
export const generateClientItemId = (): string => {
  return `det_${Date.now()}_${nextItemId++}`
}

/**
 * Extracts and cleans a JSON string from AI response text.
 * Strips markdown code fences (```json ... ```) and leading/trailing noise.
 */
export const extractJsonFromAiResponse = (rawText: string): string => {
  if (!rawText || typeof rawText !== 'string') {
    throw new VisionValidationError('Empty response received from AI vision provider.')
  }

  let text = rawText.trim()

  // Match ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim()
  } else {
    // If no explicit fence, find first '{' and last '}'
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      text = text.substring(start, end + 1).trim()
    }
  }

  return text
}

/**
 * Strictly parses and validates raw AI output against the expected vision response schema.
 * Sanitizes untrusted values and guarantees consistent structure.
 */
export const validateAndSanitizeVisionOutput = (rawText: string): VisionAnalysisResult => {
  const jsonString = extractJsonFromAiResponse(rawText)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new VisionValidationError(`Failed to parse AI provider JSON output: ${msg}`)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new VisionValidationError('Invalid provider response: expected a JSON object.')
  }

  const raw = parsed as Partial<RawVisionResponse>

  if (!raw.items || !Array.isArray(raw.items) || raw.items.length === 0) {
    throw new VisionValidationError('No food items were identified in the image. Please try another photo or enter items manually.')
  }

  const sanitizedItems: DetectedFoodItem[] = []

  for (let idx = 0; idx < raw.items.length; idx++) {
    const item = raw.items[idx]
    if (!item || typeof item !== 'object') continue

    const name = typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Food Item #${idx + 1}`

    let weight = 100
    if (typeof item.estimated_weight_g === 'number' && !isNaN(item.estimated_weight_g) && item.estimated_weight_g > 0) {
      weight = Math.min(3000, Math.max(5, Math.round(item.estimated_weight_g)))
    }

    const portionDesc =
      typeof item.estimated_portion_description === 'string' && item.estimated_portion_description.trim()
        ? item.estimated_portion_description.trim()
        : `${weight}g portion`

    let confidence: ConfidenceLevel = 'medium'
    if (item.confidence === 'high' || item.confidence === 'low' || item.confidence === 'medium') {
      confidence = item.confidence
    }

    const calories =
      typeof item.estimated_calories === 'number' && !isNaN(item.estimated_calories) && item.estimated_calories >= 0
        ? Math.round(item.estimated_calories)
        : 0

    const protein_g =
      typeof item.estimated_protein_g === 'number' && !isNaN(item.estimated_protein_g) && item.estimated_protein_g >= 0
        ? Math.round(item.estimated_protein_g * 10) / 10
        : 0

    const carbs_g =
      typeof item.estimated_carbs_g === 'number' && !isNaN(item.estimated_carbs_g) && item.estimated_carbs_g >= 0
        ? Math.round(item.estimated_carbs_g * 10) / 10
        : 0

    const fat_g =
      typeof item.estimated_fat_g === 'number' && !isNaN(item.estimated_fat_g) && item.estimated_fat_g >= 0
        ? Math.round(item.estimated_fat_g * 10) / 10
        : 0

    sanitizedItems.push({
      id: generateClientItemId(),
      name,
      likely_preparation: typeof item.likely_preparation === 'string' ? item.likely_preparation.trim() : undefined,
      estimated_portion_description: portionDesc,
      estimated_weight_g: weight,
      confidence,
      notes: typeof item.notes === 'string' ? item.notes.trim() : undefined,
      catalog_food_id: null,
      catalog_food_name: null,
      is_verified_from_catalog: false,
      calories,
      protein_g,
      carbs_g,
      fat_g,
    })
  }

  if (sanitizedItems.length === 0) {
    throw new VisionValidationError('No valid food records could be extracted from AI output.')
  }

  let overallConfidence: ConfidenceLevel = 'medium'
  if (raw.overall_confidence === 'high' || raw.overall_confidence === 'low' || raw.overall_confidence === 'medium') {
    overallConfidence = raw.overall_confidence
  }

  const mealDesc =
    typeof raw.meal_description === 'string' && raw.meal_description.trim()
      ? raw.meal_description.trim()
      : sanitizedItems.map((i) => i.name).join(', ')

  return {
    meal_description: mealDesc,
    overall_confidence: overallConfidence,
    clarification_needed:
      typeof raw.clarification_needed === 'string' && raw.clarification_needed.trim()
        ? raw.clarification_needed.trim()
        : null,
    items: sanitizedItems,
  }
}
