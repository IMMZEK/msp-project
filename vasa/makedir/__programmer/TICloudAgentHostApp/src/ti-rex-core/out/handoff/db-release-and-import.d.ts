import { Log } from '../utils/logging';
import { RefreshRequest } from './util';
/**
 * 1. rediscover CCS products (e.g. xdctools)
 * 2. publish db for tirex 3
 * 3. import db into tirex4 sqldb
 * 4. publish sqldb for tirex4
 *
 * Note: requires a dcontrol landscape which is set up on single machine (on a multi-
 * machine landscape dcontrol can only be used on the 'staging' machine)
 *
 * @param email
 * @param log
 */
export declare function dbImportAndPublish(email: string, refreshRequest: RefreshRequest, dbBasePath: string, log: Log, emailTag: string): Promise<void>;
