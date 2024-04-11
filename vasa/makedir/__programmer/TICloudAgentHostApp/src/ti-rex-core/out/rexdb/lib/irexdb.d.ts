/// <reference types="node" />
import { CallbackFn as CallbackFunctionTemplate } from '../../utils/callbacks';
import { MinimalDBObject } from '../../lib/dbBuilder/dbTypes';
type CallbackFn<T> = CallbackFunctionTemplate<string, T>;
export interface InQueryValue {
    $in: (number | string | null)[] | undefined;
}
export type QueryValue = string | number | boolean | InQueryValue | RegExp | null;
export type SimpleQuery<T> = {
    [key in keyof T]?: QueryValue;
};
export interface TextSearchQuery {
    $text: {
        $search: string;
    };
}
export interface AndQuery<T> {
    $and: (SimpleQuery<T> | TextSearchQuery)[];
}
export interface IdQuery {
    _id: string;
}
export type Query<T> = SimpleQuery<T> | AndQuery<T> | TextSearchQuery | IdQuery;
/**
 * Constructor
 * @param {String} file name - if null then this is new a in-memory database
 * @constructor
 */
export declare abstract class IRexDB<T extends MinimalDBObject> {
    /**
     * Save the database to the file
     * @param {Function} callback(err)
     */
    abstract save(callback: (err?: NodeJS.ErrnoException) => void): void;
    saveAsync: () => Promise<unknown>;
    /**
     * Insert single document or array of document
     *
     *  * _id field is optional; if present it will be indexed
     *
     * @param {Array} newDocs
     * @param {Function} callback
     */
    abstract insert(newDocs: T | T[], callback: CallbackFn<(T | null)[]>): void;
    insertAsync: (arg1: T | T[]) => Promise<(T | null)[]>;
    /**
     * Update a single document
     * @param {Object} query: only '_id' is supported
     * @param {Object} update: the updated record to put (the whole record is replaced with the
     * updated record)
     * @param {Function} callback(err)
     */
    abstract update(query: IdQuery, update: T, callback: (err: {
        message: string;
        notexist?: true;
    } | string | null) => void): void;
    updateAsync: (arg1: IdQuery, arg2: T) => Promise<unknown>;
    /**
     * Update or insert a single document
     * @param {Object} query: only '_id' is supported
     * @param {Object} update: the updated record to put (the whole record is replaced with the
     * updated record or a new one is created if none is found)
     * @param {Function} callback(err)
     */
    abstract upsert(query: IdQuery, update: T, callback: (err: {
        message: string;
    } | string | null, documents?: (T | null)[]) => void): void;
    upsertAsync: (arg1: IdQuery, arg2: T) => Promise<(T | null)[]>;
    /**
     * Always removes documents matching the query
     * @param {Object} query: {} - remove all
     * @param {Function} callback
     * @api public
     */
    abstract remove(query: Query<T>, callback: (err?: any) => void): void;
    removeAsync: (arg1: Query<T>) => Promise<unknown>;
    /**
     *
     * @param {Object} query
     * @param {Function} callback(err, Array:results)
     * @api public
     */
    abstract find(query: Query<T>, callback: CallbackFn<T[]>): void;
    private _findAsync;
    findAsync(query: Query<T>): Promise<T[]>;
    /**
     * Faster and less memory intensive find() avoiding the deep copy
     * The results cannot be modified, if attempted a freeze exception is thrown
     *
     * @param {Object} query
     * @param {Function} callback(err, Array:results)
     * @api public
     */
    abstract findNoDeepCopy(query: Query<T>, callback: CallbackFn<ReadonlyArray<T>>): void;
    findNoDeepCopyAsync: (arg1: Query<T>) => Promise<readonly T[]>;
    /**
     *
     * @param {Object} query
     * @param {Function} callback(err, Object:result)
     * @api public
     */
    abstract findOne(query: Query<T>, callback: CallbackFn<T | null>): void;
    findOneAsync: (arg1: Query<T>) => Promise<T | null>;
}
export {};
