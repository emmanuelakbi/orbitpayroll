/**
 * Pino logger configuration for OrbitPayroll API
 */

import pino, { type LoggerOptions } from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const options: LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'orbitpayroll-api',
  },
};

// Add pretty printing in development
if (isDevelopment) {
  options.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(options);

export type Logger = typeof logger;
