// Copyright (C) 2016-2017 Texas Instruments Incorporated - http://www.ti.com/
const Q = require('q'); // promise library
const util = require('util');
const stream = require('stream');
const fs = require('fs');
const node_path = require('path');
const denum = require('./denum');
const djson = require('./djson');
const dschema = require('./dschema');
const TRACE = null; // console.log; // set to console.log to get TRACE

/**
 * Provide with the SQL query (or string), and a list of related errors.
 */
util.inherits(FileQueryError, dschema.ConnectionError);

function FileQueryError(query, errors) {
    dschema.ConnectionError.call(this,
        FileQueryError.prototype.formatQueryStatic(query));

    if (errors == null) {
        errors = [];
    }
    else if (errors instanceof Array) {
        // good
    }
    else {
        errors = [errors];
    }

    this.errors = errors;
}

/**
 * Just a bit of processing to ensure the logged SQL isn't huge,
 * and to provide some context.
 */
FileQueryError.prototype.formatQueryStatic = function (query) {
    var message;

    if (query == null) {
        message = "";
    }
    else if (typeof(query) == "string") {
        message = query;
    }
    else if (query.expr == null) {
        message = "" + query;
    }
    else {
        message = query.expr.toString();

        if (message.length > 1024) { // keep it smaller than a page
            message = message.substring(0, 1020) + " ..."; // 1024 chars
        }

        message = "error in: " + message;
    }

    return (message);
}

/**
 * FileDatabaseEngine uses the regular filesystem for resource layer
 * content storage, and a non-transactional, single-accessor model
 * for data storage.  There are various implementations of the latter.
 */
util.inherits(FileDatabaseEngine, dschema.DatabaseEngine);

function FileDatabaseEngine(opts, logger) {
    dschema.DatabaseEngine.call(this, opts, logger);

    // these two dirs must have been created on install
    // and must be readable/writable/traversable
    fs.statSync(this.opts.path);
    fs.statSync(this.opts.path + "/content");

    /**
     * A map of paths to collections, or arrays of waiting callbacks
     * if a collection is pending open.
     */
    this.collections = {};
    /**
     * Since this is non-transactional, we sometimes need to coordinate
     * changes between callers.  This lock is a queue of functions waiting
     * to start.  The kind and duration of wait depends on the underlying
     * engine - some will batch inserts and changes, some will not; some write
     * entire files, some just modify parts of files.
     */
    this.queue = new denum.LockQueue(logger.warning.bind(logger));
}

FileDatabaseEngine.prototype.newConnectionGroup = function (access,
        overrides) {
    throw new denum.UnsupportedError();
}

FileDatabaseEngine.prototype.accessCollection =
        function (name, path, callback) {
    if (name == null) {
        throw new RangeError("collection name cannot be null");
    }

    if (path == null) {
        throw new RangeError("collection path cannot be null");
    }

    if (!(callback instanceof Function)) {
        throw new RangeError("callback must be a function");
    }

    var collection = this.collections[path];

    if (collection == null) {
        var array = [callback]; // array of callbacks

        this.collections[path] = array;

        this.openCollection(name, path,
            function (error, collection) {
                if (this.collections[path] != array) {
                    throw new denum.StateError("in memory DB bad state");
                }

                if (error != null) {
                    collection = null;
                }

                this.collections[path] = collection; // overwrite array

                array.forEach(function (callback) {
                        callback(error, collection);
                    });
            }.bind(this));
    }
    else if (collection instanceof FileCollection) {
        callback(null, collection); // send back in frame
    }
    else {
        collection.push(callback); // record callback's interest
    }
}

FileDatabaseEngine.prototype.flush = function (callback) {
    this.queue.lock(function (unlock) {
            var queue = new denum.RunQueue(function (error) {
                    unlock();

                    callback(error);
                });

            for (var path in this.collections) {
                var collection = this.collections[path];

                if (collection instanceof FileCollection) {
                    queue.submit(collection.flush.bind(collection));
                }
            }

            queue.submit(); // in case no submit calls were made above
        }.bind(this));
}

exports.FileDatabaseEngine = FileDatabaseEngine;

function FileCollection(engine, name, path) {
    this.engine = engine;
    this.name = name;
    this.path = path;
}

/**
 * Open the collection (called by an accessor).
 */
FileCollection.prototype.open = function (callback) {
    throw new denum.UnsupportedError();
}

/**
 * Insert a record into the collection.
 */
FileCollection.prototype.insert = function (record, callback) {
    throw new denum.UnsupportedError();
}

/**
 * Fetch a record from the collection (by id).  Alternatively,
 * if id is a list, fetch a list of records by id.  In the
 * simple id case, callback(error, value) is returned, and value
 * will be null if the record is missing.  In the list, case,
 * callback(error, array) is returned, where array contains
 * corresonding values for each id in the original list: missing
 * records will be null.
 */
FileCollection.prototype.fetch = function (id, callback) {
    throw new denum.UnsupportedError();
}

