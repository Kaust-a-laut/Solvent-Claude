export enum SolventErrorCode {
  AI_PROVIDER_ERROR = "AI_PROVIDER_ERROR",
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  OPERATION_CANCELLED = "OPERATION_CANCELLED",
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTH_ERROR = "AUTH_ERROR",
  INTERNAL_ERROR = "INTERNAL_ERROR"
}

export class SolventError extends Error {
  public readonly code: SolventErrorCode;
  public readonly status: number;
  public readonly retryable: boolean;
  public readonly cause?: unknown;

  constructor(message: string, code: SolventErrorCode, options: { status?: number; retryable?: boolean; cause?: unknown } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = options.status || 500;
    this.retryable = options.retryable || false;
    this.cause = options.cause;
    Object.setPrototypeOf(this, SolventError.prototype);
  }
}

export class AIServiceError extends SolventError {
  constructor(message: string, cause?: unknown, retryable: boolean = true) {
    super(message, SolventErrorCode.AI_PROVIDER_ERROR, { status: 502, retryable, cause });
  }
}

export class ValidationError extends SolventError {
  constructor(message: string) {
    super(message, SolventErrorCode.VALIDATION_ERROR, { status: 400 });
  }
}

export class CancelledError extends SolventError {
  constructor(message: string = 'Operation cancelled by user') {
    super(message, SolventErrorCode.OPERATION_CANCELLED, { status: 499 });
  }
}
