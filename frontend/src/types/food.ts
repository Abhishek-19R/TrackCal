export type FoodSourceType = 'system' | 'user' | 'external' | 'cached'

export interface FoodProvenance {
  source_type: FoodSourceType
  source_name?: string | null
  external_id?: string | null
  attribution?: string | null
  license?: string | null
}

export interface ServingSize {
  serving_id?: string
  description: string
  weight_g: number
  is_default?: boolean
}

export interface NutrientsPer100g {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
}

export interface FoodResponse {
  id: string
  name: string
  brand?: string | null
  barcode?: string | null
  is_system: boolean
  created_by?: string | null
  provenance: FoodProvenance
  serving_sizes: ServingSize[]
  nutrients_per_100g: NutrientsPer100g
  tags: string[]
  created_at: string
  updated_at: string
}

export interface FoodSearchResponse {
  items: FoodResponse[]
  total: number
  page: number
  limit: number
}

export interface FoodCreate {
  name: string
  brand?: string | null
  barcode?: string | null
  serving_sizes?: ServingSize[]
  nutrients_per_100g: NutrientsPer100g
  tags?: string[]
  provenance?: FoodProvenance | null
}

export interface FoodUpdate {
  name?: string
  brand?: string | null
  barcode?: string | null
  serving_sizes?: ServingSize[]
  nutrients_per_100g?: Partial<NutrientsPer100g>
  tags?: string[]
}
