// Copyright (C) 2016-2017 Texas Instruments Incorporated - http://www.ti.com/
const Q = require('q');
const util = require('util');
const stream = require('stream');
const events = require('events');
const crypto = require('crypto');
const zlib = require('zlib');
const djson = require('./djson');
const denum = require('./denum');
const dschema = require('./dschema');
const dfile = require('./dfile');
const dinfra = require('./dinfra');
const STORED_BLOCK_SIZE = 32768;
const CHANGE_INITIAL = 0; // the change step to begin with
const CHANGE_FIXED = -1; // do not change this further
const CHANGE_NOMINAL = -2; // this has no blocks of its own
const CHANGE_TERMINATED = -3; // this indicates a deleted node
var TRACE = null; // set dconfig.dresource.trace = true or fn to configure
// ResourceImporter ITRACE
var ITRACE = null; // set dconfig.dresource.itrace = true or fn to configure
// ResourceStepper STRACE
var STRACE = null; // set dconfig.dresource.strace = true or fn to configure
// ResourceBatcher BTRACE
var BTRACE = null; // set dconfig.dresource.btrace = true or fn to configure
// ResourceQuery QTRACE
var QTRACE = null; // set dconfig.dresource.qtrace = true or fn to configure

exports.RTYPE = denum.cardinals(
    "FILE", // it's a file resource (may be sparse, nominal and/or hard-linked)
    "DIR", // it's a directory resource (name must end in /).
    "LINK"); // it's a symbolic link to some other entry

exports.VTYPE = denum.cardinals(
    "PREV", // previous version chain
    "SPARSE"); // sparse stack chain

var resourceManager = null;
const resourceTablePrefix = "dinfra_resource";
const resourceMetaTablePrefix = resourceTablePrefix + "meta";

exports.resourceTablePrefix = resourceTablePrefix;
exports.resourceMetaTablePrefix = resourceMetaTablePrefix;
exports.CHANGE_INITIAL = CHANGE_INITIAL;
exports.CHANGE_FIXED = CHANGE_FIXED;
exports.CHANGE_NOMINAL = CHANGE_NOMINAL;
exports.CHANGE_TERMINATED = CHANGE_TERMINATED;
exports.STORED_BLOCK_SIZE = STORED_BLOCK_SIZE;
exports.ETAG_HASH_ALG = "sha1";
exports.NAME_HASH_ALG = "sha1";

function ResourceManager(logger, writableGroup, readableGroup,
        encryptManager, opts) {
    if (logger == null) {
        throw new RangeError("need logger");
    }

    /* writableGroup can be null when we're in read-only mode ...
    if (writableGroup == null) {
        throw new RangeError("need writableGroup");
    }
    */

    if (readableGroup == null) {
        throw new RangeError("need readableGroup");
    }

    if (opts == null) {
        throw new RangeError("need opts");
    }

    this.logger = logger;
    this.writableGroup = writableGroup;
    this.readableGroup = readableGroup;
    this.encryptManager = encryptManager;
    this.calls = []; // list of calls in progress (short)
    this.opts = opts;
    this.supportsVersions = false; // overriden by SQL impl
    this.queryCache = [];
}

ResourceManager.prototype.getResourceSchema = function () {
    throw new denum.UnsupportedError();
}

ResourceManager.prototype.openResource = function (name, opts, callback) {
    throw new denum.UnsupportedError();
}

ResourceManager.prototype.newResourceQuery = function () {
    throw new denum.UnsupportedError();
}

ResourceManager.prototype.newResourceBatcher = function (opts) {
    throw new denum.UnsupportedError();
}

ResourceManager.prototype.newResourceFS = function (prefix, opts) {
    var dresourcefs = require('./dresourcefs');

    return (new dresourcefs.ResourceFS(this, prefix, opts));
}

ResourceManager.prototype.newResourceImporter = function (localTreePath,
        resourcePrefix, opts) {
    if (opts == null) {
        opts = {};
    }

    return (new ResourceImporter(this, localTreePath, resourcePrefix, opts));
}

ResourceManager.prototype.createArchiveQueryHandler = function (writable,
        opts) {
    if (opts == null) {
        throw new RangeError("opts must be provided");
    }

    if (opts.format != "file") {
        throw new denum.UnsupportedError("opts.format=" + opts.format);
    }

    if (opts.content !== false) {
        throw new denum.UnsupportedError("opts.content=" + opts.content);
    }

    var transform = null;

    if (opts.transform != null) {
        if (!(opts.transform instanceof Function)) {
            throw new RangeError("opts.transform must be a function");
        }

        transform = opts.transform;
    }

    var callback = function (error) {
            if (error != null) {
                writable.emit('error', error);
            }
        };
    var zstream = zlib.createGzip().
        on('error', function (error) {
            callback(error);
            callback = function () {}; // do nothing
        });

    zstream.pipe(writable);

    var writer = new djson.Streamer(zstream, null, { tree: true });
    var outerFake = {};
    var resourcesFake = [];
    var lastInfo = null;

    writer.beginMap(null, outerFake);
    writer.beginNamed(null, "records");
    writer.beginList(null, resourcesFake);

    var idCount = 0;

    return (function (error, rinfo) {
            if (error != null) {
                callback(error);
                callback = function () {}; // do nothing
            }
            else if (rinfo == null) {
                if (lastInfo != null) {
                    writer.sendValue(null, lastInfo, true); // the last
                }

                writer.endList(null, resourcesFake, false);
                writer.endNamed(null, "resources", true);
                writer.endMap(null, outerFake, true);

                writer.flush(function (error) {
                        if (error != null) {
                            callback(error);
                            callback = function () {}; // do nothing
                        }
                        else {
                            zstream.end(null, null, function (error) {
                                    callback(error);
                                    callback = function () {}; // do nothing
                                });
                        }
                    });
            }
            else {
                if (lastInfo != null) {
                    writer.sendValue(null, lastInfo, false); // not the last
                }

                // do not use names from origin rinfo
                var id = idCount++;
                var info = {
                        id: id,
                        name: rinfo.name,
                        version: null, // because archives are flat
                        encryption: null, // no encryption
                        material: null, // no encryption key
                        // begin -- these copy from origin
                        type: rinfo.type,
                        size: rinfo.size,
                        modified: rinfo.modified,
                        created: rinfo.created,
                        adjusted: rinfo.adjusted,
                        executable: rinfo.executable,
                        // end -- these copy from origin
                        change: 0, // make everything the initial change
                        meta: rinfo.meta,
                    };

                if (transform !== null) {
                    info = transform(info);
                }

                if (info != null) {
                    lastInfo = info;
                }
            }
        });
}

ResourceManager.prototype.writeArchiveTo = function (writable,
        pathPrefix, opts) {
    this.newResourceQuery().
        withNamePrefix(pathPrefix).
        invoke(this.createArchiveQueryHandler(writable, opts));
}

ResourceManager.prototype.findCachedQuery = function (path, expr) {
    var index = this.queryCache.length;

    while ((--index >= 0) &&
        (path.indexOf(this.queryCache[index].path) != 0));

    return ((index >= 0) ? this.queryCache[index] : null);
}

ResourceManager.prototype.updateCachedQueries = function (resource) {
    if (this.queryCache.length == 0) {
        // do nothing
    }
    else {
        var index = this.queryCache.length;

        while (--index >= 0) {
            var cachedQuery = this.queryCache[index];

            if (cachedQuery.hasId(resource.id) ||
                    cachedQuery.expr.test(resource)) {
                // cachedQuery.editResult(resource.id, resource);
                // invalidate cache
                this.queryCache.splice(index, 0);
            }
        }
    }
}

ResourceManager.prototype.rebuildCachedQuery = function (path, expr) {
    var index = this.queryCache.length;

    while ((--index >= 0) &&
        (path.indexOf(this.queryCache[index].path) != 0));

    if (index >= 0) {
        this.queryCache.splice(index, 1); // remove the old one.
    }

    var cachedQuery = new dschema.CachedQuery(expr,
        this.newResourceQuery().
        withNoAssumptions().
        withQueryExpr(expr));

    cachedQuery.path = path;

    this.queryCache.push(cachedQuery);

    return (cachedQuery);
}

exports.ResourceManager = ResourceManager;

/**
 * @class ResourceTX
 * @protected
 */
util.inherits(ResourceTX, dschema.SimpleTX);

function ResourceTX(resource, writable, name) {
    if (!(resource instanceof Resource)) {
        throw new denum.RangeError("Resource required");
    }

    dschema.SimpleTX.call(this, (writable ?
        resource.manager.writableGroup :
        resource.manager.readableGroup),
        writable, name,
        true); // retryable is true

    this.resource = resource;
}

/**
 * Overridden to generate the info() structure used by trace, logs
 * and errors.
 * @protected
 */
ResourceTX.prototype.generateInfo = function () {
    var info = dschema.SimpleTX.prototype.generateInfo.call(this);

    info.resource = {
            name: this.resource.name,
            id: this.resource.id,
            seq: this.resource.seqId,
        };

    return (info);
}

/**
 * A Resource is similar to a file-system node or a content management
 * system resource.  It has a path name, which begins with a / and ends with
 * a non-slash character.  Paths are Unicode BMP sequences, usually
 * exposed as UTF-8 in the filesystem.  Resources can represent
 * conventional filesystem directories and symbolic links, as well as
 * regular files.  A file has a content stream associated with it.  All
 * Resource can have practically unlimited JSON meta-data associated with
 * them.  The meta-data can be efficiently queried to resolve resources.
 * Resources come in two varieties: unversioned and versioned.  Unversioned
 * resources simply have a version of null.  Versioned resources have a
 * version string and possible relationships to other resources: for example
 * a versioned resource may have a prior versioned resource.  Branching
 * occurs when two resources have the same prior versioned resource.
 * Resources can be "nominal" which means that their content stream is
 * actually the content stream of another resource (similar to a hard
 * link in conventional filesystems).  Resource content streams can also be
 * "sparse", which means that large, contiguous sections of the stream may
 * be undefined.
 *
 * Note: resources must be closed after they have been opened - they consume
 * finite resources in the node.js virtual machine.  It is important to note
 * that the caller must not access resource streams after closing a resource
 * and also that close resource is responsible for writing summary data - the
 * caller should provide a callback to resource.close() to check that the
 * summary data has been correctly written and everything has been properly
 * released.  Failing to do so can result in non-deterministic state within
 * the calling application.
 * @class Resource
 */
