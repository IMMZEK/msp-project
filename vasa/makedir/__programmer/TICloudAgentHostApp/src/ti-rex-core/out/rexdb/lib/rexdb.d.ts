/**
 * rexdb - small in-memory database with file system persistence and optional query cache
 * Always returns a deep copy of documents
 *
 * Note: CACHING IS TURNED OFF
 *
 * APIs are similar to MongoDB
 *
 * osohm, 7/21/2014
 */
/// <reference types="node" />
import { CallbackFn as CallbackFunctionTemplate } from '../../utils/callbacks';
import { MinimalDBObject } from '../../lib/dbBuilder/dbTypes';
import { IdQuery, IRexDB, Query } from './irexdb';
import { BaseLogger } from '../../utils/logging';
type CallbackFn<T> = CallbackFunctionTemplate<string, T>;
/**
 * Constructor
 * @param {String} file name - if null then this is new a in-memory database
 * @constructor
 */
export declare class RexDB<T extends MinimalDBObject> extends IRexDB<T> {
    private readonly logger;
    private useCache;
    private file?;
    private dbName;
    private documents;
    private indices;
    private cache;
    constructor(logger: BaseLogger, file?: string);
    /**
     * Get the number of records in this DB
     */
    getEntries(): number;
    /**
     * Save the database to the file
     * @param {Function} callback(err)
     */
    save(callback: (err?: NodeJS.ErrnoException) => void): void;
    /**
     * Insert single document or array of document
     *
     *  * _id field is optional; if present it will be indexed
     *
     * @param {Array} newDocs
     * @param {Function} callback
     */
    insert(newDocs: T | T[], callback: CallbackFn<(T | null)[]>): void;
    /**
     * Update a single document
     * @param {Object} query: only '_id' is supported
     * @param {Object} update: the updated record to put (the whole record is replaced with the
     * updated record)
     * @param {Function} callback(err)
     */
    update(query: IdQuery, update: T, callback: (err: {
        message: string;
        notexist?: true;
    } | null) => void): void;
    /**
     * Update or insert a single document
     * @param {Object} query: only '_id' is supported
     * @param {Object} update: the updated record to put (the whole record is replaced with the
     * updated record or a new one is created if none is found)
     * @param {Function} callback(err)
     */
    upsert(query: IdQuery, update: T, callback: (err: {
        message: string;
    } | null, documents?: (T | null)[]) => void): void;
    /**
     * Insert single document or array of document (synchronous)
     *
     * _id field is optional; if present it will be indexed
     *
     * @param {Array} newDocs
     */
    insertSync(newDocs: T | T[]): void;
    /**
     * Always removes documents matching the query
     * @param {Object} query: {} - remove all
     * @param {Function} callback
     * @api public
     */
    remove(query: Query<T>, callback: (err: null) => void): void;
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
     * @param {Function} callback(err, Object:result)
     * @api public
     */
    findOne(query: Query<T>, callback: CallbackFn<T | null>): void;
    /**
     *
     * @param {Object} query
     * @param {Boolean} findOne
     * @param {Function} callback(err, Array:results)
     * @api private - currently public to allow RexDBSplit to call it
     */
    _findInCache(query: Query<T>, findOne: boolean, callback: CallbackFn<T[]>): void;
    /**
     * Based on http://stackoverflow.com/questions/122102/
     * what-is-the-most-efficient-way-to-clone-an-object/5344074#5344074
     * Note: it doesn't copy functions, Date and Regex's
     * @param obj
     * @returns {*}
     */
    private deepCopy;
    /**
     *
     * @param {Object} query: filter values can be a RegExp
     * @param {Boolean} findOne
     * @param {Boolean} del: true - all matching records will be set to null
     * @param {Function} callback(err:String, result:Array)
     * @api private
     */
    private _find;
    /**
     *
     * @param andFilter
     * @param startDoc
     * @param pageLength
     * @param del
     * @returns {Array} results
     * @private
     */
    private _findLoop;
    /**
     *
     * @api private
     */
    private _match;
}
export {};
