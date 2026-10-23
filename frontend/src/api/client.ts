import { ApiException } from '../types/api.ts'
import type { RequestOptions } from '../types/api.ts'

const STORAGE_KEY_USER_ID = 'nutritrack_dev_user_id'

export const DEFAULT_DEV_USER_ID =
  (import.meta.env?.VITE_DEV_USER_ID as string) || '65f000000000000000000001'

export const getApiBaseUrl = (): string => {
  const url =
    (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:8000/api/v1'
  return url.replace(/\/+$/, '')
}

export const getActiveDevUserId = (): string => {
  if (typeof window === 'undefined') return DEFAULT_DEV_USER_ID
  const stored = localStorage.getItem(STORAGE_KEY_USER_ID)
  return stored && stored.trim().length === 24 ? stored.trim() : DEFAULT_DEV_USER_ID
}

export const setActiveDevUserId = (userId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_USER_ID, userId.trim())
    window.dispatchEvent(new CustomEvent('nutritrack:user-changed', { detail: { userId } }))
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${baseUrl}${cleanEndpoint}`

  const userId = options.userId || getActiveDevUserId()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-User-ID': userId,
    ...(options.headers || {}),
  }

  const config: RequestInit = {
    ...options,
    headers,
  }

  let response: Response
  try {
    response = await fetch(url, config)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network connection failed'
    throw new ApiException(`Network Error: ${message}`, 0, error)
  }

  if (response.status === 204) {
    return undefined as unknown as T
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : await response.text()

  if (!response.ok) {
    let detailMessage = 'An unexpected error occurred'
    if (payload && typeof payload === 'object') {
      if ('detail' in payload) {
        detailMessage = typeof payload.detail === 'string' ? payload.detail : JSON.stringify(payload.detail)
      } else if ('message' in payload) {
        detailMessage = String(payload.message)
      }
    } else if (typeof payload === 'string' && payload) {
      detailMessage = payload
    }

    throw new ApiException(
      detailMessage,
      response.status,
      payload
    )
  }

  return payload as T
}
