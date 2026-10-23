export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface RawVisionItem {
  name: string
  likely_preparation?: string
  estimated_portion_description?: string
  estimated_weight_g?: number
  confidence?: ConfidenceLevel
  estimated_calories?: number
  estimated_protein_g?: number
  estimated_carbs_g?: number
  estimated_fat_g?: number
  notes?: string
}

export interface RawVisionResponse {
  meal_description?: string
  overall_confidence?: ConfidenceLevel
  clarification_needed?: string | null
  items: RawVisionItem[]
}

export interface DetectedFoodItem {
  id: string
  name: string
  likely_preparation?: string
  estimated_portion_description: string
  estimated_weight_g: number
  confidence: ConfidenceLevel
  notes?: string
  // Catalog linkage
  catalog_food_id?: string | null
  catalog_food_name?: string | null
  is_verified_from_catalog: boolean
  // Nutrition for the estimated portion
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface VisionAnalysisResult {
  meal_description: string
  overall_confidence: ConfidenceLevel
  clarification_needed?: string | null
  items: DetectedFoodItem[]
}

export interface VisionProviderConfig {
  apiKey: string
  model?: string
}

export interface VisionProvider {
  name: string
  analyzeImage(
    base64Data: string,
    mimeType: string,
    config: VisionProviderConfig,
    userPrompt?: string
  ): Promise<VisionAnalysisResult>
}