function Resource(manager, name, opts) {
    if (!(manager instanceof ResourceManager)) {
        throw new RangeError("illegal type " + typeof(manager));
    }

    if (typeof(name) != "string") {
        throw new RangeError("illegal type " + typeof(name));
    }

    /* @todo urgent check with githubagent usage first ...
    if (name.indexOf("/") != 0) {
        // @todo urgent check name is not longer than resource name/store
        throw new RangeError("illegal name " + name);
    }
    */

    this.manager = manager;

    /**
     * @member {number} Resource#id - a 51bit integer representing the unique
     * resource (independent of path name or version).
     */
    this.id = null;
    this.opts = opts; // mutable copy - doesn't affect caller.
    this.lock = null;
    this.contentIds = null;
    /**
     * @member {number} Resource#size - a 51bit integer representing the size
     * of the resource (as it was last recorded during a resource.close()).
     */
    this.size = 0;
    /**
     * @member {string} Resource#name - the full path name of the resource,
     * beginning with a forward-slash and ending in a non-forward-slash
     * unicode character.
     */
    this.name = name;
    this.callback = null;
    /**
     * @member {number} Resource#blockSize - the underlying block size of the
     * resource on the storage media.
     */
    this.blockSize = 0;
    /**
     * @member {boolean} Resource#created - true if this resource was
     * created by the dinfra.openResource() call which returned it.
     */
    this.created = opts.created || Date.now();
    /**
     * @member {boolean} Resource#modified - true if this resource has
     * been modified since the dinfra.openResource() call which returned it.
     */
    this.modified = opts.modified || this.created;
    this.master = null; // unversioned record
    this.versions = null; // available version records by version
    this.relations = null; // generalized relationships between resources
    this.idVersionMap = null; // available version records by id
    this.last_version = null;
    this.next_versions = null;
    this.latest_version = null;
    /**
     * @member {number} Resource#change - a 51bit cardinal number identifying
     * the modification count of this resource.
     */
    this.change = CHANGE_INITIAL;
    this.original = this.change;
    this.metaChanged = false;
    this.encryption = null; // no encryption
    this.symKeyBuffer = null; // for writing only
    this.symKeyBuffers = null; // for reading only (map by id)
    this.ivBuffer = null;
    this.slow = 0; // ms to wait after read or write - used for testing
    this.seqId = Resource.seqCount++;

    /**
     * @member {number} Resource#type - the type of resource.
     */
    this.type = null;
    /**
     * @member {string} Resource#version - the version string of the resource.
     */
    this.version = null;
    this.latest = null;
    this.prev_version = null;
    this.meta = null;
    this.conn = null; // always initialize to null
    this.call = "open"; // create is an implicit open
    this.closed = false; // true when close() has been called
    this.destroyOnClose = null; // internally used to destroy resources by id.
    this.destroyBlocksOnClose = null; // used to destroy resource blocks by id.
    this.reversionList = []; // internally used to re-version resources. 
    this.keepConn = false; // keep a connection
    this.singleConn = null; // place to keep when we keep a connection
    this.closeConn = true; // are we responsible for closing this connection?

    if (this.opts.connection == null) {
        // do nothing
    }
    else if (this.opts.connection === true) {
        this.keepConn = true;
        this.closeConn = true;
    }
    else { // assume its an object
        this.keepConn = true;
        this.singleConn = this.opts.connection;
        this.closeConn = false;
    }
}

Resource.seqCount = 0;

/**
 * closeReadable(readable, optCallback) can be used to call readable.close(),
 * where readable is the result of a Resource.openReadable() call.
 * The only difference is that closeReadable() supports returning a
 * promise if the optCallback is undefined, where readable.close() cannot,
 * since this is not part of the underlying node Readable contract.
 */
Resource.prototype.closeReadable = function (readable, callback) {
    if (callback === undefined) {
        return (Q.ninvoke(this, "closeReadable", readable));
    }

    readable.close(callback);

    return (undefined);
}

/**
 * Create a new transaction and give it a name for accounting purposes.
 * The transaction will use a writable connection if writable is provided.
 * The transaction object will be returned in an unopened state.
 * The expectation is that tx.execute(fn, cb) is called to execute the
 * function fn zero or more times, according to error and retry rules.
 * The cb will be called only when a terminal error is encountered or
 * the tx has succeeded.
 */
Resource.prototype.newTXPrivate = function (writable, name) {
    return (new ResourceTX(this, writable, name));
}

/**
 * Get a particular root meta key.  This is preferable
 * to this.meta[key] because it handles a null meta.
 * It also matches setMeta, which is more appropriate for
 * application use.  There is no way of distinguishing
 * between an undefined value, a missing key or a missing meta:
 * all will return undefined.  Note that the meta key 'headers'
 * is reserved for storing MIME and HTTP headers - its better
 * to use getHeaders() or getHeader(key) to access those, since
 * that deals with missing objects and case folding.
 *
 * The alternate call patterns getMeta() and getMeta(rest...) are
 * also provided - getMeta(rest...) will navigate hops through the
 * meta-data, safely short-cutting null/undefined references.
 *
 * @param {string} key - the meta-data property to return.
 * @returns Object - returns the property value.
 */
Resource.prototype.getMeta = function (key) {
    var result;

    /*
        If we haven't already, take a copy of the original meta,
        so that we can compare on setMeta for changes.  Only
        valid for resources opened for writing.
    */
    if (!this.hasOriginalMeta && this.writable) {
        this.originalMeta = djson.simpleTreeCopy(this.meta);
        // the this.originalMeta value can be null or undefined
        this.hasOriginalMeta = true;
    }

    result = this.meta;

    for (var i = 0; i < arguments.length; i++) {
        if (result == null) {
            result = undefined;
            break;
        }
        else {
            result = result[arguments[i]];
        }
    }

    return (result);
}

/**
 * Sets a root meta key to a value, or if the value is
 * undefined, removes that value.  Note that this is distinct
 * from setHeader which has very different semantics.
 * See also notes on getMeta().
 * @param {string} key - the meta-data property to change.
 * @param {Object} value - the meta-data value to set.
 */
Resource.prototype.setMeta = function(key, value) {
    if (this.closed) {
        throw new Error("illegal state: resource is closed");
    }

    if (!this.writable) {
        throw new Error("illegal state: resource not opened for writing");
    }

    if (value === undefined) { // undefined only!!
        if (this.meta != null) {
            delete this.meta[key];
            this.metaChanged = true; // flush on close
        }
    }
    else {
        if (this.meta == null) { // or undefined
            this.meta = {};
        }

        this.meta[key] = value;
        this.metaChanged = true; // flush on close
    }
}

/**
 * Set the search content for a resource.
 */
Resource.prototype.setSearch = function(state) {
    if (!(state instanceof dsearch.State)) {
        throw new RangeError("state argument must come from an analyzer");
    }

    setMeta("search", state.asSearchJSONProtected());
}

Resource.prototype.setCreated = function(created) {
    if (typeof(created) != "number") {
        throw new RangeError();
    }

    if (this.change < 0) {
        throw new denum.StateError();
    }

    if (this.created != created) {
        this.created = created;
        this.change++; // flush on close
    }
}

Resource.prototype.setModified = function(modified) {
    if (typeof(modified) != "number") {
        throw new RangeError();
    }

    if (this.change < 0) {
        throw new denum.StateError();
    }

    if (this.modified != modified) {
        this.modified = modified;
        this.change++; // flush on close
    }
}

Resource.prototype.setExecutable = function(executable) {
    if (this.change < 0) {
        throw new denum.StateError();
    }

    if (this.executable != !!executable) {
        this.executable = !!executable; // coerce to boolean
        this.change++; // flush on close
    }
}

/**
 * Request the usage of the resource - how much content
 * is actually stored against the resource.  Due to block
 * overlays, the answer to this is not always straightforward.
 * The default just reports the resource size.
 */
Resource.prototype.requestUsage = function (callback) {
    return (callback(null, {
            size: this.size,
        }));
}

/**
 * Returns a copy of the headers.  Will overlay onto passed headers
 * if provided.  Note that headers are always string value pairs and
 * are compared caseless, which is a bit different to object properties.
 */
Resource.prototype.getHeaders = function(headers) {
    if (headers == null) {
        headers = {};
    }

    if ((this.meta != null) && (this.meta.headers != null)) {
        for (var a in this.meta.headers) {
            headers[a] = "" + this.meta.headers[a];
        }
    }

    return (headers);
}

/**
 * This updates some specific meta headers derivable from
 * the resource header values.
 */
Resource.prototype.updateHeaders = function () {
    if (this.type == exports.RTYPE.FILE) {
        /**
         * This can end up being redundant if a content-length
         * header already existed prior to the close, but it
         * will not cause a lot of extra churn.
         */
        this.setHeader("Content-Length", this.size);
    }

    var date = new Date(this.modified);

    this.setHeader("Last-Modified", denum.rfc822Date(date));
}

/**
 * Set a MIME (eg. Content-Type) or HTTP (eg. ETag) header for the
 * resource.  Note that the key and value will both be coerced to
 * strings.  The key cannot be null, undefined or empty.  Keys
 * are folded to lower case ASCII.  A null or undefined value will
 * remove that header.
 */
Resource.prototype.setHeader = function(key, value) {
    if (!this.writable) {
        throw new Error("illegal state: resource not opened for writing");
    }

    if (key == null) {
        throw new Error("key cannot be null or undefined");
    }

    key = "" + key; // coerce string

    if (key == "") {
        throw new Error("key cannot be empty");
    }

    key = key.toLowerCase(); // no locale

    var headers = this.getMeta("headers");

    if (headers == null) {
        headers = {};
    }

    if (value == null) { // or undefined
        if (key in headers) {
            delete headers[key];
        }
    }
    else {
        value = "" + value; // cast to string

        if (headers[key] != value) {
            headers[key] = value;
        }
    }

    this.setMeta("headers", headers);
}

/**
 * Return a header by key - the key cannot be null, undefined or empty.
 * It will be case folded to lower case ASCII.  The result will be
 * undefined.  Generally, results should be non-null strings if the
 * interface has been used to maintain them.
 */
Resource.prototype.getHeader = function(key) {
    if (key == null) {
        throw new Error("key cannot be null or undefined");
    }

    key = "" + key; // coerce string

    if (key == "") {
        throw new Error("key cannot be empty");
    }

    key = key.toLowerCase(); // no locale

    var value;

    if (this.meta == null) {
        value = undefined;
    }
    else if (this.meta.headers == null) {
        value = undefined;
    }
    else {
        value = this.meta.headers[key];
    }

    return (value);
}

/**
 * Returns true if the meta data has changed.
 */
Resource.prototype.checkMetaChanged = function () {
    if (!this.metaChanged) {
        // do not alter
    }
    else if (!this.hasOriginalMeta) {
        // nothing to compare again, assume true and do not alter
    }
    else if (!djson.simpleTreeCompare(this.meta, this.originalMeta)) {
        // compare failed, changes remain true 
    }
    else {
        // clear the changes - nothing is different from the original meta
        this.metaChanged = false;
    }

    return (this.metaChanged);
}

/**
 * Clears the meta data changed state.  Called internally
 * after flushing.  Exposed just in case it is desired.
 */
Resource.prototype.clearMetaChanged = function () {
    this.metaChanged = false;
    this.hasOriginalMeta = false;
    this.originalMeta = null;
}

/**
 * Flush summary data etc. to the database within transaction.
 */
Resource.prototype.flushPrivate = function (tx, callback) {
    var runQueue = new denum.RunQueue(callback);

    if (this.destroyOnClose != null) {
        if (TRACE) {
            TRACE("flushPrivate", "destroyOnClose");
        }

        runQueue.submit(this.destroyPrivate.bind(this, tx));
    }
    else {
        runQueue.submit(function (next) {
                if (this.change == this.original) {
                    return (next());
                }

                if (TRACE) {
                    TRACE("flushPrivate", "updateHeader");
                }

                tx.followup(function () {
                        this.original = this.change;
                    }.bind(this));

                return (this.updateHeaderPrivate(tx, next));
            }.bind(this));

        runQueue.submit(function (next) {
                if (!this.checkMetaChanged()) {
                    return (next());
                }

                if (TRACE) {
                    TRACE("flushPrivate", "updateHeader");
                }

                tx.followup(function () {
                        this.clearMetaChanged();
                    }.bind(this));

                return (this.updateMetaPrivate(tx, next));
            }.bind(this));
    }

    runQueue.submit(); // force run
}

/**
 * Flush non-critical data to the database outside of a transacton, after a
 * successful transaction in which critical data is flushed.
 * Used only for non-critical operations that can be too expensive for
 * transactions; e.g. deletion of resource blocks can take >200s.
 */
Resource.prototype.nonTxFlushPrivate = function (callback) {

    if (this.destroyBlocksOnClose != null) {

        if (TRACE) {
            TRACE("nonTxFlushPrivate", "destroyBlocksOnClose");
        }

        this.nonTxDeleteByIdsPrivate(this.destroyBlocksOnClose,
            function (error) {
                if (error != null) {
                    return (callback(error));
                }
    
                this.destroyBlocksOnClose = null;
    
                return (callback());
            });
    }
    else {
        return (callback());
    }
}

