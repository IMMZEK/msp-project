// Copyright (C) 2016-2017 Texas Instruments Incorporated - http://www.ti.com/
const util = require('util');
const stream = require('stream');
const fs = require('fs');
const mod_path = require('path');
const crypto = require('crypto');
const denum = require('./denum');
const dschema = require('./dschema');
const dschema_file = require('./dschema_file');
const dresource = require('./dresource');
const dinfra = require('./dinfra');
const TRACE = null; // console.log; // set to console.log for trace

util.inherits(FileResourceManager, dresource.ResourceManager);

function FileResourceManager(logger, writableGroup, readableGroup,
        encryptManager, opts) {
    dresource.ResourceManager.call(this, logger, writableGroup,
        readableGroup, encryptManager, opts);
}

FileResourceManager.prototype.getContentPath = function (name) {
    var fileName = this.writableGroup.defaults.path + "/content";

    if (name.indexOf("/") != 0) {
        fileName += "/";
    }

    fileName += name;

    return (fileName);
}

FileResourceManager.prototype.openResource = function (name, opts, callback) {
    return (new FileResource(this, name, opts).openPrivate(callback));
}

FileResourceManager.prototype.getResourceSchema = function () {
    return (resourceSchema);
}

FileResourceManager.prototype.newResourceQuery = function () {
    return (new FileResourceQuery(this));
}

util.inherits(FileResource, dresource.Resource);

function FileResource(manager, name, opts) {
    if ((opts.branch != null) || (opts.version != null)) {
        throw new denum.StateError(
            "versions are not allowed with file-based resource layer engines");
    }

    dresource.Resource.call(this, manager, name, opts);
}

FileResource.prototype.updateMetaPrivate = function (tx, callback) {
    tx.conn.update(dresource.resourceTablePrefix, this.id, {
            meta: this.meta
        },
        function (error) {
            if (error != null) {
                return (callback(error));
            }

            callback();
        }.bind(this));
}

FileResource.prototype.updateHeaderPrivate = function (tx, callback) {
    tx.conn.update(dresource.resourceTablePrefix, this.id, {
            size: this.size,
            change: this.change,
            modified: this.modified
        },
        function (error) {
            if (error != null) {
                return (callback(error));
            }

            callback();
        }.bind(this));
}

FileResource.prototype.openReadable = function (opt) {
    return (fs.createReadStream(this.manager.getContentPath(this.name)));
}

util.inherits(FileResourceWritable, stream.Transform);

function FileResourceWritable(resource, writableGroup, fileName, opt) {
    stream.Transform.call(this);

    this.writableGroup = writableGroup;
    this.fileName = fileName;
    this.total = 0;
    this.resource = resource;
    // etag and headers stolen from dresource_sql ...
    this._etagAlgorithm = null;
    this._etagHash = null;
    this._headers = false;

    if (opt != null) {
        if (opt.etag == null) {
            this._etagAlgorithm = null;
        }
        else if (opt.etag == false) {
            this._etagAlgorithm = null;
        }
        else if (opt.etag == true) {
            // sufficient and short for non-crypto purposes
            this._etagAlgorithm = "sha1";
        }
        else {
            this._etagAlgorithm = opt.etag;
        }

        if (opt.headers) {
            this._headers = true;
        }
    }

    if (this._etagAlgorithm != null) {
        this._etagHash = crypto.createHash(this._etagAlgorithm);
    }

    var self = this;

    this.pause();

    var manager = this.resource.manager;
    var fullPath = manager.getContentPath(this.resource.name);
    var rootPath = manager.getContentPath("/");
    var subPath = mod_path.dirname(fullPath).substr(rootPath.length);

    denum.makeDirIn(rootPath, subPath, function (error) {
            if (error != null) {
                return (this.emit('error', error));
            }

            this.pipe(fs.createWriteStream(fileName, {
                    flags: 'w'
                }).
                on('error', this.emit.bind(this, 'error')).
                on('open', function () {
                    this.resume();
                }.bind(this)));
        }.bind(this));

    /*
        Note that this has to be on the finish for the transform,
        not on the lower level fs writable.
    */
    this.on('finish', function () {
            if (self._etagHash != null) {
                /**
                 * Because this is an HTTP header, not just a meta-data
                 * storage value, it actually contains the standard ETag
                 * formatting, which for a "Strongly Cacheable" entity,
                 * means putting the tag in double quotes, but omitting
                 * the leading "w/".
                 */
                self.resource.setHeader("ETag",
                    '"' + this._etagHash.digest('hex') + '"');
                self._etagHash = null;
            }

            if (self._headers) {
                // make sure this is called *after* setSize and
                // when modified is set.
                self.resource.updateHeaders();
            }

            self.resource.setSize(self.total);
        });
}

FileResourceWritable.prototype._transform = function (chunk, encoding,
        callback) {
    if (encoding != null) {
        chunk = new Buffer(chunk, encoding);
    }
    else if (chunk instanceof Buffer) {
        // OK
    }
    else {
        throw new denum.UnsupportedError("unsupported chunk type " +
            typeof(chunk));
    }

    this.total += chunk.length;

    if (this._etagHash != null) {
        this._etagHash.update(chunk);
    }

    this.push(chunk);

    callback();
}

