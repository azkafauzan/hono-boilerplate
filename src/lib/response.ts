export type ApiSuccessResponse<T> = {
  success: true
  message: string
  data: T
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ApiPaginatedResponse<T> = {
  success: true
  message: string
  data: T[]
  meta: PaginationMeta
}

export type ApiErrorResponse = {
  success: false
  message: string
  error: unknown
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export const successResponse = <T>(data: T, message = "Success"): ApiSuccessResponse<T> => ({
  success: true,
  message,
  data,
})

export const paginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = "Success",
): ApiPaginatedResponse<T> => ({
  success: true,
  message,
  data,
  meta: {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  },
})

export const errorResponse = (
  message = "An error occurred",
  error: unknown = null,
): ApiErrorResponse => ({
  success: false,
  message,
  error,
})
