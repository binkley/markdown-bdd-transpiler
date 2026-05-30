export enum LogLevel {
  ERROR = 0, // ERROR
  WARN = 1, // ERROR, WARN
  INFO = 2, // ERROR, WARN, INFO
  DEBUG = 3 // ERROR, WARN, INFO, DEBUG
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel) {
    this.level = level;
  }

  error(message: string, ...optionalParams: any[]) {
    if (this.level >= LogLevel.ERROR) {
      console.error(message, ...optionalParams);
    }
  }

  warn(message: string, ...optionalParams: any[]) {
    if (this.level >= LogLevel.WARN) {
      console.warn(message, ...optionalParams);
    }
  }

  info(message: string, ...optionalParams: any[]) {
    if (this.level >= LogLevel.INFO) {
      console.log(message, ...optionalParams);
    }
  }

  debug(message: string, ...optionalParams: any[]) {
    if (this.level >= LogLevel.DEBUG) {
      console.log(message, ...optionalParams);
    }
  }
}

export const logger = new Logger();