function getParentNameOf(name) {
    var i = name.lastIndexOf('/');

    if (i < 0) {
        i = 0;
    }

    return (name.substring(0, i));
}

function getSegmentOf(name) {
    var i = name.lastIndexOf('/');

    if (i < 0) {
        i = 0;
    }
    else {
        i++; // skip over /
    }

    return (name.substring(i));
}

exports.getParentNameOf = getParentNameOf;
exports.getSegmentOf = getSegmentOf;

Resource.prototype.getParentName = function () {
    return (getParentNameOf(this.name));
}

Resource.prototype.getSegment = function () {
    return (getSegmentOf(this.name));
}

Resource.prototype.wrapupPrivate = function (error, callback) {
    /*
        Everything is complete, so conditionally cache if it
        is all good.
    */
    if (error == null) {
        if (this.writable) {
            this.manager.updateCachedQueries(this);
        }
    }

    return (callback(error));
}

Resource.prototype.closeTXPrivate = function (callback) {
    var tx = this.newTXPrivate(true, "closeResource");

    // First perform both critical and inexpensive non-critical flush operations
    // inside of a transaction.
    tx.execute(this.flushPrivate.bind(this, tx), function (error) {
            if (error != null) {
                return (callback(error));
            }

            // Then, post-successful-transaction, perform any expensive critical
            // flush operations. These are performed outside of the transaction
            // to keep it quick.
            this.nonTxFlushPrivate(callback);
        }.bind(this));
}

Resource.prototype.close = function (callback) {
    if (callback === undefined) {
        return (Q.ninvoke(this, "close"));
    }

    if (this.closed) {
        // preserve details and stack trace ...
        var error = new Error("resource closed twice: " + this.name);

        this.manager.logger.warning("resource closed twice",
            {
                name: this.name,
                id: this.id,
                size: this.size,
                version: this.version
            },
            error);

        return (callback(error));
    }

    this.closed = true;

    if (this.lock != null) {
        var lock = this.lock;

        this.lock = null;

        lock.close();
    }

    if ((this.change != this.original) || this.metaChanged ||
            (this.destroyOnClose != null)) {
        return (this.closeTXPrivate(function (error) {
                this.wrapupPrivate(error, callback);
            }.bind(this)));
    }

    return (this.wrapupPrivate(null, callback));
}

Resource.prototype.createEncryptPrivate = function(tx, callback) {
    if (!this.opts.encrypt) {
        return (this.createPrivate(tx, callback));
    }

    this.manager.encryptManager.storeBlockKey(tx.conn, resourceTablePrefix,
        function (error, symKeyId, symKeyBuffer, ivBuffer) {
            if (error != null) {
                return (callback(error));
            }

            this.encryption = symKeyId;
            this.symKeyBuffer = symKeyBuffer;
            this.ivBuffer = ivBuffer;

            return (this.createPrivate(tx, callback));
        }.bind(this));
}

Resource.prototype.destroyPrivate = function (tx, callback) {
    var versionsToDestroy = {};

    for (var i = 0; i < this.destroyOnClose.length; i++) {
        var record = this.idVersionMap[this.destroyOnClose[i]];

        if (record != null) {
            versionsToDestroy[record.version] = record.prev_version;
        }
    }

    for (var version in versionsToDestroy) {
        var pversion = version;

        while ((pversion = versionsToDestroy[pversion]) in versionsToDestroy) {
            // chain
        }

        versionsToDestroy[version] = pversion;
    }

    for (var id in this.idVersionMap) {
        var record = this.idVersionMap[id];

        if (record.version in versionsToDestroy) {
            // just ignore resources being deleted
        }
        else if (!(record.prev_version in versionsToDestroy)) {
            // doesn't need fixing
        }
        else {
            this.reversionList.push({
                    id: id,
                    oldValue: record.prev_version,
                    newValue: versionsToDestroy[record.prev_version],
                });
        }
    }

    this.deleteByIdsPrivate(tx, this.destroyOnClose,
        function (error) {
            if (error != null) {
                return (callback(error));
            }

            // once we're committed, clear the destroy on close list
            tx.followup(function () {
                    this.destroyBlocksOnClose = this.destroyOnClose;
                    this.destroyOnClose = null;
                }.bind(this));

            return (callback(error));
        }.bind(this));
}

/**
 * Different resource implementations delete things in different
 * was, so this hook is provided to allow for that.
 * @private
 */
Resource.prototype.deleteByIdsPrivate = function (ids, callback) {
    throw new denum.UnsupportedError();
}

/**
 * Different resource implementations delete things in different
 * was, so this hook is provided to allow for that.
 * @private
 */
Resource.prototype.nonTxDeleteByIdsPrivate = function (ids, callback) {
    throw new denum.UnsupportedError();
}

/**
 * Used to create an initial record internally.
 * @private
 */
Resource.prototype.createPrivate = function() {
    throw new denum.UnsupportedError();
}

/**
 * Returns true if for this file, the version belongs to the
 * branch or is the branch version.
 */
Resource.prototype.isVersionOfBranch = function(version, branch) {
    var result = false;

    while ((version != null) && !result) {
        if (version == branch) {
            result = true;
        }
        else {
            version = this.versions[version].prev_version;
        }
    }

    return (result);
}

Resource.prototype.initSparseMapsPrivatePrivate = function (sparses) {
    if (sparses != null) {
        for (var i = 0; i < sparses.length; i++) {
            var sid = sparses[i]; // an id

            if (sid in this.idVersionMap) {
                if (this.symKeyBuffers == null) {
                    this.symKeyBuffers = {};
                }

                this.symKeyBuffers[sid] = this.idVersionMap[sid].material;

                if (i == 0) { // order of priority is important
                    this.sparse_version = this.idVersionMap[sid].version;
                    this.sparse_name = this.name; // always the same
                }
            }

            this.contentIds.push(sid);
        }
    }
}

Resource.prototype.summaryPrivate = function(tx, callback) {
    if (TRACE) {
        TRACE("summaryPrivate");
    }

    this.last_versions = [];
    this.latest_version = null;
    this.contentIds = []; // reset the content id list

    var tt = null;

    try {
        for (var version in this.versions) {
            var record = this.versions[version];

            for (var relationIndex = 0;
                    relationIndex < record.relations.length;
                    relationIndex++) {
                var relation = record.relations[relationIndex];

                if (relation.vtype == exports.VTYPE.PREV) {
                    var precord;

                    if (relation.via_id != relation.to_id) {
                        // this is an inferred relation, ignore it
                    }
                    else if (precord = this.idVersionMap[relation.from_id]) {
                        if (precord.next_versions == null) {
                            precord.next_versions = [];
                        }

                        precord.next_versions.push(version);

                        if (record.prev_version != null) {
                            throw new Error("multiple prev versions " +
                                version +
                                " has " + record.prev_version +
                                " and " + precord.prev_version +
                                " on " + this.name);
                        }

                        record.prev_version = precord.version;
                    }
                }
                else if (relation.vtype == exports.VTYPE.SPARSE) {
                    if (record.sparse == null) {
                        record.sparse = [];
                    }

                    while (record.sparse.length < relation.steps) {
                        record.sparse.push(null);
                    }

                    record.sparse[relation.steps - 1] = relation.from_id;
                }
                else {
                    // unsupported relation type
                }
            };
        }

        for (var version in this.versions) {
            var record = this.versions[version];

            if (record.next_versions == null) {
                this.last_versions.push(version);
            }
        }

        var chosen = null;

        for (var i = 0; i < this.last_versions.length; i++) {
            var candidate = this.versions[this.last_versions[i]];

            if ((this.prev_version != null) &&
                    !this.isVersionOfBranch(candidate.version,
                    this.prev_version)) {
                // ignore latest with wrong branch
            }
            else if (chosen == null) {
                chosen = candidate;
            }
            else if (1 * candidate.id > 1 * chosen.id) {
                chosen = candidate; // @todo there is a better way than this
            }
            else {
                // ignore candidate
            }
        }

        if (chosen != null) {
            this.latest_version = chosen.version;
        }

        chosen = null;

        if (this.latest) {
            if (this.latest_version != null) {
                chosen = this.versions[this.latest_version];
            }
            else {
                chosen = this.master; // may be null
            }
        }
        else if (this.version == null) {
            if (this.latest_version != null) {
                chosen = this.latest_version;
            }
            else {
                chosen = this.master; // may be null
            }
        }
        else {
            if (this.version in this.versions) {
                chosen = this.versions[this.version];
            }
            else {
                chosen = null;
            }
        }

        if (chosen != null) {
            this.id = chosen.id;

            /*
                Note: we can have a sparse without a sparse_version
                and sparse_name, since these are actually only populated
                if the sparse resource name is the same.
            */
            this.sparse_version = null;
            this.sparse_name = null;

            if (chosen.change != CHANGE_NOMINAL) {
                this.contentIds.push(chosen.id);
            }

            if (chosen.sparse != null) {
                this.initSparseMapsPrivatePrivate(chosen.sparse);
            }

            this.version = chosen.version;
            this.size = chosen.size;
            this.type = chosen.type;
            this.link = chosen.link;
            this.next_versions = chosen.next_versions;
            this.prev_version = chosen.prev_version;
            this.change = chosen.change;
            this.original = chosen.change;
            this.created = chosen.created;
            this.modified = chosen.modified;
            this.adjusted = chosen.adjusted;
            this.executable = chosen.executable;
            this.encryption = chosen.encryption;

            if (chosen.relations == null) {
                this.relations = [];
            }
            else {
                this.relations = chosen.relations.slice();
            }

            this.meta = chosen.meta;
            this.symKeyBuffer = chosen.material; // for writing
        }
    }
    catch (e) {
        tt = e;
    }

    if (TRACE) {
        TRACE("summaryPrivate chosen", chosen);
    }

    if (tt != null) {
        return (callback(tt));
    }

    if (this.id != null) {
        if ((this.change == CHANGE_TERMINATED) &&
                !this.create &&
                !this.opts.termination) {
            tx.resourceSilent = true;

            return (callback());
        }

        if (this.change == CHANGE_TERMINATED) {
            this.terminated = true;
        }
        else if (this.change == CHANGE_NOMINAL) {
            this.nominal = true;
        }
        else if (this.change == CHANGE_FIXED) {
            this.fixed = true;
        }

        return (callback());
    }

    if (!this.create) {
        return (callback());
    }

    if ((this.prev_version != null) &&
            !(this.prev_version in this.versions)) {
        return (callback(new Error("invalid previous version: " +
            this.prev_version)));
    }

    if (this.prev_version == null) {
        this.prev_version = this.latest_version;
    }

    var prev = this.versions[this.prev_version];

    /*
        Fill up this relations, using any previous
        relations if possible.  Use null as a placeholder
        for entries where our eventual id will go.
    */
    this.relations = [];

    if (prev != null) {
        for (var relationIndex = 0;
                relationIndex < prev.relations.length;
                relationIndex++) {
            var prelation = prev.relations[relationIndex];

            if (prelation.vtype == exports.VTYPE.PREV) {
                this.relations.push({
                        from_id: prelation.from_id, // verbatim
                        vtype: prelation.vtype, // verbatim
                        steps: prelation.steps + 1, // increment
                        via_id: prelation.to_id, // NOT via_id
                        to_id: null, // filled in after reapPrivate
                    });
            }
        }

        this.relations.push({
                from_id: prev.id,
                vtype: exports.VTYPE.PREV,
                steps: 1, // initialize
                via_id: null, // filled in after reapPrivate
                to_id: null, // filled in after reapPrivate
            });
    }

    if (this.opts.nominal) {
        if (prev == null) {
            return (callback(new RangeError("request on " +
                "resource " + this.name +
                " version " + this.version +
                " as nominal resolves to no selected previous version in" +
                " versions " + JSON.stringify(this.versions))));
        }

        // wind back before any other previous versions
        while (prev.change == CHANGE_NOMINAL){
            prev = this.versions[prev.prev_version];
        }

        this.relations.push({
                from_id: prev.id,
                vtype: exports.VTYPE.SPARSE,
                steps: 1, // initialize
                via_id: null, // filled in after reapPrivate
                to_id: null, // filled in after reapPrivate
            });

        this.change = CHANGE_NOMINAL;
        this.sparse_name = this.name;
        this.sparse_version = this.idVersionMap[prev.id].version;
        this.size = prev.size;
        this.created = prev.created;
        this.modified = prev.modified;
    }
    else if (this.opts.sparse) {
        var sparseId;

        if (typeof(this.opts.sparse) == "number") {
            sparseId = this.opts.sparse;
        }
        else {
            if (this.opts.sparse === true) {
                // wind back before any other previous non-nominal versions
                while (prev.change == CHANGE_NOMINAL){
                    prev = this.versions[prev.prev_version];
                }

                sparseId = prev.id;
            }
            else {
                throw new Error("uns");
            }
        }

        if (Math.floor(sparseId) !== sparseId) {
            return (callback(new Error("opts.sparse does not refer" +
                " to a valid resource: " + this.opts.sparse)));
        }

        this.relations.push({
                from_id: sparseId,
                vtype: exports.VTYPE.SPARSE,
                steps: 1, // initialize
                via_id: null, // filled in after reapPrivate
                to_id: null, // filled in after reapPrivate
            });

        this.change = 0;

        prev = this.idVersionMap[sparseId]; // may not be defined

        if (prev != null) {
            this.sparse_name = this.name;
            this.sparse_version = prev.version;
            this.size = prev.size;

            if (prev.sparse) {
                this.initSparseMapsPrivatePrivate(prev.sparse);
            }
            else {
                this.initSparseMapsPrivatePrivate([prev.id]);
            }
        }
        else {
            // do not set the sparse_name, sparse_version or size.
        }

        this.created = Date.now();
        this.modified = this.created;
    }
    else {
        this.size = 0;
        this.created = Date.now();
        this.modified = this.created;
    }

    if (this.opts.delete) {
        // indicates logical delete
        this.change = CHANGE_TERMINATED;
    }

    if (this.opts.meta != null) {
        this.getMeta(); // cache null for comparison

        for (var name in this.opts.meta) {
            if (name == "headers") {
                for (var header in this.opts.meta.headers) {
                    this.setHeader(header, this.opts.meta.headers[header]);
                }
            }
            else {
                this.setMeta(name, this.opts.meta[name]);
            }
        }
    }

    /*
    @todo urgent

    The nuanced opts.meta handling above seems to solve the directory
    create problems - they create atomically, without any trouble, 
    its nice and fast.

    But we are still getting some problems writing file meta data.
    Need to look more closely at that and see where the race condition
    is occurring.  Also need to determine what we do.  Probably re-run
    until success.

    After that, we need to remove all the keepConn kruft etc.
    */

    this.createEncryptPrivate(tx, callback);
}

