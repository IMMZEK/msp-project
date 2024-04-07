/**
 * TIREX Server
 */
import DinfraTypes = require('dinfra');
import logging = require('./utils/logging');
import { AppConfig } from './lib/appConfig';
interface RexType {
    log: logging.Log;
    loggerManager: logging.LoggerManager;
}
/**
 * Setup tirex
 *
 * @param {Object} args
 *  @param {Object} args.config
 *  @param {Object} args.dinfra
 *  @param {Object} args.dconfig
 * @param callback(err, rex)
 */
export interface SetupTirexArgs {
    config: AppConfig;
    dconfig: DinfraTypes.DConfig;
    dinfraPath: string;
}
export declare function setupTirex({ config: configPassedIn, dconfig, dinfraPath }: SetupTirexArgs, callback: (err?: string | Error | null, rex?: RexType | null) => void): void;
export {};
