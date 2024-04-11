// Copyright (C) 2016-2017 Texas Instruments Incorporated - http://www.ti.com/
const util = require('util');
const stream = require('stream');
const fs = require('fs');
const node_path = require('path');
const denum = require('./denum');
const djson = require('./djson');
const dschema = require('./dschema');
const dschema_file = require('./dschema_file');
const EventEmitter = require('events').EventEmitter;
const TRACE = null; // console.log; // set to console.log to get TRACE

util.inherits(SimpleDatabaseEngine, dschema_file.FileDatabaseEngine);

function SimpleDatabaseEngine(opts, logger) {
    dschema_file.FileDatabaseEngine.call(this, opts, logger);

    this.collections = {};
}

SimpleDatabaseEngine.prototype.newConnectionGroup = function (access,
        overrides) {
    return (new SimpleConnectionGroup(this, access, overrides));
}

SimpleDatabaseEngine.prototype.openCollection = function (name, path,
        callback) {
    new SimpleCollection(this, name, path, callback);
}

SimpleDatabaseEngine.prototype.close = function (callback) {
    this.flush(callback);
}

util.inherits(SimpleCollection, dschema_file.FileCollection);

function SimpleCollection(engine, name, path, callback) {
    dschema_file.FileCollection.call(this, engine, name, path);

    this.changesMade = 0;
    this.changesWritten = 0;
    this.syncTimeoutId = null;
    this.syncTimeout = 200;
    this.records = null;

    djson.loadGZJSONPath(path + ".json.gz", {},
        function (error, json) {
            // ignore - error.code == ENOENT // @todo urgent - log?
            if (error != null) {
                if (error.code == "ENOENT") {
                    // ignore
                }
                else {
                    return (callback(error));
                }
            }

            if (json == null) {
                json = { };
            }

            if (json.records == null) {
                json.records = [];
            }

            this.records = json.records;

            callback(null, this);
        }.bind(this));
}

SimpleCollection.prototype.markChanged = function () {
    this.changesMade++;
}

SimpleCollection.prototype.insert = function (record, callback) {
    if (callback == null) {
        throw new RangeError();
    }

    record.id = this.records.length;

    this.records.push(record);

    this.markChanged();

    setImmediate(callback, null, record);
}

SimpleCollection.prototype.delete = function (ids, callback) {
    if (callback == null) {
        throw new RangeError();
    }

    if (!(ids instanceof Array)) {
        ids = [ids];
    }

    var self = this;

    ids.forEach(function (id) {
            self.records[1 * id] = null;
        });

    this.markChanged();

    setImmediate(callback, null);
}

SimpleCollection.prototype.fetch = function (ids, callback) {
    if (callback == null) {
        throw new RangeError();
    }

    if (!(ids instanceof Array)) {
        setImmediate(callback, null, this.records[ids]);
    }
    else {
        var results = [];

        ids.forEach(function (id) {
                var record = this.records[1 * id];

                results.push(record);
            }.bind(this));

        setImmediate(callback, null, results);
    }
}

SimpleCollection.prototype.update = function (id, update, callback) {
    if (callback == null) {
        throw new RangeError();
    }

    var record = this.records[id];

    if (record != null) {
        for (var a in update) {
            record[a] = update[a];
        }

        this.markChanged();
    }

    setImmediate(callback, null, record);
}

SimpleCollection.prototype.close = function (callback) {
    if (TRACE) {
        TRACE("close", this.path);
    }

    if (callback == null) {
        throw new Error("must provide a callback to this");
    }

    this.flush(callback);
}

/**
 * Assume a single flusher at a time (may be closer).
 */
SimpleCollection.prototype.flush = function (callback) {
    if (callback == null) {
        throw new Error("must provide a callback to this");
    }

    if (this.changesMade == this.changesWritten) {
        callback();
    }
    else {
        var newFileName = this.path + ".new.json.gz";
        var oldFileName = this.path + ".json.gz";
        var runQueue = new denum.RunQueue(callback);

        this.changesWritten = this.changesMade;

        runQueue.submit(djson.saveGZJSONPath.bind(djson,
                newFileName, { records: this.records }, { tree: true }));
        // execute, but ignore the result of the unlink
        runQueue.ignore(fs.unlink.bind(fs, oldFileName));
        runQueue.submit(fs.rename.bind(fs, newFileName, oldFileName));
    }
}

SimpleCollection.prototype.toString = function () {
    return (this.name);
}

exports.SimpleDatabaseEngine = SimpleDatabaseEngine;

util.inherits(SimpleConnectionGroup, dschema_file.FileConnectionGroup);

function SimpleConnectionGroup(databaseEngine, access, defaults) {
    dschema_file.FileConnectionGroup.call(this, databaseEngine,
        access, defaults);
}

SimpleConnectionGroup.prototype.openConnection = function (callback) {
    var self = this;

    if (callback === undefined) { // do not match null
        return (Q.ninvoke(self, "openConnection")); // shortcut to Q
    }

    setImmediate(callback, null, new SimpleConnection(this, false));

    return (undefined);
}

SimpleConnectionGroup.prototype.openTransaction = function (callback) {
    var self = this;

    if (callback === undefined) { // do not match null
        return (Q.ninvoke(self, "openTransaction")); // shortcut to Q
    }

    setImmediate(callback, null, new SimpleConnection(this, true));

    return (undefined);
}