Resource.prototype.statPrivate = function(tx, callback) {
    if (TRACE) {
        TRACE("statPrivate");
    }

    /*
        Really important to reset these all of this here, deadlock
        retries can change the contents between iterations (in some
        implementations).  This must also include anything that
        gets done during an openPrivate(), which covers a lot of the
        metadata and summary data management.
    */
    this.change = CHANGE_INITIAL;
    this.blockSize = exports.STORED_BLOCK_SIZE;
    this.versions = {};
    this.relations = [];
    this.idVersionMap = {};
    this.last_versions = [];
    this.latest_version = null;
    this.next_versions = [];
    this.contentIds = [];
    this.reversionList = [];
    this.master = null;
    this.id = null;
    this.meta = null;
    this.sparse_version = null;
    this.sparse_name = null;
    this.type = this.opts.type;
    this.link = this.opts.link;
    this.version = this.opts.version; // get the specific version
    // can be used for more than creates
    this.latest = this.opts.latest; // get the latest
    this.prev_version = this.opts.branch;
    /**
     * @member {boolean} Resource#create - true if the opener was allowing
     * this operation to create this resource.
     */
    this.create = !!this.opts.create;
    /**
     * @member {boolean} Resource#writable - true if this resource has been
     * opened in a writable fashion.
     */
    this.writable = !!this.opts.writable;
    this.executable = !!this.opts.executable;

    var query = this.manager.newResourceQuery().
        withFixedConn(tx.conn, tx.writable). // writable -> for update
        withNoAssumptions(). // ie. get everything related to the name.
        withName(this.name); // note: may also use a name hash internally

    /*
        Do not resolve sparse versions - we synthesize this information
        from the entire result set, rather than get the DB to do the
        extra join on it.  The sparse_version and sparse_name results
        are kind of legacy, but needed by Uniflash - may end up asking
        them to be factored out at some point for a better solution.
    */
    query.featureSparseVersions = false;
    query.featureEncryptDetails = true;

    query.invoke(function (error, record) {
            if (TRACE) {
                TRACE("statPrivate -> ", error, record);
            }

            if (error != null) {
                return (callback(error));
            }

            if (record == null) {
                return (this.summaryPrivate(tx, callback));
            }

            if (record.version != null) {
                this.versions[record.version] = record;
                this.idVersionMap[record.id] = record;
            }
            else {
                this.master = record;
            }
        }.bind(this));
}

/**
 * Return a map of versions to previous versions.
 * If non-empty, then the closure (transitive application
 * of previous version) will lead back to exactly one
 * version (the first version).
 */
Resource.prototype.mapVersions = function() {
    var map = {};

    for (var version in this.versions) {
        map[version] = this.versions[version].prev_version;
    }

    return (map);
}

/**
 * Called by the provider framework after creating a new
 * Resource subclass instance.
 * @private
 */
Resource.prototype.openPrivate = function (callback) {
    var tx = this.newTXPrivate(this.writable || this.create, "openResource");

    tx.execute(this.statPrivate.bind(this, tx), // can be called multiple times
        function (error) { // called once after possible retries
            var resource;

            if (error != null) {
                resource = null;
            }
            else if (this.id == null) {
                resource = null; // but no error
            }
            else if (tx.resourceSilent) {
                resource = null; // but no error
            }
            else {
                resource = this;
            }

            return (callback(error, resource));
        }.bind(this));
}

/** 
 * Sent during resource close to update the JSON meta data
 * @private
 */
Resource.prototype.updateMetaPrivate = function (tx, callback) {
    throw new denum.UnsupportedError();
}

Resource.prototype.updateHeaderPrivate = function (tx, callback) {
    throw new denum.UnsupportedError();
}

/**
 * Change the size of this resource.  This will truncate the
 * resource if the resource is longer, and may infer sparse
 * blocks if the resource is shorter.
 * @param {number} the new size of the resource as a 51-bit integer
 */
Resource.prototype.setSize = function (size) {
    if (size == this.size) {
        // do nothing
    }
    else if (this.change < 0) {
        throw new Error("immutable resource");
    }
    else {
        this.size = size;
        this.change++;

        if ((this.meta != null) && (this.meta.headers != null) &&
                (this.meta.headers["content-length"] != null)) {
            // This will cause a meta-data flush eventually.
            // Note: size will be coerced to a string in the header.
            this.updateHeaders();
        }
    }
}

/**
 * Allocate the kind of buffer that you should use for read and
 * write blocks.
 */
Resource.prototype.allocBuffer = function () {
    var buffer = new Buffer(this.blockSize);

    buffer.fill(0);

    return (buffer);
}

/**
 * Returns true if this versioned resource is a logical delete.
 */
Resource.prototype.isTermination = function() {
    return (this.change == CHANGE_TERMINATED);
}

/**
 * Returns true if this resource has modifiable content.
 * Note: metadata is always modifiable.
 */
Resource.prototype.isModifiable = function() {
    return (this.change >= 0);
}

/**
 * Return true if this versioned resource is nominal - and has no
 * content of its own.
 */
Resource.prototype.isNominal = function() {
    return (this.change == CHANGE_NOMINAL);
}

/**
 * Open the resource's content stream as a node.js Readable.
 * Supported options:
 * type: 'buffer' | 'sparse-obj' ; defaults to 'buffer'
 *   non-sparse - non-sparse stream of data: buffer
 *   sparse-obj - sparse stream of {pos: number, data: buffer} objects
 * @param {Object} opt
 * @returns Readable - a node.js readable stream
 */
Resource.prototype.openReadable = function (opt) {
    throw new denum.UnsupportedError();
}

/**
 * Similar to fs.readFile - calls callback(err, Buffer) if encoding
 * is null, or callback(err, String) otherwise.
 */
Resource.prototype.readContent = function (encoding, callback) {
    if (callback === undefined) {
        return (Q.nfcall(this, encoding)); // shortcut to Q
    }

    var readable = this.openReadable();
    var result = new Buffer(0);

    readable.on('data', function (buf) {
            result = Buffer.concat([result, buf]); // slow lazy sloppy
        });
    readable.on('error', function (error) {
            callback(error);
        });
    readable.on('end', function () {
            if (encoding != null) {
                try {
                    // we concat this because Buffer sometimes lies
                    result = "" + result.toString(encoding);
                }
                catch (e) {
                    callback(e);
                }
            }
            else {
                // no transform needed
            }

            callback(null, result);
        });
}

/**
 * Open a resource's content stream as a node.js Writable.
 * Supported options:
 * type: 'buffer' | 'sparse-obj' ; defaults to 'buffer'
 *   non-sparse - non-sparse stream of data: buffer
 *   sparse-obj - sparse stream of {pos: number, data: buffer} objects
 * etag: true - provide an etag header
 * headers: true - update last-modified and content-length headers
 * to align with resource.
 * @param opt
 * @returns Writable - a node.js writable stream
 */
Resource.prototype.openWritable = function (opt) {
    if ((this.id == null) || this.closed) {
        throw new denum.StateError("cannot open readable on invalid resource");
    }

    if (this.change < 0) {
        throw new denum.StateError("immutable resource");
    }

    if (!this.writable) {
        throw new denum.StateError("not opened for writing");
    }

    return (this.openWritableProtected(opt));
}

/** 
 * This is the method that is overridden by implementations to
 * actually return the writable stream.
 * @protected
 */
Resource.prototype.openWritableProtected = function (opt) {
    throw new Error("unimplemented");
}

/**
 * Similar to fs.writeFile - calls callback(err) when done
 */
Resource.prototype.writeContent = function (chunk, encoding, callback) {
    if (callback === undefined) {
        return (Q.nfcall(this, chunk, encoding)); // shortcut to Q
    }

    this.openWritable().end(chunk, encoding, callback);
}

exports.Resource = Resource;

util.inherits(ResourceQuery, dschema.JSONQuery);

function ResourceQuery(manager) {
    if (!(manager instanceof ResourceManager)) {
        throw new RangeError("need ResourceManager");
                
    }

    dschema.JSONQuery.call(this, manager.readableGroup,
        resourceTablePrefix, "headers", "id", "meta");

    this.manager = manager;

    if (QTRACE) {
        this.trace = QTRACE.bind(null, this.seqId);
        this.trace("created");
    }

    /*
        IMPORTANT NOTE: dresource_sql.js adds a left join to this,
        while dresource_file.js doesn't, because it doesn't support nominal
        versions or sparse content.
    */

    this.featureTerminations = false;
    this.featureAllVersions = false;
    this.featureAssumptions = true;
    this.featureAllTypes = false;
    this.featureNamePrefix = false;
    this.explicitLatestVersion = false;
    this.explicitVersionQuery = false;
}

