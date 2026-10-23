import test from 'node:test'
import assert from 'node:assert/strict'

// Import modules under test
// Note: We can test pure validator and calculation functions or import TS via tsx / esbuild / compile,
// or write the test in JS/MJS importing compiled or transpile-free pure logic.
// Let's create the unit tests directly checking all validation and error handling contracts.

// Inline mirror / direct test of the validator and logic
import {
  extractJsonFromAiResponse,
  validateAndSanitizeVisionOutput,
  VisionValidationError,
} from '../src/services/aiVision/validator.ts'

import {
  VisionKeyMissingError,
  VisionQuotaExceededError,
  VisionApiError,
  GeminiVisionProvider,
} from '../src/services/aiVision/geminiProvider.ts'

import { recalculateItemNutrients } from '../src/services/aiVision/catalogMatcher.ts'

test('extractJsonFromAiResponse - extracts clean JSON from code blocks and raw text', () => {
  const markdownFenced = '```json\n{\n  "items": [{"name": "Rice"}]\n}\n```'
  assert.equal(
    extractJsonFromAiResponse(markdownFenced),
    '{\n  "items": [{"name": "Rice"}]\n}'
  )

  const genericFenced = '```\n{"items": [{"name": "Eggs"}]}\n```'
  assert.equal(
    extractJsonFromAiResponse(genericFenced),
    '{"items": [{"name": "Eggs"}]}'
  )

  const surroundedText = 'Here is what I found on your plate:\n{"meal_description": "Lunch", "items": []}\nHope that helps!'
  assert.equal(
    extractJsonFromAiResponse(surroundedText),
    '{"meal_description": "Lunch", "items": []}'
  )

  assert.throws(
    () => extractJsonFromAiResponse(''),
    VisionValidationError
  )
})

test('validateAndSanitizeVisionOutput - validates and sanitizes valid AI output', () => {
  const rawAiOutput = JSON.stringify({
    meal_description: 'Grilled chicken with steamed broccoli and brown rice',
    overall_confidence: 'high',
    clarification_needed: null,
    items: [
      {
        name: 'Grilled Chicken Breast',
        likely_preparation: 'grilled',
        estimated_portion_description: '1 medium breast',
        estimated_weight_g: 180,
        confidence: 'high',
        estimated_calories: 297,
        estimated_protein_g: 55.8,
        estimated_carbs_g: 0,
        estimated_fat_g: 6.5,
      },
      {
        name: 'Steamed Broccoli',
        estimated_weight_g: 100,
        confidence: 'medium',
        estimated_calories: 35,
        estimated_protein_g: 2.4,
        estimated_carbs_g: 7.2,
        estimated_fat_g: 0.4,
      },
    ],
  })

  const result = validateAndSanitizeVisionOutput(rawAiOutput)
  assert.equal(result.meal_description, 'Grilled chicken with steamed broccoli and brown rice')
  assert.equal(result.overall_confidence, 'high')
  assert.equal(result.clarification_needed, null)
  assert.equal(result.items.length, 2)

  const [chicken, broccoli] = result.items
  assert.equal(chicken.name, 'Grilled Chicken Breast')
  assert.equal(chicken.estimated_weight_g, 180)
  assert.equal(chicken.calories, 297)
  assert.equal(chicken.protein_g, 55.8)
  assert.equal(chicken.confidence, 'high')

  assert.equal(broccoli.name, 'Steamed Broccoli')
  assert.equal(broccoli.estimated_weight_g, 100)
  assert.equal(broccoli.calories, 35)
})

test('validateAndSanitizeVisionOutput - clamps out-of-range weights', () => {
  const extremeWeights = JSON.stringify({
    items: [
      { name: 'Tiny speck', estimated_weight_g: 1 }, // below min (5g)
      { name: 'Giant feast', estimated_weight_g: 9999 }, // above max (3000g)
    ],
  })

  const result = validateAndSanitizeVisionOutput(extremeWeights)
  assert.equal(result.items[0].estimated_weight_g, 5)
  assert.equal(result.items[1].estimated_weight_g, 3000)
})

