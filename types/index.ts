export interface Wrinkle {
  debug(...messages: string[]): void;
  info(...messages: string[]): void;
  warn(...messages: string[]): void;
  error(...messages: string[]): void;
  create(): void;
  destroy(): void;
  end(): void;
}

export interface WrinkleOptions {
  toFile?: boolean;
  extension?: string;
  logDir?: string;
  maxLogFileAge?: string;
  logLevel?: string;
  fileDateTimeFormat?: string;
  logDateTimeFormat?: string;
  maxLogFileSizeBytes?: number | string;
  unsafeMode?: boolean;
}