ResourceQuery.prototype.buildQueryJSON = function() {
    if (this.queryJSON != null) {
        // ignore
    }
    else if (this.cachedQuery != null) {
        this.queryJSON = this.cachedQuery.newResultEmitter(
            this.f.reframe(this.expr, this.f.root("meta")));
    }
    else {
        dschema.JSONQuery.prototype.buildQueryJSON.call(this);
    }

    return (this.queryJSON);
}

ResourceQuery.prototype.newQueryJSON = function() {
    return (dschema.JSONQuery.prototype.newQueryJSON.call(this).
        withSelectField("id").
        withSelectField("type").
        withSelectField("name").
        withSelectField("segment").
        withSelectField("link").
        withSelectField("version").
        withSelectField("size").
        withSelectField("change").
        withSelectField("created").
        withSelectField("modified").
        withSelectField("adjusted").
        withSelectField("executable").
        withSelectField("encryption"));
}

ResourceQuery.prototype.withNoAssumptions = function (type) {
    this.featureAssumptions = false;
    this.featureTerminations = true;
    this.featureAllVersions = true;
    this.featureAllTypes = true;

    return (this);
}

/**
 * This filter allows terminations to appear in the result set.
 */
ResourceQuery.prototype.withTerminations = function () {
    this.featureTerminations = true;

    return (this);
}

/**
 * This filter allows all types to appear in the result set (not just files).
 */
ResourceQuery.prototype.withAllTypes = function () {
    this.featureAllTypes = true;

    return (this);
}

/**
 * This filter allows all versions to appear in the result set.
 */
ResourceQuery.prototype.withAllVersions = function () {
    this.featureAllVersions = true;

    return (this);
}

/**
 * This is just to make older code still run - its the inverse
 * of withAllVersions and is technically no longer needed since
 * its the default.
 */
ResourceQuery.prototype.withLatestVersion = function () {
    this.featureAllVersions = false;
    this.explicitLatestVersion = true;

    return (this);
}

/**
 * Reset the type filtering and choose just a specific type.
 * Note that this cannot be undone by using withAllTypes().
 */
ResourceQuery.prototype.withType = function (type) {
    var f = this.f;

    this.featureAllTypes = true;
    this.withQueryExpr(f.eq(f.record("type"), type));

    return (this);
}

ResourceQuery.prototype.withModifiedSince = function (date) {
    var f = this.f;

    this.withQueryExpr(f.gte(f.record("modified"), dschema.dateAsLong(date)));

    return (this);
}

ResourceQuery.prototype.withModifiedBefore = function (date) {
    var f = this.f;

    this.withQueryExpr(f.lt(f.record("modified"), dschema.dateAsLong(date)));

    return (this);
}

ResourceQuery.prototype.withCreatedSince = function (date) {
    var f = this.f;

    this.withQueryExpr(f.gte(f.record("created"), dschema.dateAsLong(date)));

    return (this);
}

ResourceQuery.prototype.withCreatedBefore = function (date) {
    var f = this.f;

    this.withQueryExpr(f.lt(f.record("created"), dschema.dateAsLong(date)));

    return (this);
}

ResourceQuery.prototype.withName = function (path) {
    var f = this.f;

    this.withQueryExpr(f.eq(f.record("name"), path));

    return (this);
}

/**
 * Query resource by a name prefix.  If your result set is small, but
 * very frequently queried, you can nominate to cache it by passing
 * true for the cache parameter.  Otherwise omit that parameter.
 */
ResourceQuery.prototype.withNamePrefix = function (prefix, cache) {
    var f = this.f;

    var cacheableExpr = f.prefix(f.record("name"), prefix);

    this.featureNamePrefix = true;

    if (cache === true) {
        // special magic
        this.cachedQuery = this.manager.rebuildCachedQuery(prefix,
            cacheableExpr);
    }
    else if (cache == null) {
        this.cachedQuery = this.manager.findCachedQuery(prefix, cacheableExpr);
    }
    else {
        throw new denum.UnsupportedError("unsupported cache param " + cache);
    }

    // the regular way
    this.withQueryExpr(cacheableExpr);

    return (this);
}

ResourceQuery.prototype.withNamePrefixes = function (prefixes) {
    var f = this.f;
    var expr = f.false();

    prefixes.forEach(function (prefix) {
            expr = f.or(expr, f.prefix(f.record("name"), prefix));
        });

    this.withQueryExpr(expr);

    return (this);
}

ResourceQuery.prototype.withParentName = function (parent) {
    throw new Error("abstract");
}

ResourceQuery.prototype.withNamePattern = function (pathPattern) {
    var f = this.f;

    this.withQueryExpr(f.match(f.record("name"), pathPattern));

    return (this);
}

ResourceQuery.prototype.withVersionBefore = function (version) {
    throw new denum.UnsupportedError();

    this.explicitVersionQuery = true; // impl MUST do this

    return (this);
}

ResourceQuery.prototype.withVersionUpTo = function (version) {
    throw new denum.UnsupportedError();

    this.explicitVersionQuery = true; // impl MUST do this

    return (this);
}

ResourceQuery.prototype.withVersionFrom = function (version) {
    throw new denum.UnsupportedError();

    this.explicitVersionQuery = true; // impl MUST do this

    return (this);
}

ResourceQuery.prototype.withVersionAfter = function (version) {
    throw new denum.UnsupportedError();

    this.explicitVersionQuery = true; // impl MUST do this

    return (this);
}

ResourceQuery.prototype.withVersion = function (version) {
    if (version !== null) {
        throw new denum.UnsupportedError();
    }

    this.explicitVersionQuery = true; // impl MUST do this

    return (this);
}

ResourceQuery.prototype.withPrevVersion = function (version) {
    throw new denum.UnsupportedError();

    this.explicitVersionQuery = true; // impl MUST do this

    return (this);
}

ResourceQuery.prototype.withOrderByName = function (ascending) {
    this.buildQueryJSON().withOrderBy("name", ascending);

    return (this);
}

ResourceQuery.prototype.withOrderBySegment = function (ascending) {
    this.buildQueryJSON().withOrderBy("segment", ascending);

    return (this);
}

exports.ResourceQuery = ResourceQuery;

exports.newResourceManager = function (logger, writableGroup,
            readableGroup, encryptManager, opts) {
        return (require("./dresource_" + opts.type + ".js").
            newResourceManager(logger, writableGroup, readableGroup,
            encryptManager, opts));
    };

/** 
 * The ResourceImporter wraps up most of the boilerplate logic
 * required to update a resource tree from a filesystem tree.
 * Create a new resource importer by calling
 * {@link dinfra.newResourceImporter}(filePath, resourcePrefix).
 * The code in eg/resource-importer.js provides an example of
 * typical usage.
 *
 * A result event is fired for each synchronization item that the
 * importer discovers:
 *
 * path - the relative path in both trees (starts with /)
 *
 * op - the kind of synchronization we recommend you do
 *
 * info - the resource information from the resource layer (null
 * if the path is not in the resource layer)
 *
 * stat - the file information from the file system (null
 * if the path is not in the resource layer)
 *
 * etag - the etag calculated for the file (null if the file hash
 * did not need to be calculated)
 *
 * The op property recommends what to do:
 *
 * "skip" means do nothing;
 *
 * "import" means create a new resource;
 *
 * "destroy" means terminate an old resource;
 *
 * "update" means update an existing resource.
 *
 * You can often just pass your result event directly to
 * ResourceImporter#applyStatEvent, which will automatically
 * perform the suggested operation with internal paralellism,
 * including calling ResourceImporter#next appropriately.
 *
 *
 * @class ResourceImporter
 * @extends EventEmitter
 * @fires end - when there are no more items and the queue has been exhausted
 * @fires error - when a non-recoverable error occurs
 * @fires result - when there is an item to sync
 */
util.inherits(ResourceImporter, events.EventEmitter);

/**
 * This is the internal (private) constructor for the ResourceImporter.
 * Don't use this, use {@link dinfra.newResourceImporter}().
 *
 * @constructs ResourceImporter
 * @private
 * @param {ResourceManager} manager - the resource manager to use
 * @param {string} localTreePath - the filesystem tree path prefix
 * @param {string} resourcePrefix - the resource layer tree path prefix
 */
function ResourceImporter(manager, localTreePath, resourcePrefix, opts) {
    events.EventEmitter.call(this);

    resourcePrefix = dinfra.normalizeResourceName(resourcePrefix);

    this.manager = manager;
    this.start = Date.now();
    this.resourcePrefix = resourcePrefix;
    this.lexicalOrder = false; // leave off: mostly used for benchmarking
    this.fileStepper =
        new dfile.FileTreeStepper(localTreePath, this.lexicalOrder).
        on('error', function (error) {
            this.emit('error', error);
        }.bind(this)).
        on('end', function (error) {
            if (ITRACE) {
                ITRACE("importer end files");
            }

            this.waitFile = false;
            this.endFiles = true;
            this.queueNext();
        }.bind(this)).
        on('result', function (path, stat) {
            if (ITRACE) {
                ITRACE("importer file result", path);
            }

            this.path = path;
            this.stat = stat;
            this.waitFile = false;
            this.queueNext();
        }.bind(this));
    this.resourceStepper =
        new ResourceStepper(manager, resourcePrefix, this.lexicalOrder).
        on('error', function (error) {
            this.emit('error', error);
        }.bind(this)).
        on('end', function (error) {
            if (ITRACE) {
                ITRACE("importer end resources");
            }

            this.waitInfo = false;
            this.endInfos = true;
            this.queueNext();
        }.bind(this)).
        on('result', function (path, info) {
            if (ITRACE) {
                ITRACE("importer resource result", path);
            }

            this.info = info;
            this.rpath = path;
            this.waitInfo = false;
            this.queueNext();
        }.bind(this));

    if (opts && opts.batcher) {
        this.batcher = manager.newResourceBatcher(opts.batcher).
            on('error', function (error) {
                this.emit('error', error);
            }.bind(this));
    }
    else {
        this.batcher = null;
    }

    if (opts && opts.newVersion) {
        this.newVersion = "" + opts.newVersion;
    }

    this.jobs = new dinfra.Jobs({
            limit: opts && opts.concurrency || (this.batcher ? 1 : 6),
        }).
        on('error', function (error) {
            this.emit('error', error);
        }.bind(this));

    this.info = null;
    this.rpath = null;
    this.stat = null;
    this.path = null;
    this.endFiles = false;
    this.endInfos = false;
    this.lastInfos = false;
    this.stats = {
            entries: 0, // total number of entries
            changes: 0, // total number of changes
            link: 0, // number of symlink resources created
            relink: 0, // number of symlink resources relinked
            terminate: 0, // number of versioned resources terminated
            destroy: 0, // number of resources destroyed
            import: 0, // number of resource contents importer
            update: 0, // number of resource contents changed
            content: 0, // content bytes transferred
        };
    this.waitNext = true; // waiting for the caller to invoke next()
    this.waitFile = false; // waiting for the fileStepper to queueNext()
    this.waitInfo = false; // waiting for the resourceStepper to queueNext()
    this.extensions = []; // extensions to check for
}

/**
 * Derives an optional Content-Type header given a full resource path name.
 * It is always preferable to provide an explicit content type rather than
 * rely on this.
 */
ResourceImporter.prototype.deriveContentType = function (path) {
    var i = 0;
    var extension = null;

    while ((i < this.extensions.length) &&
            !((path.indexOf((extension = this.extensions[i]).prefix) == 0) &&
            extension.pattern.test(path))) {
        extension = null;
        i++;
    }

    return (extension ? extension.type : null);
}

