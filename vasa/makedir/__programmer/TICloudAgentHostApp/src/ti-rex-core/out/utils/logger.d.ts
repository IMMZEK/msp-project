import * as DinfraTypes from 'dinfra';
export declare let logger: DinfraTypes.Logger;
type tirexLoggerNames = 'tirex4' | 'tirexDbImporter' | 'tirexDbRefreshScript';
export type LoggerFactory = Pick<typeof DinfraTypes, 'logger'>;
/**
 * Create a logger
 */
export declare function createLogger(dinfra: LoggerFactory, name: tirexLoggerNames): DinfraTypes.Logger;
/**
 * Set the global default logger with name 'tirex'
 *
 * To use simply do
 *   import { logger } from '../utils/logger';
 *   logger.info('a log message');
 *
 */
export declare function createDefaultLogger(dinfra: LoggerFactory): DinfraTypes.Logger;
export {};