/**
 * Update a record in the collection (by id).
 */
FileCollection.prototype.update = function (id, update, callback) {
    throw new denum.UnsupportedError();
}

/**
 * Close the collection (called by an accessor, can be called multiply).
 */
FileCollection.prototype.close = function (callback) {
    throw new denum.UnsupportedError();
}

/**
 * Flush any changes to the collection.
 */
FileCollection.prototype.flush = function (callback) {
    throw new denum.UnsupportedError();
}

FileCollection.prototype.toString = function () {
    return (this.name);
}

exports.FileCollection = FileCollection;

util.inherits(FileConnectionGroup, dschema.ConnectionGroup);

function FileConnectionGroup(databaseEngine, access, defaults) {
    dschema.ConnectionGroup.call(this, databaseEngine, access, defaults);
}

FileConnectionGroup.prototype.accessCollection = function (name, callback) {
    this.databaseEngine.accessCollection(name,
        this.defaults.path + "/" + name, callback);
}

exports.FileConnectionGroup = FileConnectionGroup;

function FileConnectionGroup(databaseEngine, access, defaults) {
    dschema.ConnectionGroup.call(this, databaseEngine, access, defaults);
}

FileConnectionGroup.prototype.queryErrors = function (errors, query) {
    // no deadlocks to account for in this provider
    var result;

    if (errors == null) {
        result = null;
    }
    else if (errors instanceof Array) {
        if (errors.length == 0) {
            result = null;
        }
        else {
            result = new FileQueryError(query, errors);
        }
    }
    else {
        result = new FileQueryError(query, errors);
    }

    return (result);
}

FileConnectionGroup.prototype.addCandidate = function (name, overrides) {
    // NOP
}

FileConnectionGroup.prototype.openConnection = function (callback) {
    throw new denum.UnsupportedError();
}

FileConnectionGroup.prototype.openTransaction = function (callback) {
    throw new denum.UnsupportedError();
}

FileConnectionGroup.prototype.maintainSchema = function (conn, tablePrefix,
        schema, upgrade, callback) {
    // do nothing
    setImmediate(callback);
}

FileConnectionGroup.prototype.destroySchema = function (conn, tablePrefix,
        callback) {
    throw new denum.UnsupportedError();
}

FileConnectionGroup.prototype.getJSONSchema = function () {
    throw new denum.UnsupportedError();
}

FileConnectionGroup.prototype.reapLastInsert = function (conn, callback) {
    throw new denum.UnsupportedError();
}

FileConnectionGroup.prototype.newQueryJSONProtected =
        function (mainTablePrefix, mainSuffix, mainKeyField, jsonProperty,
        jsonTableInfix) {
    return (new FileQueryJSON(this, mainTablePrefix, mainSuffix,
        mainKeyField, jsonProperty, jsonTableInfix));
}

/**
 * A FileConnection is similar to a database connection in concept:
 * it is in essence a connection to a JSON style DB, so it is a little
 * bit of a misnomer.  Implementations are expected to override FileConnection
 * to provide query features.  The methods are however, completely different
 * at this point in time.
 * @todo urgent reconsider - may be no need to override here if
 * we abstract query in this module instead.
 */
function FileConnection(connGroup, transacting) {
    this.connGroup = connGroup;
    this.transacting = transacting;
}

FileConnection.prototype.accessCollectionProtected = function (name,
        callback) {
    this.connGroup.accessCollection(name, callback);
}

FileConnection.prototype.insert = function (collectionName,
        record, callback) {
    this.accessCollectionProtected(collectionName,
        function (error, collection) {
            if (error != null) {
                callback(error);
            }
            else {
                collection.insert(record, callback);
            }
        });
}

FileConnection.prototype.delete = function (collectionName, ids,
        callback) {
    this.accessCollectionProtected(collectionName,
        function (error, collection) {
            if (error != null) {
                callback(error);
            }
            else {
                collection.delete(ids, callback);
            }
        });
}

FileConnection.prototype.fetch = function (collectionName, id,
        callback) {
    this.accessCollectionProtected(collectionName,
        function (error, collection) {
            if (error != null) {
                callback(error);
            }
            else {
                collection.fetch(id, callback);
            }
        });
}

FileConnection.prototype.update = function (collectionName, id,
        record, callback) {
    this.accessCollectionProtected(collectionName,
        function (error, collection) {
            if (error != null) {
                callback(error);
            }
            else {
                collection.update(id, record, callback);
            }
        });
}

FileConnection.prototype.cancel = function () {
    this.cancelled = true; // possible to wind back?
}

FileConnection.prototype.close = function (callback) {
    this.connGroup = null; // invalidate the connGroup, should disable it

    var queue = new denum.RunQueue(callback);

    for (var name in this.collections) {
        var collection = this.collections[name];

        queue.submit(collection.flush.bind(collection));
    }

    queue.submit(); // make sure callback is called, even if queue is empty
}

exports.FileConnection = FileConnection;