/**
 * Add a content-type default for the given resource path prefix
 * and pattern.  If pattern is not a regular expression, it will be
 * treated as a simple text suffix to match.  The type should be
 * a full valid MIME content-type header (including optional charset).
 */
ResourceImporter.prototype.addExtensionMapping = function (prefix,
        pattern, type) {
    if (pattern instanceof RegExp) {
        // OK
    }
    else {
        pattern = new RegExp(denum.escapeRegExp(pattern) + "$");
    }

    this.extensions.push({ prefix: prefix, pattern: pattern, type: type });
}

/**
 * Add a map of text suffixes to content-types as extension mappings
 * for the given prefix (via addExtensionMapping).
 */
ResourceImporter.prototype.addExtensionMap = function (prefix, map) {
    for (var text in map) {
        this.addExtensionMapping(prefix, text, map[text]);
    }
}

/**
 * @private
 */
ResourceImporter.prototype.deriveOpEvent = function (event) {
    if (event.stat == null) {
        if (event.info.type == exports.RTYPE.DIR) {
            event.op = "ignore";
        }
        else if (this.newVersion) {
            event.op = "terminate";
        }
        else {
            event.op = "destroy";
        }
    }
    else if (event.stat.isDirectory()) {
        event.op = "ignore";
    }
    else if (event.stat.isSymbolicLink()) {
        if (event.info == null) {
            event.op = "link";
        }
        else if (event.info.link == event.stat.target) {
            event.op = "skip";
        }
        else if (this.newVersion) {
            event.op = "link";
        }
        else {
            event.op = "relink";
        }
    }
    else if (event.info == null) {
        event.op = "import";
    }
    else if (event.etag != null) {
        if (event.info.meta &&
                event.info.meta.headers && 
                (event.etag == event.info.meta.headers.etag)) {
            event.op = "skip";
        }
        else if (this.newVersion) {
            event.op = "import";
        }
        else {
            event.op = "update";
        }
    }
    else if (event.info.modified != event.stat.mtime.getTime()) {
        event.op = "compare";
    }
    else if (event.info.size != event.stat.size) {
        event.op = "compare";
    }
    else {
        event.op = "skip";
    }
}

/**
 * Attempt to match and drive the next entry.
 * @private
 */
ResourceImporter.prototype.queueNext = function () {
    if (ITRACE) {
        ITRACE("importer queue");
    }

    if (this.waitNext) {
        // wait until the consumer calls next()
        if (ITRACE) {
            ITRACE("importer   wait consumer");
        }
    }
    else if (!this.endInfos && (this.info == null)) {
        if (!this.waitInfo) {
            // do nothing
            if (ITRACE) {
                ITRACE("importer   call resourceStepper next");
            }

            this.waitInfo = true;

            this.resourceStepper.next();
        }
        else {
            if (ITRACE) {
                ITRACE("importer   wait resourceStepper");
            }
        }
    }
    else if (!this.endFiles && (this.stat == null)) {
        if (!this.waitFile) {
            if (ITRACE) {
                ITRACE("importer   call fileStepper next");
            }

            this.waitFile = true;
            this.fileStepper.next();
        }
        else {
            if (ITRACE) {
                ITRACE("importer   wait fileStepper");
            }
        }
    }
    else if ((this.info == null) && (this.stat == null)) {
        if (ITRACE) {
            ITRACE("importer   end both");
        }

        if (this.endQueued) {
            // ignore
        }
        else {
            this.endQueued = true;

            this.jobs.drain(function () {
                    if (this.batcher == null) {
                        this.emit('end', null);
                    }
                    else {
                        this.batcher.flush(function () {
                                this.emit('end', null);
                            }.bind(this));
                    }
                }.bind(this));
        }
    }
    else {
        if (ITRACE) {
            ITRACE("importer   item");
        }

        var event = {
            };

        if (this.stat == null) {
            event.path = this.rpath;
            event.info = this.info;
        }
        else if (this.info == null) {
            event.path = this.path;
            event.stat = this.stat;
        }
        else if (this.path < this.rpath) {
            event.stat = this.stat;
            event.etag = this.etag; // can be null for many reasons
        }
        else if (this.path > this.rpath) {
            event.info = this.info;
        }
        else {
            event.stat = this.stat;
            event.etag = this.etag; // can be null for many reasons
            event.info = this.info;
        }

        if (event.info) {
            event.path = this.rpath;
        }
        else {
            event.path = this.path;
        }

        this.deriveOpEvent(event);

        if ((event.op == "compare") && (event.etag == null)) {
            var stream = this.fileStepper.openReadable(event.path);
            var hash = crypto.createHash("sha1");

            // pause the delivery for now
            this.waitNext = true;

            stream.
                on('error', function (error) {
                    this.emit('error', error);
                }.bind(this)).
                on('data', function (data) {
                    hash.update(data);
                }.bind(this)).
                on('end', function () {
                    this.etag = '"' + hash.digest('hex') + '"';
                }.bind(this)).
                // Very important to do the queue next on the end,
                // otherwise you can end up with too many open files.
                on('close', function () {
                    // unpause the delivery (just wrap around into this
                    // function again).
                    this.waitNext = false;

                    this.queueNext();
                }.bind(this));
        }
        else {
            if (event.stat != null) {
                // clear the prior file stream entry to prime next
                this.path = null;
                this.stat = null;
                this.etag = null;
            }

            if (event.info != null) {
                // clear the prior resource stream entry to prime next
                this.rpath = null;
                this.info = null;
            }

            this.waitNext = true;
            this.stats["entries"]++;

            this.emit('result', event);
        }
    }
}

/**
 * Use next() to ask the importer for the next item to synchronize.
 * If there is another item to synchronize, it will be notified with
 * the [result]{@link ResourceImporter#event:result} event, otherwise the
 * [end]{@link ResourceImporter#event:end} event
 * will be raised.
 */
ResourceImporter.prototype.next = function () {
    this.waitNext = false;
    this.queueNext();
}

/**
 * Call applyStatEvent() to ask the importer to perform the synchronization
 * suggested by the [result]{@link ResourceImporter#event:result}.  The importer
 * will perform the operation with concurrency.  It will manage the calling
 * of [next()]{@link ResourceImporter#next} at appropriate times to keep
 * jobs going in parallel.  Do not call next() if you call applyStatEvent.
 * @param event - a result event object.
 */
ResourceImporter.prototype.applyStatEvent = function (event) {
    if (event.op == "ignore") {
        return (this.next());
    }

    if (event.op == "skip") {
        return (this.next());
    }

    var fnName = "apply" + event.op[0].toUpperCase() + event.op.substr(1);

    if (this.batcher) {
        fnName += "Batch";
    }

    var fn = this[fnName];

    if (fn == null) {
        throw new denum.StateError("unknown op: " + event.op +
            " needs function " + fnName);
    }

    // this is something we make a job for.
    return (this.jobs.submit(function (callback) {
            /*
                This will callback to the jobs handler when the
                job has completed.
            */
            return (fn.call(this, event, function (error) {
                    if (error != null) {
                        return (callback(error));
                    }

                    if (this.stats[event.op] == null) {
                        return (callback(
                            new denum.StateError("untracked op " +
                            event.op + ", please add to " +
                            "ResourceImporter.stats")));
                    }

                    this.stats[event.op]++;
                    this.stats["changes"]++;

                    return (callback());
                }.bind(this)));
        }.bind(this),
        function (error) {
            /*
                The jobs handler will call this when there is space in
                the queue again.
            */
            if (error != null) {
                this.emit('error', error);
            }
            else {
                this.next();
            }
        }.bind(this)));
}

ResourceImporter.prototype.applyResourceDefaults =
        function (event, resource, callback) {
    //reset the modified time to the origin file time.
    resource.setModified(event.stat.mtime.getTime());
    resource.setExecutable((event.stat.mode & (1<<6)) != 0);

    if (resource.getHeader("Content-Type") == null) {
        var type = this.deriveContentType(event.path);

        if (type != null) {
            resource.setHeader("Content-Type", type);
        }
    }

    callback();
}

ResourceImporter.prototype.buildResourceHeaders = function (event) {
    var headers = { };

    // @todo need to allow event to override resource content-type
    // @todo also need to abstract this logic into one shared fn.
    var type = this.deriveContentType(event.path);

    if (type != null) {
        headers["content-type"] = type;
    }

    if (event.stat && event.stat.headers) {
        for (var name in event.stat.headers) {
            // note no-locale use of toLowerCase
            headers[name.toLowerCase()] = event.stat.headers[name];
        }
    }

    // override anything supplied by the caller for these two ...
    // ... this forces re-evaluation.
    headers.etag = ""; // update the etag
    headers["content-length"] = 0; // update the content length

    return (headers);
}

ResourceImporter.prototype.applyImportBatch = function (event, callback) {
    var modified = event.stat.mtime.getTime();

    this.stats.content += event.stat.size;

    var name = this.resourcePrefix + event.path;
    var headers = this.buildResourceHeaders(event);

    this.batcher.insert({ // rinfo/hint structure for batch import:
            name: name,
            created: modified,
            modified: modified,
            adjusted: modified,
            version: this.newVersion,
            size: event.stat.size,
            meta: {
                headers: headers,
            }
        },
        function () { // content stream function
            return (this.fileStepper.openReadable(event.path));
        }.bind(this),
        callback);
}

ResourceImporter.prototype.applyLinkBatch = function (event, callback) {
    var modified = event.stat.mtime.getTime();
    var name = this.resourcePrefix + event.path;

    this.batcher.link({ // rinfo/hint structure for batch import:
            name: name,
            type: exports.RTYPE.LINK,
            created: modified,
            modified: modified,
            adjusted: modified,
            version: this.newVersion,
            link: event.stat.target,
            change: 0,
        },
        callback);
}

ResourceImporter.prototype.applyRelinkBatch = function (event, callback) {
    var modified = event.stat.mtime.getTime();
    var name = this.resourcePrefix + event.path;

    this.batcher.relink({ // rinfo/hint structure for batch import:
            name: name,
            id: event.info.id,
            type: exports.RTYPE.LINK,
            created: event.info.created,
            modified: event.info.modified,
            adjusted: modified,
            version: this.newVersion,
            link: event.stat.target,
            change: event.info.change,
        },
        callback);
}

ResourceImporter.prototype.applyImport = function (event, callback) {
    return (dinfra.invokeResource(this.resourcePrefix + event.path, {
            create: true,
            version: this.newVersion,
        },
        function (resource, callback) {
            if (resource == null) {
                return (callback(new Error("create resource cannot be null: " +
                    event.path)));
            }

            callback = denum.singleCallback(callback);

            if (event.stat && event.stat.headers) {
                for (var name in event.stat.headers) {
                    resource.setHeader(name, event.stat.headers[name]);
                }
            }

            var writable = resource.openWritable({
                    etag: true,
                    headers: true,
                    created: event.stat.mtime.getTime(),
                }).
                on('error', callback).
                on('finish', function () {
                    this.stats.content += resource.size;

                    return (this.applyResourceDefaults(event,
                        resource, callback));
                }.bind(this));

            var readable = this.fileStepper.openReadable(event.path);

            return (readable.
                on('error', callback).
                pipe(writable));
        }.bind(this),
        callback));
}

ResourceImporter.prototype.applyRelink = function (event, callback) {
    return (dinfra.invokeResource(this.resourcePrefix + event.path, {
            writable: true,
            version: this.newVersion,
        },
        function (resource, callback) {
            if (resource == null) {
                return (callback(new Error("create resource cannot be null: " +
                    event.path)));
            }

            resource.link = event.stat.target;
            resource.change++;

            return (callback());
        }.bind(this),
        callback));
}

