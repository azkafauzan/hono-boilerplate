import pino, { type Logger, type LoggerOptions } from "pino"

export type AppLogger = Logger

export function createLogger(options: { level?: string; nodeEnv?: string } = {}): AppLogger {
  const isTest = (options.nodeEnv ?? process.env.NODE_ENV) === "test"
  const pinoOptions: LoggerOptions = {
    level: isTest ? "silent" : (options.level ?? "info"),
  }
  return pino(pinoOptions)
}
