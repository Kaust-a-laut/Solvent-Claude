export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  PROVIDER_FAILURE = 'PROVIDER_FAILURE',
  TIMEOUT = 'TIMEOUT_ERROR',
  INTERNAL = 'INTERNAL_ERROR'
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly status: number;
  public readonly isRetryable: boolean;

  constructor(message: string, type: ErrorType = ErrorType.INTERNAL, status: number = 500, isRetryable: boolean = false) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.status = status;
    this.isRetryable = isRetryable;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static network(message: string = 'Network connectivity issue') {
    return new AppError(message, ErrorType.NETWORK, 503, true);
  }

  static provider(message: string, isRetryable: boolean = true) {
    return new AppError(message, ErrorType.PROVIDER_FAILURE, 502, isRetryable);
  }

  static validation(message: string) {
    return new AppError(message, ErrorType.VALIDATION, 400, false);
  }
}
