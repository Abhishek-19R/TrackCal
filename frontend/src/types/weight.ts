export type WeightUnit = 'kg' | 'lbs'

export interface WeightLogResponse {
  id: string
  user_id: string
  date: string
  weight_kg: number
  unit: string
  note?: string | null
  created_at: string
}

export interface WeightLogCreate {
  date: string
  weight_kg?: number | null
  weight?: number | null
  unit?: WeightUnit
  note?: string | null
}

export interface WeightHistoryResponse {
  items: WeightLogResponse[]
  total: number
}