SimpleConnectionGroup.prototype.newQueryJSONProtected =
        function (mainTablePrefix, mainSuffix, mainKeyField,
        jsonProperty, jsonTableInfix) {
    return (new SimpleQueryJSON(this, mainTablePrefix, mainSuffix,
        mainKeyField, jsonProperty, jsonTableInfix));
}

/**
 * SimpleQueryJSON changes the way that the parameters are interpreted
 * so that they fit our file model better, rather than SQL.
 */
util.inherits(SimpleQueryJSON, dschema.QueryJSON);

function SimpleQueryJSON(connGroup, collectionName, ignorableSuffix,
        keyPropertyName, jsonPropertyName) {
    dschema.QueryJSON.call(this, connGroup);

    this.collectionName = collectionName;
    this.keyPropertyName = keyPropertyName;
    this.jsonPropertyName = jsonPropertyName;
    this.selectFields = [];
    this.f = dschema.defaultQueryExprFactory;
    this.index = -1; // fast fail
    this.conn = null;
    this.collection = null;
    this.connRequested = false;
    this.finished = false;
    this.waitNext = true;
    this.orderBy = null;
    this.orderAscending = false;
    this.resultRecords = null;
    this.expr = this.f.true();
    this.queueNextBound = this.queueNext.bind(this);
}

SimpleQueryJSON.prototype.withSelectField = function (name, alias, tableAlias) {
    if (alias == null) {
        alias = name;
    }

    this.selectFields.push({
            alias: alias,
            name: name,
        });

    return (this);
}

SimpleQueryJSON.prototype.withOrderBy = function (field, ascending) {
    this.orderBy = field;
    this.orderAscending = ascending;

    return (this);
}

SimpleQueryJSON.prototype.withQueryExpr = function (expr) {
    this.expr = this.f.and(this.expr, this.f.reframe(expr,
        this.f.root(this.jsonPropertyName)));

    return (this);
}

SimpleQueryJSON.prototype.stop = function () {
    if (this.collection != null) {
        this.index = this.getResultRecordsPrivate().length;
        this.waitNext = false;
        this.queueNext();
    }
}

SimpleQueryJSON.prototype.getResultRecordsPrivate = function () {
    if (this.resultRecords != null) {
        // got them
    }
    else if (this.collection == null) {
        // waiting
    }
    else {
        var records = this.resultRecords = [];
        var comparator;
        var expr = this.expr;

        if (this.orderBy != null) {
            var orderBy = this.orderBy;
            var flip = this.orderAscending ? 1 : -1;

            comparator = function (left, right) {
                    var result = flip;

                    if (left[orderBy] < right[orderBy]) {
                        result *= -1;
                    }
                    else if (left[orderBy] > right[orderBy]) {
                        result *= 1;
                    }
                    else {
                        result = 0;
                    }

                    return (result);
                };
        }
        else {
            comparator = null;
        }

        this.collection.records.forEach(function (record) {
                if (record == null) {
                    // deleted record, ignore
                }
                else if (!expr.test(record)) {
                    // doesn't match, ignore
                }
                else if (comparator !== null) {
                    // using a comparator - insert result in order
                    denum.binarySort(records, record, comparator);
                }
                else {
                    // not using a comparator - just append result
                    records.push(record);
                }
            });
    }

    return (this.resultRecords);
}

SimpleQueryJSON.prototype.queueNext = function () {
    if (this.waitNext) {
        // do nothing
    }
    else if (this.finished) {
        // nothing further
    }
    else if (!this.connRequested) {
        this.connRequested = true;
        this.connGroup.openConnection(function (error, conn) {
                if (error != null) {
                    this.errorPrivate(error);
                }
                else {
                    conn.accessCollectionProtected(this.collectionName,
                        function (error, collection) {
                            if (error != null) {
                                conn.close(this.errorPrivate.bind(this,
                                    error));
                            }
                            else if (collection == null) {
                                throw new denum.
                                    StateError("collection is null");
                            }
                            else {
                                this.conn = conn;
                                this.collection = collection;
                                this.index = 0;
                                this.queueNext();
                            }
                        }.bind(this));
                }
            }.bind(this));
    }
    else if ((records = this.getResultRecordsPrivate()) == null) {
        // collecting or sort pending - wait
    }
    else {
        while (!this.waitNext && (this.index >= 0) &&
                (this.index < records.length)) {
            var record = records[this.index++];

            if (record == null) {
                throw new Error("illegal state " + records.length +
                    " with index " + this.index);
            }

            if (this.expr.test(record)) {
                var info = {};

                this.selectFields.forEach(function (field) {
                        info[field.alias] = record[field.name];
                    });

                info[this.jsonPropertyName] = record[this.jsonPropertyName];

                this.waitNext = true;

                this.emit('result', info);
            }
        }

        if (!this.waitNext){
            this.waitNext = true;

            this.conn.close(function (error) {
                    this.finished = true;
                    this.conn = null;
                    this.collection = null;
                    this.emit('end');
                }.bind(this));
        }
    }
}

SimpleQueryJSON.prototype.next = function () {
    if (this.waitNext) {
        this.waitNext = false;

        setImmediate(this.queueNextBound);
    }
}

SimpleQueryJSON.prototype.errorPrivate = function (error) {
    this.emit('error', error);
}

util.inherits(SimpleConnection, dschema_file.FileConnection);

function SimpleConnection(connGroup, transacting) {
    dschema_file.FileConnection.call(this, connGroup, transacting);
}

exports.newDatabaseEngine = function (opts, logger) {
        return (new SimpleDatabaseEngine(opts, logger));
    };