ResourceImporter.prototype.applyLink = function (event, callback) {
    return (dinfra.invokeResource(this.resourcePrefix + event.path, {
            create: true,
            link: event.stat.target,
            version: this.newVersion,
        },
        function (resource, callback) {
            if (resource == null) {
                return (callback(new Error("create resource cannot be null: " +
                    event.path)));
            }

            return (callback());
        }.bind(this),
        callback));
}

ResourceImporter.prototype.applyUpdateBatch = function (event, callback) {
    var headers = this.buildResourceHeaders(event);

    this.batcher.update({ // rinfo/hint structure for batch import:
            id: event.info.id,
            name: event.info.name,
            version: event.info.version,
            type: event.info.type,
            created: event.info.created,
            modified: event.stat.mtime.getTime(),
            adjusted: event.stat.mtime.getTime(),
            size: event.stat.size,
            executable: ((event.stat.mode & (1<<6)) != 0),
            change: event.info.change,
            meta: {
                headers: headers,
            }
        },
        function () { // content stream function
            return (this.fileStepper.openReadable(event.path));
        }.bind(this),
        callback);
}

ResourceImporter.prototype.applyTerminate = function (event, callback) {
    return (dinfra.invokeResource(this.resourcePrefix + event.path, {
            terminate: true,
            branch: event.info.version,
            version: this.newVersion,
        },
        function (resource, callback) {
            if (resource == null) {
                return (callback(new denun.StateError(
                    "existing resource cannot be null: " + event.path)));
            }

            return (callback());
        },
        callback));
}

ResourceImporter.prototype.applyTerminateBatch = function (event, callback) {
    this.batcher.terminate({ // rinfo/hint structure for batch import:
            name: event.info.name,
            branch: event.info.version,
            version: this.newVersion,
        },
        callback);
}

ResourceImporter.prototype.applyUpdate = function (event, callback) {
    return (dinfra.invokeResource(this.resourcePrefix + event.path, {
            writable: true,
            version: event.info.version,
        },
        function (resource, callback) {
            if (resource == null) {
                return (callback(new denum.StateError(
                    "existing resource cannot be null: " + event.path)));
            }

            callback = denum.singleCallback(callback);

            return (this.fileStepper.openReadable(event.path).
                on('error', callback).
                pipe(resource.openWritable({
                    etag: true,
                    headers: true,
                }).
                on('error', callback).
                on('finish', function () {
                    this.stats.content += resource.size;

                    //reset the modified time to the origin file time.
                    resource.setModified(event.stat.mtime.getTime());
                    resource.setExecutable((event.stat.mode & (1<<6)) != 0);

                    return (callback());
                }.bind(this))));
        }.bind(this),
        callback));
}

ResourceImporter.prototype.applyDestroyBatch = function (event, callback) {
    this.batcher.delete(event.info, callback);
}

ResourceImporter.prototype.applyDestroy = function (event, callback) {
    dinfra.destroyResource(this.resourcePrefix + event.path, null, callback);
}

/**
 * Generate some statistics, including job concurrency, processing
 * rates and so on.
 */
ResourceImporter.prototype.generateStats = function () {
    var stats = this.jobs.generateStats();
    var elapsed = stats.elapsed.value;

    for (var name in this.stats) {
        stats[name] = this.stats[name];
    }

    stats.contentRate = {
            value: Math.floor(stats.content / elapsed) / 1e3,
            measure: "MB/s"
        };
    stats.entryRate = {
            value: Math.floor(stats.entries / (elapsed / 1e3)),
            measure: "/s"
        };

    return (stats);
}

util.inherits(ResourceStepper, events.EventEmitter);

function ResourceStepper(manager, resourcePrefix, lexicalOrder) {
    events.EventEmitter.call(this);

    this.seq = ResourceStepper.seqCount++;

    if (STRACE) {
        this.trace = STRACE.bind(null, this.seq);
        this.trace("prefix", resourcePrefix, "lexical", lexicalOrder);
    }

    this.manager = manager;
    this.queries = []; // a list of tree-traversal queries
    this.ahead = {}; // a map of current lookahead queries
    this.count = 0; // count of current lookahead queries
    this.limit = 10; // limit of lookahead queries
    this.dirs = []; // known dirs available for look-ahead (sorted)
    this.waitNext = true;
    this.resourcePrefix = resourcePrefix;
    this.prefixLength = resourcePrefix.length;
    this.lexicalOrder = !!lexicalOrder;
    this.pushQueryPrivate(resourcePrefix);
}

/**
 * For keeping track of specific instances.
 */
ResourceStepper.seqCount = 0;

ResourceStepper.prototype.queueNext = function () {
    if (STRACE) {
        this.trace("queue", "called");
    }

    if (this.waitNext) {
        return;
    }

    if (this.queries.length == 0) {
        if (STRACE) {
            this.trace("queue", "end");
        }

        return (this.emit('end'));
    }

    if (STRACE) {
        this.trace("queue", "query#", this.queries.length - 1);
    }

    return (this.queries[this.queries.length - 1].next());
}

ResourceStepper.prototype.next = function () {
    if (STRACE) {
        this.trace("next", "called");
    }

    if (this.waitNext) {
        this.waitNext = false;

        if (STRACE) {
            this.trace("next", "wait cleared");
        }
    }

    return (this.queueNext());
}

ResourceStepper.prototype.postResultPrivate = function (result) {
    var path = result.name.substring(this.prefixLength);

    if (!this.waitNext) {
        if (STRACE) {
            this.trace("post", "wait set");
        }

        this.waitNext = true;
    }
    else {
        if (STRACE) {
            this.trace("post", "wait already set");
        }
    }

    // this must always go before event delivery ...
    if (!this.lexicalOrder) {
        if (result.type == exports.RTYPE.DIR) {
            if (STRACE) {
                this.trace("post", "push dir query");
            }

            this.pushQueryPrivate(result.name);
        }
    }

    // this can wait until the end because its state is already captured 
    return (this.emit('result', path, result));
}

ResourceStepper.prototype.newQueryPrivate = function (parentName) {
    var query = this.manager.newResourceQuery();
    var trace;

    if (STRACE) {
        trace = this.trace.bind(this, "query", parentName);
        trace("new");
    }

    if (this.lexicalOrder) {
        query.
            withNoBatching().
            withNamePrefix(parentName).
            withOrderByName(true); // ascending
    }
    else {
        query.
            withParentName(parentName).
            withOrderBySegment(true); // ascending
    }

    query.withAllTypes();

    query.on('error', function (error) {
            if (STRACE) {
                trace("error", error);
            }

            return (this.emit('error', error));
        }.bind(this));

    query.on('result', function (result) {
            if (STRACE) {
                trace("result", result.id, "name",
                    result.name.substr(parentName.length + 1));
            }

            if (parentName in this.ahead) {
                throw new denum.StateError("never called query.next()");
            }

            if (!this.lexicalOrder) {
                if (result.type == exports.RTYPE.DIR) {
                    denum.stringSort(this.dirs, result.name);
                    // invoke any queued queries for look ahead if available
                    this.shiftAhead();
                }
            }

            return (this.postResultPrivate(result));
        }.bind(this));

    query.on('end', function () {
            if (STRACE) {
                trace("end");
            }

            if (parentName in this.ahead) {
                throw new denum.StateError("never called query.next()");
            }

            this.queries.pop();

            if (this.queries.length == 0) {
                return (this.emit('end'));
            }

            // waitNext must have been cleared, so call it again
            return (this.next());
        }.bind(this));

    query.start();

    return (query);
}

/**
 * shiftAhead can be called at any time to take the queued dirs
 * and invoke a look ahead query on them, in the required order.
 * This is only useful in non-lexical order mode, but may be
 * called regardless.
 */
ResourceStepper.prototype.shiftAhead = function () {
    while (this.dirs.length && (this.count < this.limit)) {
        var dirName = this.dirs.shift(); // get sorted first

        if (STRACE) {
            this.trace("push", "new ahead query", dirName);
        }

        this.ahead[dirName] = this.newQueryPrivate(dirName);
        this.count++;
    }
}

ResourceStepper.prototype.pushQueryPrivate = function (parentName) {
    var query = this.ahead[parentName];

    if (query == null) {
        var index = denum.stringSearch(this.dirs, parentName);

        if (index >= 0) {
            if (STRACE) {
                this.trace("push", "clear pending dir", parentName);
            }

            this.dirs.splice(index, 1);
        }

        if (STRACE) {
            this.trace("push", "fresh query", parentName);
        }

        query = this.newQueryPrivate(parentName);
    }
    else {
        if (STRACE) {
            this.trace("push", "join ahead query", parentName);
        }

        delete this.ahead[parentName];
        --this.count;

        this.shiftAhead(); // invoke any queued queries for look ahead
    }

    this.queries.push(query);

    // nothing further here - no events/callbacks
}

exports.ResourceStepper = ResourceStepper;

/**
 * The ResourceBatcher allows batch manipulation of resources in
 * those situations where performance is key.
 * Use the insert, delete, update and upsert functions to
 * manipulate storage of resources.  Each takes a callback
 * which will come back immediately if it just adds to the batch
 * and will come back later if it actually invokes a batch operation.
 * The flush function can be called at any time to flush all pending
 * operations to storage - its callback will be invoked once all
 * pending operations are complete.  This model allows resource
 * batch operations to rate control invocation, if desired.
 * The insert, update and upsert functions also take a content
 * generator function - this must be null if not desired.  If it is
 * not null, it will be called during the flushing process to open
 * a Readable stream of content (assumed auto-closing).  This allows
 * very large numbers of queued operations, without consuming file
 * descriptors in the process.
 * @class ResourceBatcher
 * @extends EventEmitter
 * @fires error - when a non-recoverable failure occurs
 */
util.inherits(ResourceBatcher, events.EventEmitter);

function ResourceBatcher(manager, opts) {
    events.EventEmitter.call(this);

    this.manager = manager;

    /**
     * Unique id within process for this batcher.
     */
    this.seq = ResourceBatcher.seqCount++;

    if (BTRACE) {
        this.trace = BTRACE.bind(null, this.seq);

        this.trace("created", opts);
    }

    /**
     * The queue of operations that have been accrued (not in the
     * process of being flushed, but may be pending).
     * @private
     */
    this.queue = [];

    /**
     * True when a flush is in progress.
     * @private
     */
    this.flushing = false; // is there anything flushing right now

    /**
     * True when the queue length is non-zero and there is already
     * a flush in progress.
     * @private
     */
    this.pending = false; // is there a pending flush requested 

    /**
     * The default batch size (how large the queue gets before it is purged).
     * @private
     */
    this.batchSize = opts.opBatchSize || 512;

    /**
     * True during the transactional part of the flush.
     * @private
     */
    this.flushTransacting = false;
}

/**
 * Next unique id to allocate in process.
 */
ResourceBatcher.seqCount = 0;

ResourceBatcher.prototype.postErrorProtected = function (error) {
    if (error == null) {
        throw new RangeError("error cannot be null");
    }

    this.emit('error', error);

    if (this.connection != null) {
        var connection = this.connection;

        this.connection = null;

        if (this.flushTransacting) {
            this.flushTransacting = false;
            connection.cancel(); // transactional rollback
        }

        connection.close(function (error) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
            }.bind(this));
    }
}

/**
 * Flush the queue, or if the queue is already being flushed, mark the
 * queue as pending a flush.
 */
