"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RexDB = void 0;
// tslint:disable:prefer-for-of
// Disabling for whole file as it's used everywhere right now.
const fs = require("fs-extra");
const path = require("path");
const lruCache = require("lru-cache");
const jsonStableStringify = require("json-stable-stringify");
const async = require("async");
const callbacks_1 = require("../../utils/callbacks");
const irexdb_1 = require("./irexdb");
function isAndQuery(query) {
    return '$and' in query;
}
function isTextSearchQuery(query) {
    return '$text' in query;
}
function isIdQuery(query) {
    return '_id' in query;
}
function isInQueryValue(queryValue) {
    return queryValue != null && typeof queryValue === 'object' && queryValue.$in != null;
}
function isArray(x) {
    return Array.isArray(x);
}
/**
 * Constructor
 * @param {String} file name - if null then this is new a in-memory database
 * @constructor
 */
class RexDB extends irexdb_1.IRexDB {
    logger;
    useCache = false; // CACHING IS TURNED OFF
    file;
    dbName;
    documents = [];
    indices = { _id: {} };
    // caches the references, not the documents themselves
    cache = lruCache({
        // 2 MB / 8 bytes = ~ 260k documents (memory requirement is assuming the size of an
        // object ref is 64 bits...)
        max: (2 * 1024 * 1024) / 8,
        length: n => {
            if (n && n.length) {
                return n.length;
            }
            else {
                return 1;
            }
        },
        dispose: key => {
            this.logger.info('rexdb ' + this.dbName + ' cache disposing:' + key);
        }
    });
    constructor(logger, file) {
        super();
        this.logger = logger;
        // fields
        this.file = file;
        if (file) {
            if (fs.existsSync(file)) {
                this.dbName = path.basename(file);
                let data = fs.readFileSync(file, 'utf8');
                this.documents = JSON.parse(data);
                data = fs.readFileSync(file + '.index', 'utf8');
                this.indices = JSON.parse(data);
            }
            else {
                fs.ensureDirSync(path.dirname(file));
            }
        }
        else {
            this.dbName = 'in-memory';
        }
    }
    /**
     * Get the number of records in this DB
     */
    getEntries() {
        return this.documents.length;
    }
    /**
     * Save the database to the file
     * @param {Function} callback(err)
     */
    save(callback) {
        if (this.file == null) {
            throw new Error('Cannot save. Database is in-memory only');
        }
        // avoid creating one huge string here that may result in memory allocation failure
        // instead write record by record and, this is important, allow to drain before writing
        // more data
        const ws = fs.createWriteStream(this.file).on('open', () => {
            ws.write('[\n');
            async.forEachOfSeries(this.documents, (document, index, callback2) => {
                const indexAsNumber = typeof index === 'string' ? parseInt(index, 10) : index;
                setImmediate(() => {
                    const isDrained = ws.write(jsonStableStringify(document, { space: 2 }));
                    if (indexAsNumber < (this.documents.length - 1)) {
                        ws.write(',');
                    }
                    if (isDrained === true) {
                        callback2();
                    }
                    else {
                        ws.once('drain', callback2);
                    }
                });
            }, () => {
                ws.end('\n]', () => {
                    fs.writeFile(this.file + '.index', JSON.stringify(this.indices), { encoding: 'utf8' }, callback);
                });
            });
        });
    }
    /**
     * Insert single document or array of document
     *
     *  * _id field is optional; if present it will be indexed
     *
     * @param {Array} newDocs
     * @param {Function} callback
     */
    insert(newDocs, callback) {
        // simulate async
        setImmediate(() => {
            this.insertSync(newDocs);
            callback(null, this.documents);
        });
    }
    /**
     * Update a single document
     * @param {Object} query: only '_id' is supported
     * @param {Object} update: the updated record to put (the whole record is replaced with the
     * updated record)
     * @param {Function} callback(err)
     */
    update(query, update, callback) {
        // simulate async
        setImmediate(() => {
            let i;
            if (query._id == null) {
                callback({ message: '_id field required' });
                // tslint:disable-next-line:no-conditional-assignment
            }
            else if ((i = this.indices._id[query._id]) == null) {
                callback({ message: '_id ' + query._id + ' does not exist', notexist: true });
            }
            else {
                update._id = query._id; // make sure they stay in sync...
                this.documents[i] = update;
                this.cache.reset();
                callback(null);
            }
        });
    }
    /**
     * Update or insert a single document
     * @param {Object} query: only '_id' is supported
     * @param {Object} update: the updated record to put (the whole record is replaced with the
     * updated record or a new one is created if none is found)
     * @param {Function} callback(err)
     */
    upsert(query, update, callback) {
        // simulate async
        setImmediate(() => {
            let i;
            if (query._id == null) {
                callback({ message: '_id field required' });
                // tslint:disable-next-line:no-conditional-assignment
            }
            else if ((i = this.indices._id[query._id]) == null) {
                this.insertSync(update);
                callback(null, this.documents);
            }
            else {
                update._id = query._id; // make sure they stay in sync...
                this.documents[i] = update;
                this.cache.reset();
                callback(null);
            }
        });
    }
    /**
     * Insert single document or array of document (synchronous)
     *
     * _id field is optional; if present it will be indexed
     *
     * @param {Array} newDocs
     */
    insertSync(newDocs) {
        if (Array.isArray(newDocs)) {
            for (let i = 0; i < newDocs.length; i++) {
                if (newDocs[i]._id != null) {
                    if (this.indices._id[newDocs[i]._id] != null) {
                        this.logger.warning(`rexdb insert: _id ${newDocs[i]._id} (${newDocs[i].name}) already exists in DB ${this.dbName}. Skipping.`);
                        continue;
                    }
                    this.indices._id[newDocs[i]._id] = this.documents.length;
                }
                this.documents.push(newDocs[i]);
            }
        }
        else {
            if (newDocs._id != null) {
                if (this.indices._id[newDocs._id] != null) {
                    this.logger.warning(`rexdb insert: _id ${newDocs._id} (${newDocs.name}) already exists in DB ${this.dbName}. Skipping.`);
                    return;
                }
                this.indices._id[newDocs._id] = this.documents.length;
            }
            this.documents.push(newDocs);
        }
        this.cache.reset();
    }
    /**
     * Always removes documents matching the query
     * @param {Object} query: {} - remove all
     * @param {Function} callback
     * @api public
     */
    remove(query, callback) {
        // simulate async
        setImmediate(() => {
            if (Object.keys(query).length === 0) {
                // i.e. query is {}
                this.documents.length = 0;
                this.indices = { _id: {} };
                this.cache.reset();
                callback(null);
            }
            else {
                this._find(query, false, true, () => {
                    this.cache.reset();
                    callback(null);
                });
            }
        });
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
     * @param {Function} callback(err, Object:result)
     * @api public
     */
    findOne(query, callback) {
        this._findInCache(query, true, (err, results) => {
            if ((0, callbacks_1.isError)(err, results)) {
                return callback(err);
            }
            if (results.length === 0) {
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
     * @api private - currently public to allow RexDBSplit to call it
     */
    _findInCache(query, findOne, callback) {
        // simulate async
        let result;
        const queryString = jsonStableStringify(query);
        if (this.cache.has(queryString)) {
            // this.logger.info('DEBUG: rexdb ' + this.dbName + ' cache hit: ' + queryString);
            result = this.cache.get(queryString);
            setImmediate(callback, null, result);
        }
        else {
            // this.logger.info('DEBUG: rexdb ' + this.dbName + ' cache miss: ' + queryString);
            this._find(query, findOne, false, (err, results) => {
                if (this.useCache && (0, callbacks_1.isOk)(err, results)) {
                    this.cache.set(queryString, results);
                }
                callback(err, results);
            });
        }
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
    /**
     *
     * @param {Object} query: filter values can be a RegExp
     * @param {Boolean} findOne
     * @param {Boolean} del: true - all matching records will be set to null
     * @param {Function} callback(err:String, result:Array)
     * @api private
     */
    _find(query, findOne, del, callback) {
        let andFilter = [];
        const result = [];
        if (this.documents.length === 0) {
            return setImmediate(callback, null, []);
        }
        if (isAndQuery(query)) {
            andFilter = query.$and;
        }
        else {
            // if query in simple format, build the andFilter array
            for (const property in query) {
                if (query.hasOwnProperty(property)) {
                    const filter = {};
                    filter[property] = query[property];
                    andFilter.push(filter);
                }
            }
        }
        // empty query: return all docs
        if (andFilter.length === 0) {
            for (let dd = 0; dd < this.documents.length; dd++) {
                if (this.documents[dd] != null) {
                    result.push(this.documents[dd]);
                }
            }
            return setImmediate(callback, null, result);
        }
        // optimization if query has ONLY _id specified: use the index
        const firstFilter = andFilter[0];
        if (isIdQuery(firstFilter) && andFilter.length === 1) {
            const di = this.indices._id[firstFilter._id];
            if (di != null) {
                result.push(this.documents[di]);
                if (del === true) {
                    // in theory, indices never points to a null entry
                    delete this.indices._id[this.documents[di]._id];
                    this.documents[di] = null; // must keep array structure as is
                }
            }
            return setImmediate(callback, null, result);
        }
        // Update the type of the and filter to include $searchStrings under $text types
        // The next step will update those values
        const processedAndFilter = andFilter;
        // tokenize $text.$search string
        // for more on mongodb $text search:
        // http://docs.mongodb.org/manual/reference/operator/query/text/#op._S_text
        for (let ff = 0; ff < processedAndFilter.length; ff++) {
            const filterEntry = processedAndFilter[ff];
            if (isTextSearchQuery(filterEntry)) {
                const $searchStrings = filterEntry.$text.$search.split(/\s*[ ,;|/]+\s*/);
                for (let ss = 0; ss < $searchStrings.length; ss++) {
                    $searchStrings[ss] = $searchStrings[ss].toLowerCase().trim();
                }
                filterEntry.$text.$searchStrings = $searchStrings;
            }
        }
        // break up find loop into multiple async pages to not block other requests
        const PAGE_SIZE = 10000;
        let allResults = [];
        let startDoc = 0;
        let pageLength;
        async.doWhilst(callback2 => {
            pageLength = Math.min(PAGE_SIZE, this.documents.length - startDoc);
            const pageResults = this._findLoop(processedAndFilter, startDoc, pageLength, findOne, del);
            allResults = allResults.concat(pageResults);
            setImmediate(callback2, null, allResults);
        }, () => {
            if (findOne && allResults.length > 0) {
                return false;
            }
            if (startDoc + pageLength >= this.documents.length) {
                return false;
            }
            startDoc += PAGE_SIZE;
            return true;
        }, err => {
            setImmediate(callback, err, allResults);
        });
        return;
    }
    /**
     *
     * @param andFilter
     * @param startDoc
     * @param pageLength
     * @param del
     * @returns {Array} results
     * @private
     */
    _findLoop(andFilter, startDoc, pageLength, findOne, del) {
        const results = [];
        let matched = false;
        for (let d = startDoc; d < startDoc + pageLength; d++) {
            const document = this.documents[d];
            if (document == null) {
                continue;
            }
            for (let f = 0; f < andFilter.length; f++) {
                const andFilterEntry = andFilter[f];
                if (isTextSearchQuery(andFilterEntry)) {
                    // handle $text search
                    let $searchMatch = false;
                    for (const field in document) {
                        if (document.hasOwnProperty(field) && document[field] != null) {
                            // Everything supports toString, so I don't know why the below
                            // cast is necessary, but it is.
                            const docString = document[field].toString().toLowerCase();
                            for (let s = 0; s < andFilterEntry.$text.$searchStrings.length; s++) {
                                const searchString = andFilterEntry.$text.$searchStrings[s];
                                if (docString.indexOf(searchString) !== -1) {
                                    $searchMatch = true;
                                    break;
                                }
                            }
                            if ($searchMatch === true) {
                                break;
                            }
                        }
                    }
                    matched = $searchMatch;
                }
                else {
                    // handle all other searches
                    const key = Object.keys(andFilterEntry)[0];
                    // to match mongodb behaviour:
                    // http://docs.mongodb.org/manual/faq/developers/#faq-developers-query-for-nulls
                    const valueDoc = key in document ? document[key] : null;
                    const valueFilter = andFilterEntry[key];
                    if (isInQueryValue(valueFilter) && valueFilter.$in != null) {
                        // handle $in
                        const $inList = valueFilter.$in;
                        let $inListMatch = false;
                        for (let i = 0; i < $inList.length; i++) {
                            $inListMatch = this._match(valueDoc, $inList[i]);
                            if ($inListMatch === true) {
                                break;
                            }
                        }
                        matched = $inListMatch;
                    }
                    else if (typeof valueFilter !== 'undefined') {
                        // handle regular field/value
                        matched = this._match(valueDoc, valueFilter);
                    }
                    // if undefined treat as DON'T CARE
                }
                if (matched === false) {
                    break;
                }
            }
            if (matched === true) {
                if (del === true) {
                    if (document._id != null) {
                        delete this.indices._id[document._id];
                    }
                    this.documents[d] = null; // must keep array structure as is
                }
                else {
                    results.push(document);
                    if (findOne === true) {
                        break;
                    }
                }
            }
        }
        return results;
    }
    /**
     *
     * @api private
     */
    _match(valueDoc, valueFilter) {
        if (!isArray(valueDoc)) {
            if (valueFilter instanceof RegExp && typeof valueDoc === 'string') {
                return valueFilter.test(valueDoc);
            }
            else {
                return valueDoc === valueFilter;
            }
        }
        else {
            for (let i = 0; i < valueDoc.length; i++) {
                if (this._match(valueDoc[i], valueFilter) === true) {
                    return true;
                }
            }
        }
        return false;
    }
}
exports.RexDB = RexDB;
