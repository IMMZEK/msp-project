"use strict";
// tslint:disable:member-ordering
Object.defineProperty(exports, "__esModule", { value: true });
exports.RexDBSplit = void 0;
const fse = require("fs-extra");
const path = require("path");
const async = require("async");
const callbacks_1 = require("../../utils/callbacks");
const irexdb_1 = require("./irexdb");
const rexdb_1 = require("./rexdb");
const callbackifyAny_1 = require("../../utils/callbackifyAny");
const UNLOADED = 'UNLOADED';
const ALL = 'ALL';
class RexDBSplit extends irexdb_1.IRexDB {
    logger;
    dir;
    dbs = {};
    lastPackageUIdsToUse = [];
    hiddenPackageUIdsToUse = []; // Metadata_2.1 : hidden H/W packages
    /**
     * Constructor
     * @param {String} dir to put the individual DB files (abs. path)
     * @constructor
     */
    constructor(logger, dir) {
        super();
        this.logger = logger;
        this.dir = dir;
        fse.ensureDirSync(dir);
    }
    getDir() {
        return this.dir;
    }
    /**
     *
     * @param {Array} packageUIdsToUse
     * @param callback
     */
    using() {
        return this.lastPackageUIdsToUse;
    }
    /**
     * Load specified packages into memory
     */
    use = (0, callbackifyAny_1.callbackifyAny)(this.useAsync);
    async useAsync(packageUIdsToUse) {
        // this.logger.info('DEBUG: DB: use() called with' + JSON.stringify(packageUIdsToUse));
        this.lastPackageUIdsToUse = packageUIdsToUse;
        // unload packages
        await Promise.all(Object.entries(this.dbs).map(async ([key, db]) => {
            if (db != null && db !== UNLOADED) {
                if (packageUIdsToUse.indexOf(key) === -1 &&
                    this.hiddenPackageUIdsToUse.indexOf(key) === -1) {
                    // this.logger.info('DEBUG: DB: Unloading ' + key);
                    await db.removeAsync({});
                    this.dbs[key] = UNLOADED;
                }
            }
        }));
        packageUIdsToUse.push(...this.hiddenPackageUIdsToUse);
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < packageUIdsToUse.length; i++) {
            const packageUId = packageUIdsToUse[i];
            if (this.dbs[packageUId] == null || this.dbs[packageUId] === UNLOADED) {
                const dbFile = path.join(this.dir, packageUId);
                if (fse.existsSync(dbFile) === true) {
                    // this.logger.info('DEBUG: DB: Loading ' + packageUId);
                    this.dbs[packageUId] = new rexdb_1.RexDB(this.logger, dbFile);
                }
            }
        }
        // this.logger.info(
        //     'DEBUG: DB: status ' +
        //         JSON.stringify(this.dbs, (key, value) => {
        //             if (key !== '' && typeof value === 'object') {
        //                 return 'LOADED';
        //             }
        //             return value;
        //         })
        // );
    }
    /**
     * Load all packages into memory
     */
    useAll = (0, callbackifyAny_1.callbackifyAny)(this.useAllAsync);
    async useAllAsync() {
        // this.logger.info('DEBUG: DB: useAll() called');
        this.lastPackageUIdsToUse = [ALL];
        this.dbs = {};
        let files;
        try {
            files = await fse.readdir(this.dir);
        }
        catch (err) {
            this.logger.error('DB: useAll() error: ', err);
            throw err;
        }
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < files.length; i++) {
            if (path.extname(files[i]) !== '.index') {
                const packageUId = files[i];
                const dbFile = path.join(this.dir, packageUId);
                // this.logger.info('DEBUG: DB: Loading ' + packageUId);
                this.dbs[packageUId] = new rexdb_1.RexDB(this.logger, dbFile);
            }
        }
    }
    /**
     *
     * @param {Array} packageUIdsToUse
     */
    useHidden(packageUIdsToUse) {
        if (packageUIdsToUse == null) {
            packageUIdsToUse = [];
        }
        this.hiddenPackageUIdsToUse = packageUIdsToUse;
    }
    /**
     * Save the individual databases currently loaded in memory, then call use() to remove any
     * packages this might have been loaded during a previous insert/update/upsert
     * @param {Function} callback(err)
     */
    save(callback) {
        async.eachOf(this.dbs, (db, _key, callback) => {
            if (db != null && db !== UNLOADED) {
                db.save(callback);
            }
            else {
                callback();
            }
        }, _err => {
            // BUG: why are we ignoring errors here?
            if (this.lastPackageUIdsToUse[0] !== ALL) {
                this.use(this.lastPackageUIdsToUse, callback);
            }
            else {
                setImmediate(callback);
            }
        });
    }
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
    insert(newDocs, callback) {
        if (!Array.isArray(newDocs)) {
            newDocs = [newDocs];
        }
        async.each(newDocs, (doc, callback) => {
            if (doc == null) {
                return callback('RexDBSplit.insert: doc is null/undefined');
            }
            if (doc.packageUId == null) {
                return callback('RexDBSplit.insert: doc.packageUId is null/undefined');
            }
            let db = this.dbs[doc.packageUId];
            if (db == null || db === UNLOADED) {
                // this.logger.info('DEBUG: RexDBSplit: insert(): creating new DB ' + doc.packageUId);
                db = this.dbs[doc.packageUId] = new rexdb_1.RexDB(this.logger, path.join(this.dir, doc.packageUId));
            }
            db.insert(doc, callback);
        }, 
        // @ts-ignore - strict function type error
        callback);
    }
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
    update(query, record, callback) {
        setImmediate(() => {
            if (record == null) {
                return callback('RexDBSplit.update: record is null/undefined');
            }
            if (record.packageUId == null) {
                return callback('RexDBSplit.update: record.packageUId is null/undefined');
            }
            if (this.dbs[record.packageUId] == null) {
                return callback('RexDBSplit.update: ' + record.packageUId + ' doesn`t exist');
            }
            let db = this.dbs[record.packageUId];
            if (db === UNLOADED) {
                // this.logger.info('DEBUG: RexDBSplit: update(): creating new DB ' + record.packageUId);
                db = this.dbs[record.packageUId] = new rexdb_1.RexDB(this.logger, path.join(this.dir, record.packageUId));
            }
            db.update(query, record, callback);
        });
    }
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
    upsert(query, record, callback) {
        setImmediate(() => {
            if (record == null) {
                return callback('RexDBSplit.upsert: record is null/undefined');
            }
            if (record.packageUId == null) {
                return callback('RexDBSplit.upsert: record.packageUId is null/undefined');
            }
            let db = this.dbs[record.packageUId];
            if (db == null || db === UNLOADED) {
                // this.logger.info('DEBUG: RexDBSplit: upsert(): creating new DB ' + record.packageUId);
                db = this.dbs[record.packageUId] = new rexdb_1.RexDB(this.logger, path.join(this.dir, record.packageUId));
            }
            db.upsert(query, record, callback);
        });
    }
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
    remove(genericQuery, callback) {
        const query = genericQuery;
        if (Object.keys(query).length !== 0) {
            // i.e. query is {}
            if ((query.packageId != null && query.packageVersion == null) ||
                (query.packageId == null && query.packageVersion != null) ||
                (query.packageId == null &&
                    query.packageVersion == null &&
                    query.packageUId == null)) {
                // BUG: why are we throwing vs executing callback with err set?
                // BUG: we should also guard against using regexp - ensure just type string
                throw new Error('RexDBSplit: Remove only works with entire packages. Either speciy ' +
                    'packageId/packageVersion or packageUId');
            }
        }
        if (Object.keys(query).length === 0) {
            // i.e. query is {}
            // remove ALL packages
            // remove all loaded packages from memory
            async.eachOf(this.dbs, (db, _key, callback) => {
                if (db != null && db !== UNLOADED) {
                    db.remove({}, callback);
                }
                else {
                    callback();
                }
            }, () => {
                // now remove all DB files
                this.dbs = {};
                fse.emptyDir(this.dir, err => {
                    callback(err);
                });
            });
        }
        else {
            // remove SINGLE package
            let packageUId;
            if (query.packageUId != null) {
                // Cast temporarily needed - we should guard against this above
                packageUId = query.packageUId;
            }
            else {
                packageUId = query.packageId + '__' + query.packageVersion;
            }
            if (this.dbs[packageUId] != null) {
                // remove DB file and index file
                fse.unlink(path.join(this.dir, packageUId), _err => {
                    // BUG: why are we ignoring err here?
                    fse.unlink(path.join(this.dir, packageUId) + '.index', err => {
                        fse.unlink(path.join(this.dir, packageUId) + '.search.index', _err => {
                            fse.unlink(path.join(this.dir, packageUId) + '.filter.index', _err => {
                                // remove from memory if loaded
                                const db = this.dbs[packageUId];
                                if (db !== UNLOADED) {
                                    db.remove({}, () => {
                                        delete this.dbs[packageUId];
                                        callback(err);
                                    });
                                }
                                else {
                                    delete this.dbs[packageUId];
                                    callback(err);
                                }
                            });
                        });
                    });
                });
            }
            else {
                setImmediate(callback);
            }
        }
    }
    /**
     *
     * @param {Object} query
     * @param {Function} callback(err, Array:results)
     * @api public
     */
    find(query, callback) {
        this._findInCache(query, false, (err, results) => {
            callback(err, this.deepCopy(results));
        });
    }
    /**
     * Faster and less memory intensive find() avoiding the deep copy
     * The results cannot be modified, if attempted a freeze exception is thrown
     *
     * @param {Object} query
     * @param {Function} callback(err, Array:results)
     * @api public
     */
    findNoDeepCopy(query, callback) {
        this._findInCache(query, false, (err, results) => {
            callback(err, results == null ? results : Object.freeze(results));
        });
    }
    /**
     *
     * @param {Object} query
     * @param {Function} callback(err, Object: result)
     * @api public
     */
    findOne(query, callback) {
        this._findInCache(query, true, (err, results) => {
            if ((0, callbacks_1.isError)(err, results) || results.length === 0) {
                callback(err, null);
            }
            else {
                callback(err, this.deepCopy(results[0]));
            }
        });
    }
    /**
     *
     * @param {Object} query
     * @param {Boolean} findOne
     * @param {Function} callback(err, Array:results)
     * @api private
     */
    _findInCache(query, findOne, callback) {
        let allResults = [];
        async.eachOf(this.dbs, (db, _key, callback) => {
            if (db != null && db !== UNLOADED) {
                db._findInCache(query, findOne, (err, result) => {
                    if (err == null && result != null && result.length > 0) {
                        allResults = allResults.concat(result);
                        if (findOne === true) {
                            return callback('earlyexit');
                        }
                    }
                    callback(err);
                });
            }
            else {
                setImmediate(callback);
            }
        }, err => {
            if (err === 'earlyexit') {
                err = null;
            }
            setImmediate(callback, err, allResults);
        });
    }
    /**
     * Based on http://stackoverflow.com/questions/122102/
     * what-is-the-most-efficient-way-to-clone-an-object/5344074#5344074
     * Note: it doesn't copy functions, Date and Regex's
     * @param obj
     * @returns {*}
     */
    deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}
exports.RexDBSplit = RexDBSplit;
