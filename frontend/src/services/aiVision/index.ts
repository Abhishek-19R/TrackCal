import { GeminiVisionProvider } from './geminiProvider.ts'
import { matchDetectedItemsWithCatalog } from './catalogMatcher.ts'
import type { VisionAnalysisResult } from './types.ts'

export const STORAGE_KEY_GEMINI = 'nutritrack_client_gemini_key'

export const getStoredAiKey = (): string => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(STORAGE_KEY_GEMINI)?.trim() || ''
}

export const setStoredAiKey = (key: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY_GEMINI, key.trim())
}

export const clearStoredAiKey = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY_GEMINI)
}

export const hasStoredAiKey = (): boolean => {
  return Boolean(getStoredAiKey())
}

/**
 * Validates and converts an image File to a base64 data string.
 * Enforces file format and a 10MB maximum size limit.
 */
export const convertFileToBase64 = (
  file: File
): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif']
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|heic|gif)$/i)) {
      return reject(
        new Error('Unsupported file format. Please upload a JPEG, PNG, or WebP image.')
      )
    }

    const MAX_SIZE_MB = 10
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return reject(
        new Error(`Image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size is ${MAX_SIZE_MB}MB.`)
      )
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve({
        base64: result,
        mimeType: file.type || 'image/jpeg',
      })
    }
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

const defaultProvider = new GeminiVisionProvider()

/**
 * End-to-end photo analyzer:
 * 1. Encodes image to Base64
 * 2. Invokes vision provider with BYOK client key
 * 3. Enforces strict schema validation
 * 4. Matches detected items with verified catalog foods
 */
export const analyzeFoodPhoto = async (
  file: File,
  userPrompt?: string,
  overrideKey?: string
): Promise<VisionAnalysisResult> => {
  const key = overrideKey?.trim() || getStoredAiKey()
  const { base64, mimeType } = await convertFileToBase64(file)

  // 1. Analyze with vision model
  const rawAnalysis = await defaultProvider.analyzeImage(
    base64,
    mimeType,
    { apiKey: key },
    userPrompt
  )

  // 2. Cross-reference identified items with local database for verified macros
  const matchedItems = await matchDetectedItemsWithCatalog(rawAnalysis.items)

  return {
    ...rawAnalysis,
    items: matchedItems,
  }
}

export * from './types.ts'
export * from './validator.ts'
export * from './geminiProvider.ts'
export * from './catalogMatcher.ts'
