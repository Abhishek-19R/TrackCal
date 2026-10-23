import { foodApi } from '../../api/foods.ts'
import type { FoodCreate, FoodResponse } from '../../types/food.ts'
import type { DetectedFoodItem } from './types.ts'

/**
 * Searches the catalog for each detected food item and links verified catalog foods
 * and deterministic nutrition calculations where possible.
 */
export const matchDetectedItemsWithCatalog = async (
  items: DetectedFoodItem[]
): Promise<DetectedFoodItem[]> => {
  const matchedList: DetectedFoodItem[] = []

  for (const item of items) {
    try {
      const searchRes = await foodApi.search({ q: item.name, limit: 3 })
      const catalogFoods = searchRes.items || []

      // Look for a close name match in search results
      const lowerName = item.name.toLowerCase()
      const bestMatch =
        catalogFoods.find((f) => f.name.toLowerCase() === lowerName) ||
        catalogFoods.find((f) => lowerName.includes(f.name.toLowerCase()) || f.name.toLowerCase().includes(lowerName)) ||
        catalogFoods[0]

      if (bestMatch) {
        // Calculate deterministic nutrition from verified catalog per 100g
        const weight = item.estimated_weight_g
        const cals = Math.round((bestMatch.nutrients_per_100g.calories * weight) / 100)
        const protein = Math.round(((bestMatch.nutrients_per_100g.protein_g * weight) / 100) * 10) / 10
        const carbs = Math.round(((bestMatch.nutrients_per_100g.carbs_g * weight) / 100) * 10) / 10
        const fat = Math.round(((bestMatch.nutrients_per_100g.fat_g * weight) / 100) * 10) / 10

        matchedList.push({
          ...item,
          catalog_food_id: bestMatch.id,
          catalog_food_name: bestMatch.name,
          is_verified_from_catalog: true,
          calories: cals,
          protein_g: protein,
          carbs_g: carbs,
          fat_g: fat,
        })
      } else {
        matchedList.push(item)
      }
    } catch {
      // In case search fails, preserve item with estimated macros
      matchedList.push(item)
    }
  }

  return matchedList
}

/**
 * Recalculates an item's nutrients when its weight is changed by the user in the review UI.
 */
export const recalculateItemNutrients = (
  item: DetectedFoodItem,
  newWeightG: number,
  catalogFood?: FoodResponse | null
): DetectedFoodItem => {
  const weight = Math.max(1, Math.round(newWeightG))

  if (catalogFood) {
    return {
      ...item,
      estimated_weight_g: weight,
      estimated_portion_description: `${weight}g portion`,
      catalog_food_id: catalogFood.id,
      catalog_food_name: catalogFood.name,
      is_verified_from_catalog: true,
      calories: Math.round((catalogFood.nutrients_per_100g.calories * weight) / 100),
      protein_g: Math.round(((catalogFood.nutrients_per_100g.protein_g * weight) / 100) * 10) / 10,
      carbs_g: Math.round(((catalogFood.nutrients_per_100g.carbs_g * weight) / 100) * 10) / 10,
      fat_g: Math.round(((catalogFood.nutrients_per_100g.fat_g * weight) / 100) * 10) / 10,
    }
  }

  // Scale existing estimate proportionally
  const ratio = item.estimated_weight_g > 0 ? weight / item.estimated_weight_g : 1
  return {
    ...item,
    estimated_weight_g: weight,
    estimated_portion_description: `${weight}g portion`,
    calories: Math.round(item.calories * ratio),
    protein_g: Math.round(item.protein_g * ratio * 10) / 10,
    carbs_g: Math.round(item.carbs_g * ratio * 10) / 10,
    fat_g: Math.round(item.fat_g * ratio * 10) / 10,
  }
}

/**
 * Ensures every confirmed item has a valid MongoDB food_id before logging.
 * If an item is unlinked to a catalog food, creates it in the user's custom catalog
 * so it can be logged and safely reused in the future even offline or without AI quota.
 */
export const ensureCatalogFoodId = async (item: DetectedFoodItem): Promise<string> => {
  if (item.catalog_food_id) {
    return item.catalog_food_id
  }

  // Calculate per 100g basis from the portion
  const weight = Math.max(1, item.estimated_weight_g)
  const factor = 100 / weight
  const per100gCalories = Math.max(0, Math.round(item.calories * factor))
  const per100gProtein = Math.max(0, Math.round(item.protein_g * factor * 10) / 10)
  const per100gCarbs = Math.max(0, Math.round(item.carbs_g * factor * 10) / 10)
  const per100gFat = Math.max(0, Math.round(item.fat_g * factor * 10) / 10)

  const newFoodPayload: FoodCreate = {
    name: item.name,
    brand: 'AI Detected',
    serving_sizes: [
      {
        description: item.estimated_portion_description || `${weight}g portion`,
        weight_g: weight,
        is_default: true,
      },
      {
        description: '100g portion',
        weight_g: 100.0,
        is_default: false,
      },
    ],
    nutrients_per_100g: {
      calories: per100gCalories,
      protein_g: per100gProtein,
      carbs_g: per100gCarbs,
      fat_g: per100gFat,
    },
    tags: ['ai_scanned', 'custom'],
  }

  const created = await foodApi.create(newFoodPayload)
  return created.id
}
