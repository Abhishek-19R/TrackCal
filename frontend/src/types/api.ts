export interface ApiError {
  message: string
  status: number
  detail?: string | unknown
}

export class ApiException extends Error {
  status: number
  detail?: string | unknown

  constructor(message: string, status: number, detail?: string | unknown) {
    super(message)
    this.name = 'ApiException'
    this.status = status
    this.detail = detail
  }
}

export interface RequestOptions extends RequestInit {
  userId?: string
}
