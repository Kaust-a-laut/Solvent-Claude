enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

class LoggerService {
  private scrub(data: any): any {
    if (typeof data === 'string') {
      // Mask typical API key patterns (e.g., sk-..., gsk-..., etc.)
      return data.replace(/(sk-|gsk-|ai_)[a-zA-Z0-9]{20,}/g, '***REDACTED***');
    }
    if (typeof data === 'object' && data !== null) {
      const scrubbed = { ...data };
      for (const key in scrubbed) {
        if (/key|secret|token|password|auth/i.test(key)) {
          scrubbed[key] = '***REDACTED***';
        } else if (typeof scrubbed[key] === 'object') {
          scrubbed[key] = this.scrub(scrubbed[key]);
        }
      }
      return scrubbed;
    }
    return data;
  }

  private formatMessage(level: LogLevel, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const scrubbedMessage = this.scrub(message);
    const scrubbedContext = context ? this.scrub(context) : null;
    const ctxString = scrubbedContext ? ` | Context: ${JSON.stringify(scrubbedContext)}` : '';
    return `[${timestamp}] [${level}] ${scrubbedMessage}${ctxString}`;
  }

  info(message: string, context?: any) {
    console.log(this.formatMessage(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: any) {
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, context?: any) {
    console.error(this.formatMessage(LogLevel.ERROR, message, context));
  }

  debug(message: string, context?: any) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }
}

export const logger = new LoggerService();