ResourceBatcher.prototype.flushPrivate = function () {
    var flushInvoked = false;

    if (!this.pending && (this.queue.length > 0)) {
        this.pending = true;
    }

    if (this.flushing) {
        // do nothing
    }
    else if (this.pending) {
        var now = Date.now();
        /**
         * This object "flushOperations", provides a list of
         * operations that will be applied in the implementation
         * order listed below.  The batched events that we
         * receive can result in multiple operations being
         * orchestrated across these database phases.
         */
        var flushOperations = {
                // transactional operations in implemented order:
                delete: { count: 0, list: [], },
                insert: { count: 0, list: [], },
                parent: { count: 0, list: [], }, // synthetic
                update: { count: 0, list: [], },
                upsert: { count: 0, list: [], },
                // non-transactional operations in implemented order: 
                content: { count: 0, list: [], }, // synthetic
                header: { count: 0, list: [], }, // synthetic
                meta: { count: 0, list: [], }, // synthetic
            };

        var queue = this.queue;

        if (queue.length > this.batchSize) {
            queue = queue.splice(0, this.batchSize);
        }
        else {
            this.queue = [];
        }

        var parentNames = {};

        queue.forEach(function (operation) {
                if (!(operation.op in flushOperations)) {
                    throw new Error("invalid operation: " + operation.op);
                }

                flushOperations[operation.op].list.push(operation);

                if (operation.content != null) {
                    flushOperations.content.list.push(operation);
                    flushOperations.header.list.push(operation);
                }

                flushOperations.meta.list.push(operation);
            });

        flushOperations.insert.list.forEach(function (operation) {
                var name = operation.rinfo.name;
                var pname;

                while (((pname = getParentNameOf(name)) != name) &&
                        !(pname in parentNames)) {
                    parentNames[pname] = true;
                    name = pname;
                }
            });

        for (var name in parentNames) {
            flushOperations.parent.list.push({
                    op: 'parent',
                    rinfo: {
                        name: name,
                        type: exports.RTYPE.DIR,
                        created: now,
                        modified: now,
                        adjusted: now,
                    }
                });
        }

        this.pending = (this.queue.length > 0);
        this.flushing = true;
        this.flushOperations = flushOperations;

        this.emit('flushing');

        flushInvoked = true;

        this.queueOpenTXProtected(function (error, connection) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
                else {
                    this.connection = connection;
                    this.flushTransacting = true;
                    this.queueDeletesProtected();
                }
            }.bind(this));
    }
    else {
        this.emit('flushed');
    }

    return (flushInvoked);
}

ResourceBatcher.prototype.flush = function (callback) {
    if (callback === undefined) {
        return (Q.ninvoke(this, "flush"));
    }

    this.flushPrivate();

    if (callback != null) {
        if (this.flushing) {
            this.once('flushed', callback);
        }
        else {
            callback();
        }
    }
}

ResourceBatcher.prototype.flushContentsProtected = function (connection,
        batch, callback) {
    throw new denum.UnsupportedError();
}

ResourceBatcher.prototype.flushDeletesProtected = function (connection, list,
        callback) {
    throw new denum.UnsupportedError();
}

ResourceBatcher.prototype.flushInsertsProtected = function (connection, list,
        callback) {
    throw new denum.UnsupportedError();
}

ResourceBatcher.prototype.flushUpdatesProtected = function (connection, list,
        callback) {
    throw new denum.UnsupportedError();
}

ResourceBatcher.prototype.flushUpsertsProtected = function (connection, list,
        callback) {
    throw new denum.UnsupportedError();
}

ResourceBatcher.prototype.queueOpenTXProtected = function () {
    this.manager.writableGroup.openTransaction(function (error, conn) {
            if (error != null) {
                this.postErrorProtected(error);
            }
            else {
                this.connection = conn;
                this.queueDeletesProtected();
            }
        }.bind(this));
}

ResourceBatcher.prototype.queueDeletesProtected = function () {
    var batch = this.flushOperations.delete;

    if (batch.count == batch.list.length) {
        this.queueInsertsProtected();
    }
    else {
        this.flushDeletesProtected(this.connection, batch,
            function (error) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
                else {
                    batch.count = batch.list.length;
                    this.queueInsertsProtected();
                }
            }.bind(this));
    }
}

ResourceBatcher.prototype.queueInsertsProtected = function () {
    var batch = this.flushOperations.insert;

    if (batch.count == batch.list.length) {
        this.queueParentsProtected();
    }
    else {
        this.flushInsertsProtected(this.connection, batch,
            function (error) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
                else {
                    batch.count = batch.list.length;
                    this.queueParentsProtected();
                }
            }.bind(this));
    }
}

ResourceBatcher.prototype.queueParentsProtected = function () {
    var batch = this.flushOperations.parent;

    if (batch.count == batch.list.length) {
        this.queueUpdatesProtected();
    }
    else {
        this.flushParentsProtected(this.connection, batch,
            function (error) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
                else {
                    batch.count = batch.list.length;
                    this.queueUpdatesProtected();
                }
            }.bind(this));
    }
}

ResourceBatcher.prototype.queueUpdatesProtected = function () {
    var batch = this.flushOperations.update;

    if (batch.count == batch.list.length) {
        this.queueUpsertsProtected();
    }
    else {
        this.flushUpdatesProtected(this.connection, batch,
            function (error) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
                else {
                    batch.count = batch.list.length;
                    this.queueUpsertsProtected();
                }
            }.bind(this));
    }
}

ResourceBatcher.prototype.queueUpsertsProtected = function () {
    var batch = this.flushOperations.upsert;

    if (batch.count == batch.list.length) {
        this.queueCloseTXProtected();
    }
    else {
        this.flushUpsertsProtected(this.connection, batch,
            function (error) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
                else {
                    batch.count = batch.list.length;
                    this.queueCloseTXProtected();
                }
            }.bind(this));
    }
}

ResourceBatcher.prototype.queueCloseTXProtected = function () {
    var connection = this.connection;

    this.connection = null;
    this.flushTransacting = false;

    connection.close(function (error) {
            if (error != null) {
                if (error.deadlock || error.lockwait) {
                    // reset counts and try again ...
                    for (var name in this.flushOperations) {
                        this.flushOperations[name].count = 0;
                    }

                    this.queueOpenTXProtected();
                }
                else {
                    this.postErrorProtected(error);
                }
            }
            else {
                this.queueOpenDBProtected();
            }
        }.bind(this));
}

ResourceBatcher.prototype.queueOpenDBProtected = function () {
    this.manager.writableGroup.openConnection(function (error, conn) {
            if (error != null) {
                this.postErrorProtected(error);
            }
            else {
                this.connection = conn;
                this.queueContentsProtected();
            }
        }.bind(this));
}

ResourceBatcher.prototype.queueContentsProtected = function () {
    var batch = this.flushOperations.content;

    if (batch.count == batch.list.length) {
        this.queueHeadersProtected();
    }
    else {
        this.flushContentsProtected(this.connection, batch,
            function (error) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
                else {
                    batch.count = batch.list.length;
                    this.queueHeadersProtected();
                }
            }.bind(this));
    }
}

ResourceBatcher.prototype.queueHeadersProtected = function () {
    var batch = this.flushOperations.header;

    if (batch.count == batch.list.length) {
        this.queueMetasProtected();
    }
    else {
        this.flushHeadersProtected(this.connection, batch,
            function (error) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
                else {
                    batch.count = batch.list.length;
                    this.queueMetasProtected();
                }
            }.bind(this));
    }
}

ResourceBatcher.prototype.queueMetasProtected = function () {
    var batch = this.flushOperations.meta;

    if (batch.count == batch.list.length) {
        this.queueCloseDBProtected();
    }
    else {
        this.flushMetasProtected(this.connection, batch,
            function (error) {
                if (error != null) {
                    this.postErrorProtected(error);
                }
                else {
                    batch.count = batch.list.length;
                    this.queueCloseDBProtected();
                }
            }.bind(this));
    }
}

ResourceBatcher.prototype.queueCloseDBProtected = function () {
    var connection = this.connection;

    this.connection = null;

    connection.close(function (error) {
            this.connection = null;

            if (error != null) {
                this.postErrorProtected(error);
            }
            else {
                this.queueEndProtected();
            }
        }.bind(this));
}

/**
 * Called after all operations and related content (apart from that on
 * the queue) have been flushed to persistent storage.
 */
ResourceBatcher.prototype.queueEndProtected = function () {
    this.flushOperations = null;
    this.flushing = false;
    this.flushPrivate();
}

/**
 * An internal functions that pushes an operation to the queue,
 * and may intermittently batch operations in the queue to the server.
 */
ResourceBatcher.prototype.queueOp = function (op, rinfo, content, callback) {
    var operation = { op: op, rinfo: rinfo, content: content };

    this.queue.push(operation);

    var flushInvoked;

    if (this.queue.length >= this.batchSize) {
        flushInvoked = this.flushPrivate();
    }

    if (callback != null) {
        if (!flushInvoked) {
            callback();
        }
        else {
            this.flush(callback); // consider us full, wait for the flush.
        }
    }

    return (flushInvoked);
}

ResourceBatcher.prototype.delete = function (rinfo, callback) {
    return (this.queueOp('delete', rinfo, null, callback));
}

ResourceBatcher.prototype.insert = function (rinfo, content, callback) {
    return (this.queueOp('insert', rinfo, content, callback));
}

ResourceBatcher.prototype.update = function (rinfo, content, callback) {
    return (this.queueOp('update', rinfo, content, callback));
}

ResourceBatcher.prototype.upsert = function (rinfo, content, callback) {
    return (this.queueOp('upsert', rinfo, content, callback));
}

ResourceBatcher.prototype.link = function (rinfo, callback) {
    return (this.queueOp('insert', rinfo, null, callback));
}

ResourceBatcher.prototype.relink = function (rinfo, callback) {
    return (this.queueOp('update', rinfo, null, callback));
}

exports.ResourceBatcher = ResourceBatcher;

/**
 * Takes a string and fixes up common equivalencies and other issues
 * to ensure that a path resolves to the correct internal form in the database.
 * This does not ensure that the path exists, just that it is a valid
 * form.  General rules for the form of a resource path:
 *
 * 1. The empty string is the valid root path.
 * 2. Any other path must begin with a slash.
 * 3. No path may end with a slash.
 * 4. No path may contain segments . or ..
 * 5. No path may contain empty segments (ie. no path may contain //)
 *
 * General conventions for transforming to a valid path:
 * 
 * + all paths are root relative (ie. there is no working directory)
 * + . and .. are resolved as per unix filesystem conventions
 * + trailing slashes are removed
 * + empty segments are collapsed
 *
 */
function normalizeResourceName(path) {
    if (path == null) { // or undefined
        path = "";
    }
    else if (typeof(path) !== "string") {
        path = path.toString();
    }

    // start with a convenient brace for the algorithm below
    path = "/" + path + "/";

    // replace all multiple slashes with single slashes
    path = path.replace(/\/\/+/g, "/");

    // replace all /./ sequences with /
    path = path.replace(/\/(\.\/)+/g, "/");

    var i;

    while ((i = path.indexOf("/../")) >= 0) {
        if (i == 0) {
            // replace initial /../ sequence with /
            path = path.substr(4);
        }
        else {
            // replace first /<segment>/../ sequence with /
            path = path.replace(/\/[^/]*\/\.\.\//, "/");
        }
    }

    path = path.replace(/\/$/, ""); // strip terminating slashes

    return (path);
}

exports.normalizeResourceName = normalizeResourceName;

/**
 * Returns true if the path hints that it is a directory.
 * This just returns true if the path ends with a forward slash.
 */
function dirHintResourceName(path) {
    return ((path == null) || (path.length == 0) || /\/$/.test(path));
}

exports.dirHintResourceName = dirHintResourceName;

exports.configure = function (dconfig) {
        var config = dconfig.dresource;

        if (config == null) {
            return;
        }

        TRACE = denum.configureTrace(TRACE, "dresource", config.trace);
        ITRACE = denum.configureTrace(ITRACE, "dresource.importer",
            config.itrace);
        STRACE = denum.configureTrace(STRACE, "dresource.stepper",
            config.strace);
        BTRACE = denum.configureTrace(BTRACE, "dresource.batcher",
            config.strace);
    };
