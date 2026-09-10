export interface ApiResult<T> {
  isSuccess: boolean;
  message: string;
  data: T;
  errors: string[] | null;
}

export interface PagedData<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errors: string[];
  readonly isUnauthorized: boolean;
  readonly isForbidden: boolean;
  readonly isConflict: boolean;

  constructor(message: string, status: number, errors: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.isUnauthorized = status === 401;
    this.isForbidden = status === 403;
    this.isConflict = status === 409;
  }
}