FileResource.prototype.openWritableProtected = function (opt) {
    return (new FileResourceWritable(this, this.manager.writableGroup,
        this.manager.getContentPath(this.name), opt));
}

FileResource.prototype.relinkPrivate = function() {
    throw new denum.UnsupportedError();
}

FileResource.prototype.createPrivate = function(tx, callback) {
    var fileName = this.manager.getContentPath(this.name);

    this.modified = Date.now();
    this.created = this.modified;

    tx.conn.insert(dresource.resourceTablePrefix, {
            name: this.name,
            parent: this.getParentName(),
            segment: this.getSegment(),
            sparse: null,
            version: null,
            prev_version: null,
            encryption: null,
            material: null,
            type: this.type,
            size: this.size,
            modified: this.modified,
            created: this.created,
            change: this.change,
        }, function (error, result) {
            if (error != null) {
                return (callback(error));
            }

            this.id = result.id;

            callback();
        }.bind(this));
}

FileResource.prototype.deleteRecordsByIdsPrivate = function (conn,
        ids, callback) {
    conn.delete("dinfra_resource", ids, callback);
}

FileResource.prototype.deletePathsByIdsPrivate = function (paths, callback) {
    if (paths.length == 0) {
        return (callback());
    }

    var name = paths.splice(0, 1)[0];

    fs.unlink(this.manager.getContentPath(name), function (error) {
            if (error == null) {
                // everything as usual
                this.deletePathsByIdsPrivate(paths, callback);
            }
            else if (error.code == "ENOENT") {
                // ignore
                this.deletePathsByIdsPrivate(paths, callback);
            }
            else if (error.code == "ENOTDIR") {
                // ignore
                this.deletePathsByIdsPrivate(paths, callback);
            }
            else if (error.code == "EISDIR") {
                // special processing for 
                fs.unlink(this.manager.getContentPath(name), 
                    function () {
                        if (error == null) {
                            // everything as usual
                            this.deletePathsByIdsPrivate(paths, callback);
                        }
                        else if (error.code == "ENOENT") {
                            // ignore possible race condition
                            this.deletePathsByIdsPrivate(paths, callback);
                        }
                        else if (error.code == "ENOTDIR") {
                            // ignore possible race condition
                            this.deletePathsByIdsPrivate(paths, callback);
                        }
                        else {
                            // use the callback to propagate the error
                            callback(error);
                        }
                    });
            }
            else {
                // use the callback to propagate the error
                callback(error);
            }
        }.bind(this));
}

FileResource.prototype.deleteFilesByIdsPrivate = function (conn,
        ids, callback) {
    conn.fetch("dinfra_resource", ids, function (error, list) {
            if (error != null) {
                return (callback(error));
            }

            var paths = [];

            list.forEach(function (record) {
                    if (record != null) {
                        paths.push(record.name);
                    }
                });

            this.deletePathsByIdsPrivate(paths, callback);
        }.bind(this));
}

/**
 * Overrides the lower Resource layer to implement deleting by id
 * in the filesystem.  Note that opts.keep:true will skip deleting
 * the file, but will delete the entry.
 */
FileResource.prototype.deleteByIdsPrivate = function (tx, ids, callback) {
    if (ids instanceof Array) {
        // keep as is
    }
    else {
        ids = [ids]; // arrayify
    }

    if (!(callback instanceof Function)) {
        throw new RangeError("callback is not a function");
    }

    if (this.opts.keep) {
        this.deleteRecordsByIdsPrivate(tx.conn, ids, callback);
    }
    else {
        this.deleteFilesByIdsPrivate(tx.conn, ids, function (error) {
                if (error != null) {
                    return (callback(error));
                }

                this.deleteRecordsByIdsPrivate(tx.conn, ids, callback);
            }.bind(this));
    }
}

FileResource.prototype.nonTxDeleteByIdsPrivate = function (ids, callback) {
    // do nothing
    callback();
}
    
/**
 * This returns the local content path in the native filesystem - it is
 * only supported for file resources.
 */
FileResource.prototype.getContentPath = function () {
    return (this.manager.getContentPath(this.name));
}

util.inherits(FileResourceQuery, dresource.ResourceQuery);

function FileResourceQuery(manager) {
    dresource.ResourceQuery.call(this, manager, "id");
}

FileResourceQuery.prototype.withParentName = function (parent) {
    var f = this.f;

    this.withQueryExpr(f.eq(f.record("parent"), parent));

    return (this);
}

FileResourceQuery.prototype.newQueryJSON = function() {
    var f = this.f;

    if (!this.featureAllTypes) {
        this.withQueryExpr(f.eq(f.record("type"), dresource.RTYPE.FILE));
    }

    var queryJSON = dresource.ResourceQuery.prototype.newQueryJSON.call(this);

    return (queryJSON);
}

exports.newResourceManager = function (logger, writableGroup,
            readableGroup, encryptManager, opts) {
        return (new FileResourceManager(logger, writableGroup,
            readableGroup, encryptManager, opts));
    };
