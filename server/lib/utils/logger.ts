// server/lib/utils/logger.ts

/**
 * Simple logging utility for server
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export class Logger {
  private static logLevel: LogLevel = LogLevel.INFO;

  static setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  static debug(message: string, meta?: any) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(`🔍 [DEBUG] ${message}`, meta || '');
    }
  }

  static info(message: string, meta?: any) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(`ℹ️  [INFO] ${message}`, meta || '');
    }
  }

  static warn(message: string, meta?: any) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`⚠️  [WARN] ${message}`, meta || '');
    }
  }

  static error(message: string, error?: any) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`❌ [ERROR] ${message}`, error || '');
    }
  }

  static success(message: string, meta?: any) {
    console.log(`✅ [SUCCESS] ${message}`, meta || '');
  }

  private static shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.logLevel);
    const targetIndex = levels.indexOf(level);
    return targetIndex >= currentIndex;
  }

  static time(label: string) {
    console.time(`⏱️  ${label}`);
  }

  static timeEnd(label: string) {
    console.timeEnd(`⏱️  ${label}`);
  }
}
