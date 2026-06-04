export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface ApiPaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
