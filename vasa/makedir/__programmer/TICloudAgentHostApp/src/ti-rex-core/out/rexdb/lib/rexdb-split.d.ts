/// <reference types="node" />
import { BaseLogger } from '../../utils/logging';
import { CallbackFn as CallbackFunctionTemplate } from '../../utils/callbacks';
import { DBObject } from '../../lib/dbBuilder/dbTypes';
import { IdQuery, IRexDB, Query } from './irexdb';
type CallbackFn<T> = CallbackFunctionTemplate<string, T>;
export declare class RexDBSplit<T extends DBObject> extends IRexDB<T> {
    private readonly logger;
    private dir;
    private dbs;
    private lastPackageUIdsToUse;
    private hiddenPackageUIdsToUse;
    /**
     * Constructor
     * @param {String} dir to put the individual DB files (abs. path)
     * @constructor
     */
    constructor(logger: BaseLogger, dir: string);
    getDir(): string;
    /**
     *
     * @param {Array} packageUIdsToUse
     * @param callback
     */
    using(): string[];
    /**
     * Load specified packages into memory
     */
    use: (arg1: string[], callback: (err: any) => void) => void;
    useAsync(packageUIdsToUse: string[]): Promise<void>;
    /**
     * Load all packages into memory
     */
    useAll: (callback: (err: any) => void) => void;
    useAllAsync(): Promise<void>;
    /**
     *
     * @param {Array} packageUIdsToUse
     */
    useHidden(packageUIdsToUse?: string[]): void;
    /**
     * Save the individual databases currently loaded in memory, then call use() to remove any
     * packages this might have been loaded during a previous insert/update/upsert
     * @param {Function} callback(err)
     */
    save(callback: (err?: NodeJS.ErrnoException) => void): void;
    /**
     * Insert single document or array of documents.
     *
     * If a package DB is not loaded, it will be loaded.
     * If a package DB doesn't exist, it will be created
     *
     *  * _id field is optional; if present it will be indexed
     *
     * @param {Array} newDocs
     * @param {Function} callback
     */
    insert(newDocs: T | T[], callback: CallbackFn<(T | null)[]>): void;
    /**
     * Update a single document
     *
     * If a package DB is not loaded, it will be loaded.
     * If a package DB doesn't exist, it will fail.
     *
     * @param {Object} query: only '_id' is supported
     * @param {Object} record: the updated record to put (the whole record is replaced with the
     * updated record)
     * @param {Function} callback(err)
     */
    update(query: IdQuery, record: T, callback: (err: {
        message: string;
        notexist?: true;
    } | string | null) => void): void;
    /**
     * Update or insert a single document
     *
     * If a package DB is not loaded, it will be loaded.
     * If a package DB doesn't exist, it will be created.
     *
     * @param {Object} query: only '_id' is supported
     * @param {Object} record: the updated record to put (the whole record is replaced with the
     * updated record or a new one is created if none is found)
     * @param {Function} callback(err)
     */
    upsert(query: IdQuery, record: T, callback: (err: {
        message: string;
    } | string | null, documents?: (T | null)[]) => void): void;
    /**
     * Remove a SINGLE specified package or ALL packages
     * In the query either specify packageId/packageVersion or packageUId; or {} to remove all
     * packages
     *
     * If a package DB is not loaded, it will NOT be loaded.
     *
     * @param {Object} query
     * @param {Function} callback
     * @api public
     */
    remove(genericQuery: Query<T>, callback: (err?: Error | null) => void): void;
    /**
     *
     * @param {Object} query
     * @param {Function} callback(err, Array:results)
     * @api public
     */
    find(query: Query<T>, callback: CallbackFn<T[]>): void;
    /**
     * Faster and less memory intensive find() avoiding the deep copy
     * The results cannot be modified, if attempted a freeze exception is thrown
     *
     * @param {Object} query
     * @param {Function} callback(err, Array:results)
     * @api public
     */
    findNoDeepCopy(query: Query<T>, callback: CallbackFn<ReadonlyArray<T>>): void;
    /**
     *
     * @param {Object} query
     * @param {Function} callback(err, Object: result)
     * @api public
     */
    findOne(query: Query<T>, callback: CallbackFn<T | null>): void;
    /**
     *
     * @param {Object} query
     * @param {Boolean} findOne
     * @param {Function} callback(err, Array:results)
     * @api private
     */
    private _findInCache;
    /**
     * Based on http://stackoverflow.com/questions/122102/
     * what-is-the-most-efficient-way-to-clone-an-object/5344074#5344074
     * Note: it doesn't copy functions, Date and Regex's
     * @param obj
     * @returns {*}
     */
    private deepCopy;
}
export {};
