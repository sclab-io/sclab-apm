import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';
import dotenv from 'dotenv';
dotenv.config();

// logs dir
const logDir: string = join(__dirname, process.env.LOG_DIR || '../../logs');

if (!existsSync(logDir)) {
  mkdirSync(logDir);
}

// Define log format
const logFormat = winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`);

/*
 * Log Level
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */
const logLevel = process.env.LOG_FORMAT || 'debug';
const transports = [
  // error log setting
  new winstonDaily({
    level: 'error',
    datePattern: 'YYYY-MM-DD',
    dirname: logDir + '/error', // log file /logs/error/*.log in save
    filename: `%DATE%.log`,
    maxFiles: 30, // 30 Days saved
    handleExceptions: true,
    json: false,
    zippedArchive: true,
  }),
];

if (logLevel !== 'no') {
  // debug log setting
  transports.push(
    new winstonDaily({
      level: logLevel,
      datePattern: 'YYYY-MM-DD',
      dirname: logDir + '/' + logLevel, // log file /logs/debug/*.log in save
      filename: `%DATE%.log`,
      maxFiles: 30, // 30 Days saved
      json: false,
      zippedArchive: true,
    }),
  );
}

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    logFormat,
  ),
  transports,
});

if (logLevel !== 'no') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.splat(), winston.format.colorize()),
    }),
  );
}

const stream = {
  write: (message: string) => {
    logger.info(message.substring(0, message.lastIndexOf('\n')));
  },
};

export { logger, stream };