test('validateAndSanitizeVisionOutput - rejects empty or missing items array', () => {
  const noItems = JSON.stringify({ meal_description: 'Empty plate', items: [] })
  assert.throws(
    () => validateAndSanitizeVisionOutput(noItems),
    (err) => err instanceof VisionValidationError && err.message.includes('No food items were identified')
  )

  const missingItems = JSON.stringify({ meal_description: 'Something' })
  assert.throws(
    () => validateAndSanitizeVisionOutput(missingItems),
    VisionValidationError
  )

  const malformedJson = '{ items: [invalid] }'
  assert.throws(
    () => validateAndSanitizeVisionOutput(malformedJson),
    VisionValidationError
  )
})

test('recalculateItemNutrients - scales estimates and verifies catalog recalculations', () => {
  const baseItem = {
    id: 'det_1',
    name: 'Brown Rice',
    estimated_portion_description: '100g portion',
    estimated_weight_g: 100,
    confidence: 'medium',
    catalog_food_id: null,
    catalog_food_name: null,
    is_verified_from_catalog: false,
    calories: 120,
    protein_g: 2.5,
    carbs_g: 25.0,
    fat_g: 1.0,
  }

  // 1. Proportional scaling when no catalog food provided
  const scaled = recalculateItemNutrients(baseItem, 200)
  assert.equal(scaled.estimated_weight_g, 200)
  assert.equal(scaled.calories, 240)
  assert.equal(scaled.protein_g, 5.0)
  assert.equal(scaled.carbs_g, 50.0)
  assert.equal(scaled.fat_g, 2.0)

  // 2. Exact catalog recalculation from nutrients_per_100g
  const mockCatalogFood = {
    id: 'food_123',
    name: 'Cooked Brown Rice (USDA)',
    brand: null,
    barcode: null,
    serving_sizes: [{ description: '1 cup', weight_g: 195, is_default: true }],
    nutrients_per_100g: {
      calories: 111,
      protein_g: 2.6,
      carbs_g: 23.0,
      fat_g: 0.9,
    },
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  }

  const catalogRecalc = recalculateItemNutrients(baseItem, 150, mockCatalogFood)
  assert.equal(catalogRecalc.catalog_food_id, 'food_123')
  assert.equal(catalogRecalc.is_verified_from_catalog, true)
  assert.equal(catalogRecalc.estimated_weight_g, 150)
  // (111 * 150) / 100 = 166.5 -> 167
  assert.equal(catalogRecalc.calories, 167)
  // (2.6 * 150) / 100 = 3.9
  assert.equal(catalogRecalc.protein_g, 3.9)
  // (23 * 150) / 100 = 34.5
  assert.equal(catalogRecalc.carbs_g, 34.5)
})

test('GeminiVisionProvider - throws VisionKeyMissingError when no key configured', async () => {
  const provider = new GeminiVisionProvider()
  await assert.rejects(
    async () => {
      await provider.analyzeImage('dummyBase64', 'image/jpeg', { apiKey: '' })
    },
    VisionKeyMissingError
  )

  await assert.rejects(
    async () => {
      await provider.analyzeImage('dummyBase64', 'image/jpeg', { apiKey: '   ' })
    },
    VisionKeyMissingError
  )
})

test('GeminiVisionProvider - handles quota and API error mappings correctly', async () => {
  const provider = new GeminiVisionProvider()

  // Mock global fetch to return 429
  const originalFetch = globalThis.fetch
  try {
    globalThis.fetch = async () => ({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Resource has been exhausted (e.g. check quota).' } }),
    })

    await assert.rejects(
      async () => {
        await provider.analyzeImage('dummyBase64', 'image/jpeg', { apiKey: 'fake_key' })
      },
      VisionQuotaExceededError
    )

    // Mock global fetch to return 403 Invalid API key
    globalThis.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: { message: 'API_KEY_INVALID' } }),
    })

    await assert.rejects(
      async () => {
        await provider.analyzeImage('dummyBase64', 'image/jpeg', { apiKey: 'invalid_key' })
      },
      (err) => err instanceof VisionApiError && err.status === 403
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})
