/// <reference types="node" />
import DinfraType = require('dinfra');
import { MANAGED_DB_TABLE_PREFIX } from '../vars';
/**
 * Set the last update timestamp to the current time.  This time is written to the database.
 *
 * @param dinfra
 * @param liveTablePrefix
 */
export declare function setLastUpdateInfo(dinfra: typeof DinfraType, liveTablePrefix?: MANAGED_DB_TABLE_PREFIX): Promise<void>;
/**
 * Fetch the time when the database was last updated.  This time is stored within the database to ensure it's the same
 * across all landscapes/running instances
 *
 * @param dinfra
 */
export declare const fetchLastUpdateInfoCb: (arg1: typeof DinfraType, callback: (err: NodeJS.ErrnoException, result: {
    timestamp: number;
    liveTablePrefix: string | null;
}) => void) => void;
export declare function fetchLastUpdateInfo(dinfra: typeof DinfraType): Promise<{
    timestamp: number;
    liveTablePrefix: string | null;
}>;
export declare function _getLastUpdateResourceName(): string;
/**
 * Send an event to indicate that the database was just updated
 * Note: this can only be called after a dinfra session has been registered
 *
 * @param dinfra
 */
export declare function notifyDatabaseUpdated(dinfra: typeof DinfraType): void;
/**
 * Register a handler for when the database is updated
 * Note: this can only be called after a dinfra session has been registered
 *
 * @param dinfra
 * @param handler
 */
export declare function registerDatabaseUpdateHandler(dinfra: typeof DinfraType, handler: () => void): void;
