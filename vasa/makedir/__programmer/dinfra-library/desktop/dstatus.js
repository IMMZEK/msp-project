// Copyright (C) 2015-2017 Texas Instruments Incorporated - http://www.ti.com/
/**
 * StatusResponder
 * @module dstatus
 */
const util = require('util');
const fs = require('fs');
const node_path = require('path');
const dinfra = require('./dinfra');
const denum = require('./denum');
const dhtml = require('./dhtml');
const djson = require('./djson');
const dadapter = require('./dadapter');
const dtopic = (dinfra.variant == "cloud") && require('./dtopic');
const logger = require('./dinfra').logger("dinfra/dstatus");

function StatusCheck(responder, name, callback) {
    this.responder = responder;
    this.name = name;
    this.responder.checks.push(this);
    this.callback = callback;
}

StatusCheck.prototype.invokeCheck = function (cached) {
    this.callback(function (error, json) {
            cached.completeCheck(this, json, error);
        }.bind(this));
}

function StatusCached(responder) {
    this.created = Date.now();
    this.expires = this.created + responder.cacheMS;
    this.json = {
            name: responder.name,
            version: responder.version,
            launched: {
                ms: responder.started,
                date: new Date(responder.started).toISOString()
            },
            generation: {
                ms: this.created,
                date: new Date(this.created).toISOString(),
                delay: null,
            },
            requested: {
                ms: null,
                date: null,
            },
            expires: {
                ms: this.expires,
                date: new Date(this.expires).toISOString(),
            },
            errors: [],
            checks: {}
        };
    this.responder = responder;
    this.waiters = [];
    this.checks = [];
    this.ready = false;

    // shallow clone of checks array
    for (var i = 0; i < responder.checks.length; i++) {
        this.checks.push(responder.checks[i]);
    }
}

StatusCached.prototype.completeCheck = function (check, json, error) {
    var i = this.checks.indexOf(check);

    if (i < 0) {
        var name;

        if (check == null) {
            name = "(undefined)";
        }
        else {
            name = check.name;
        }

        var message;

        if (this.responder.checks.indexOf(check) >= 0) {
            message = "implementation mistake: duplicate check response";
        }
        else {
            message = "implementation mistake: unknown check object";
        }

        this.json.errors.push({
                name: name,
                message: message,
                error: error
            });
    }
    else {
        this.checks.splice(i, 1);
        this.json.checks[check.name] = {
                status: (error != null ? "error" : "stable"),
                content: json,
            };

        if (error != null) { // record separately to error list
            this.json.errors.push({
                    name: check.name,
                    message: "check reported a failure",
                    error: error
                });
        }

        if (this.checks.length == 0) {
            this.ready = true;
            this.json.generation.delay = Date.now() - this.created;
            this.notifyWaiters();
        }
    }
}

StatusCached.prototype.startCheck = function (check) {
    setImmediate(function () {
            try {
                check.invokeCheck(this);
            }
            catch (e) {
                this.completeCheck(check, null, e);
            }
        }.bind(this));
}

StatusCached.prototype.fillCached = function () {
    for (var i = 0; i < this.checks.length; i++) {
        this.startCheck(this.checks[i]);
    }
}

StatusCached.prototype.notifyWaiters = function () {
    // this is written intentionally to be re-entrant - important
    while (this.waiters.length > 0) {
        this.waiters.splice(0, 1)[0](this);
    }
}

StatusCached.prototype.waitCached = function (waiter) {
    this.waiters.push(waiter);

    if (this.ready) {
        this.notifyWaiters();
    }
}

util.inherits(StatusResponder, dadapter.ServiceAdapter);

function StatusResponder(name, version) {
    dadapter.ServiceAdapter.call(this, "/status/");

    this.name = name;
    this.version = version;
    this.checks = [];
    this.lastServer = null;
    this.cached = null;
    this.cacheMS = 10e3;
    this.started = Date.now();
    this.statuses = 0;
    this.requests = 0;
    this.hasLogsView = false;
}

function LogResponse(requested, mode, path, request, response, error, logs) {
    this.requested = requested;
    this.mode = mode;
    this.path = path
    this.request = request;
    this.response = response;
    this.index = 0;
    this.inbandError = error;
    this.logs = logs;
    this.writer = null;
    this.context = null;
    this.synthMap = {};
    this.synthArray = [];

    this.response.setHeader("Content-Type", "application/json");
    /*
        @todo conditional support here for json stringification -
        do not want to serialize stack frames to non-admin users.
    */
    this.writer = new djson.Streamer(this.response, null, {
            strict: true, // no undefineds
            indent: 4 // in case someone wants to look at it
        });
    this.context = this.writer.beginMap(null, this.synthMap);
    this.writer.sendNamedValue(this.context, "error", this.inbandError, false);
    this.writer.sendNamedValue(this.context, "catalog", {
                priority: dlog.PRIORITY.list,
                facility: dlog.FACILITY.list
            }, false);
    this.writer.beginNamed(null, "logs", this.synthArray);
    this.writer.beginList(null, this.synthArray);

    this.writeBatch();
}

LogResponse.prototype.writeBatch = function () {
    var limit = Math.min(this.index + 256, this.logs.length);

    while (this.index < limit) {
        this.writer.sendValue(null, this.logs[this.index],
            (this.index == this.logs.length)); // is last

        this.index++;
    }

    if (this.index == this.logs.length) {
        this.writer.endList(this.context, this.synthArray, true);
        this.writer.endNamed(this.context, this.synthArray, true);
        this.writer.endMap(null, this.synthMap);
        this.writer.flush(function (error) {
                this.close(error);
            }.bind(this));
    }
    else {
        this.writer.flush(function (error) {
                if (error != null) {
                    this.close(error);
                }
                else {
                    this.writeBatch();
                }
            }.bind(this));
    }
}

LogResponse.prototype.close = function (error) {
    if (error != null) {
        logger.warning("status responder", {
                error: error,
            });
    }

    this.response.end(); // no wait, we're done
}

StatusResponder.prototype.queryLogs = function (requested, mode, path,
        request, response, buffer) {
    var params;
    var logs = [];

    if (buffer == null) {
        params = { last: 12 };
    }
    else {
        params = JSON.parse(buffer.toString("UTF-8"));
    }

    var query = dinfra.dlog.query();

    if (params.last != null) {
        query.withLast(1 * params.last);
    }

    if (params.from != null) {
        query.withFromTime(1 * params.from);
    }

    if (params.priorityLimit != null) {
        query.withPriorityLimit(1 * params.priorityLimit);
    }

    if (params.originPattern != null) {
        query.withOrigin(new RegExp(params.originPattern));
    }

    if (params.servicePattern != null) {
        query.withService(new RegExp(params.servicePattern));
    }

    query.invoke(function (error, message) {
            if (error != null) {
                // @todo audit - these might not be right
                console.log(error);
                process.exit(1);
            }

            var last = false;

            if ((error != null) || (message == null)) {
                last = true;

                new LogResponse(request, mode, path, request, response,
                    error, logs);
            }
            else {
                logs.push(message);
            }

            return (last);
        });
}

StatusResponder.prototype.sendSupportFile = function (request, response, path) {
    if (path.lastIndexOf(".css") == path.length - 4) {
        response.setHeader("Content-Type", "text/css; charset=UTF-8");
    }
    else if (path.lastIndexOf(".png") == path.length - 4) {
        response.setHeader("Content-Type", "image/png");
    }
    else if (path.lastIndexOf(".svg") == path.length - 4) {
        response.setHeader("Content-Type", "image/svg+xml");
    }
    else if (path.lastIndexOf(".html") == path.length - 5) {
        response.setHeader("Content-Type", "text/html; charset=UTF-8");
    }
    else if (path.lastIndexOf(".js") == path.length - 3) {
        response.setHeader("Content-Type",
            "application/javascript; charset=UTF-8");
    }
    else {
        // no idea
    }

    var fspath = node_path.join(node_path.dirname(module.filename),
        "web/" + path);
    var stream = fs.createReadStream(fspath);

    stream.
        on('error', function (e) {
            if ((e instanceof Object) && (e.errno == 34)) {
                stream.close();
                this.sendError(request, response, path, 404,
                    "no such resource");
            }
            else {
                stream.close();
                this.sendError(request, response, path, 500,
                    "server error");
                logger.warning("during response for " + path, e);
            }
        }.bind(this)).
        pipe(response);
}

StatusResponder.prototype.handle = function (request, response, prefix, path) {
    response.on('error', function (error) {
            logger.warning("status responder", {
                    message: "during response handler",
                    path: path,
                    error: error,
                });
        });

    var requested = Date.now();
    var path;
    var mode;
    var page;

    if ((path == "") || (path == "index.html")) {
        mode = "html";
        page = "index";
    }
    else if (path == "index.json") {
        mode = "json";
        page = "index";
    }
    else if (this.hasLogsView && (path == "logs.json")) {
        mode = "json";
        page = "logs";
    }
    else {
        mode = null;
        page = null;
    }

    if (page == "index") {
        if ((this.cached == null) || (this.cached.expires < requested)) {
            this.cached = new StatusCached(this);
            this.statuses++;
            this.cached.fillCached();
        }

        this.cached.waitCached(function (cached) {
                this.respond(requested, mode, path, request, response, cached);
            }.bind(this));
    }
    else if (page == "logs") {
        if ((mode == "json") && (request.method == "POST")) {
            var buffer = new Buffer(0);

            request.on("error", function (error) {
                    this.sendError(request, response, path, 500,
                        "request IO error");
                }.bind(this)).
                on("data", function (chunk) {
                    buffer = Buffer.concat([buffer, chunk]);
                }.bind(this)).
                on("end", function (chunk) {
                    if (chunk != null) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    this.queryLogs(requested, mode, path, request, response,
                        buffer);
                }.bind(this));
        }
        else if (mode == "json") {
            this.queryLogs(requested, mode, path, request, response);
        }
        else {
            this.queryLogs(requested, mode, path, request, response);
        }
    }
    else if (page != null) {
        this.sendError(request, response, path, 404, "no such resource");
    }
    else {
        // fix css style for status responder page
        if (path == '.css') {
            path = 'status.css';
        }

        this.sendSupportFile(request, response, path);
    }
}

StatusResponder.prototype.respond = function (requested,
        mode, path, request, response, cached) {
    var json = cached.json;

    json.requested.ms = requested;
    json.requested.date = new Date(requested).toISOString();

    if (mode == "json") {
        response.setHeader("Content-Type", "application/json");

        /*
            @todo conditional support here for json stringification -
            do not want to serialize stack frames to non-admin users.
            Note, also want to record to logs ...
        */
        response.end(djson.stringify(json, null, {
                shift: 4,
                tree: true,
                strict: true
            }),
            "UTF-8", function (error) {
                if (error != null) {
                    if (error instanceof Error) {
                        error = error.message;
                    }

                    logger.warning("status responder", {
                            json: json,
                            error: error,
                        });
                }
            });
    }
    else if (mode == "html") {
        response.setHeader("Content-Type", "text/html; charset=UTF-8");

        var stream = new denum.BufferTransform(response);
        var writer = new dhtml.HTMLWriter(stream);
        var condition;

        if (json.errors.length > 0) {
            condition = "Unstable";
        }
        else {
            condition = "Stable";
        }

        var title = this.name + " " + this.version + " Status " + condition;

        this.sendStandardStart(request, writer, title);

        writer.
            beginElement("div", { class: 'content summary' }).
                beginElement("div", { class: 'application' }).
                sendElement("span", { class: 'key' }, "Application").
                sendElement("span", { class: 'space' }, ": ").
                sendElement("span", { class: 'value' }, json.name).
                endElement("div").
                beginElement("div", { class: 'version' }).
                sendElement("span", { class: 'key' }, "Version").
                sendElement("span", { class: 'space' }, ": ").
                sendElement("span", { class: 'value' }, json.version).
                endElement("div").
                beginElement("div", { class: 'condition ' + condition }).
                sendElement("span", { class: 'key' }, "Condition").
                sendElement("span", { class: 'space' }, ": ").
                sendElement("span", { class: 'value' }, condition).
                endElement("div").
            endElement("div");

        writer.sendElement("h2", { class: 'checks' }, "Checks").
            beginElement("div", { class: 'content checks' });

        for (var header in json.checks) {
            var cjson = json.checks[header];

            writer.beginElement("h3", { class: "check" }).
                sendElement("span", { class: "name" }, header).
                sendElement("span", { class: "space" }, ": ").
                sendElement("span", { class: "status " + cjson.status },
                    cjson.status).
                endElement("h3");

            if (cjson.content != null) {
                writer.beginElement("div", { class: "check-content json" });
                writer.renderJSON(cjson.content);
                writer.endElement("div");
            }
        }

        writer.endElement("div");

        if (json.errors.length > 0) {
            writer.sendElement("h2", { class: "problems" }, "Problems").
                beginElement("div", { class: 'content problems' });

            for (var i = 0; i < json.errors.length; i++) {
                var cjson = json.errors[i];

                writer.beginElement("div", { class: "error" });
                writer.sendElement("h3", { class: "error-title" },
                    "Error for " + cjson.name);

                writer.beginElement("div", { class: "error-content json" });
                writer.renderJSON(cjson.error);
                writer.endElement("div");
                writer.endElement("div");
            }

            writer.endElement("div");
        }

        this.sendStandardFinish(request, writer);
    }
    else {
        this.sendError(request, response, path, 500, "unsupported mode " +
            mode);
    }
}

/**
 * This is just remains for older implementations - it just redirects
 * to the common base class implementation.
 */
StatusResponder.prototype.returnStatusHandler = function (httpServer, path) {
    return (returnServiceHandler(httpServer, path));
}

/**
 * Provide a view of the logs from within the status responder.
 */
StatusResponder.prototype.withLogsView = function (hasLogsView) {
    if (hasLogsView == null) {
        hasLogsView = true;
    }

    this.hasLogsView = hasLogsView;

    return (this);
}

StatusResponder.prototype.withCheckDatabases = function () {
    new StatusCheck(this, "databases", function (callback) {
            var group = new denum.RunGroup();
            var json = {
                    "db-monitor": { },
                    "writable-db": { },
                    "writable-tx": { },
                    "readable-db": { },
                    "readable-tx": { },
                    "warehouse-db": { },
                };

            var dbMonitorComplete = group.callback();
            var monitorStart = Date.now();

            dinfra.openDBMonitor(function (error, monitor) {
                    if (error != null) {
                        json["db-monitor"].open = {
                                success: false,
                                error: error,
                            };

                        return (dbMonitorComplete());
                    }

                    var connectionCount = 0;

                    for (var id in monitor.connections) {
                        connectionCount++;
                    }

                    var transactionCount = 0;

                    for (var id in monitor.transactions) {
                        transactionCount++;
                    }

                    json["db-monitor"].score = monitor.health.score;
                    json["db-monitor"].transactions = transactionCount;
                    json["db-monitor"].connections = connectionCount;
                    json["db-monitor"].limit = monitor.limits.connections;

                    monitor.close(function (error) {
                            if (error != null) {
                                json["db-monitor"].close = {
                                        success: false,
                                        error: error,
                                    };

                                return (dbMonitorComplete());
                            }

                            json["db-monitor"].elapsed = Date.now() -
                                monitorStart;

                            dbMonitorComplete();
                        });
                });

            group.submit(function (callback) {
                    dinfra.openWritableDB(function (error, conn) {
                            var subjectJSON = json["writable-db"];

                            if (error != null) {
                                subjectJSON.open = {
                                        success: false,
                                        error: error
                                    };

                                return (callback(error));
                            }

                            subjectJSON.open = {
                                    success: true,
                                    elapsed: Date.now() - monitorStart,
                                };

                            var closeStart = Date.now();

                            conn.close(function (error) {
                                    if (error != null) {
                                        subjectJSON.close = {
                                                success: false,
                                                error: error
                                            };

                                        return (callback(error));
                                    }

                                    subjectJSON.close = {
                                            success: true,
                                            elapsed: Date.now() - closeStart,
                                        };

                                    subjectJSON.elapsed = Date.now() -
                                        monitorStart;

                                    return (callback());
                                });
                        });
                });

            group.submit(function (callback) {
                    dinfra.openWritableTX(function (error, conn) {
                            var subjectJSON = json["writable-tx"];

                            if (error != null) {
                                subjectJSON.open = {
                                        success: false,
                                        error: error
                                    };

                                return (callback(error));
                            }

                            subjectJSON.open = {
                                    success: true,
                                    elapsed: Date.now() - monitorStart,
                                };

                            var closeStart = Date.now();

                            conn.close(function (error) {
                                    if (error != null) {
                                        subjectJSON.close = {
                                                success: false,
                                                error: error
                                            };

                                        return (callback(error));
                                    }

                                    subjectJSON.close = {
                                            success: true,
                                            elapsed: Date.now() - closeStart,
                                        };

                                    subjectJSON.elapsed = Date.now() -
                                        monitorStart;

                                    return (callback());
                                });
                        });
                });

            group.submit(function (callback) {
                    dinfra.openReadableDB(function (error, conn) {
                            var subjectJSON = json["readable-db"];

                            if (error != null) {
                                subjectJSON.open = {
                                        success: false,
                                        error: error
                                    };

                                return (callback(error));
                            }

                            subjectJSON.open = {
                                    success: true,
                                    elapsed: Date.now() - monitorStart,
                                };

                            var closeStart = Date.now();

                            conn.close(function (error) {
                                    if (error != null) {
                                        subjectJSON.close = {
                                                success: false,
                                                error: error
                                            };

                                        return (callback(error));
                                    }

                                    subjectJSON.close = {
                                            success: true,
                                            elapsed: Date.now() - closeStart,
                                        };

                                    subjectJSON.elapsed = Date.now() -
                                        monitorStart;

                                    return (callback());
                                });
                        });
                });

            group.submit(function (callback) {
                    dinfra.openReadableTX(function (error, conn) {
                            var subjectJSON = json["readable-tx"];

                            if (error != null) {
                                subjectJSON.open = {
                                        success: false,
                                        error: error
                                    };

                                return (callback(error));
                            }

                            subjectJSON.open = {
                                    success: true,
                                    elapsed: Date.now() - monitorStart,
                                };

                            var closeStart = Date.now();

                            conn.close(function (error) {
                                    if (error != null) {
                                        subjectJSON.close = {
                                                success: false,
                                                error: error
                                            };

                                        return (callback(error));
                                    }

                                    subjectJSON.close = {
                                            success: true,
                                            elapsed: Date.now() - closeStart,
                                        };

                                    subjectJSON.elapsed = Date.now() -
                                        monitorStart;

                                    return (callback());
                                });
                        });
                });

            group.submit(function (callback) {
                    dinfra.openWarehouseDB(function (error, conn) {
                            var subjectJSON = json["warehouse-db"];

                            if (error != null) {
                                subjectJSON.open = {
                                        success: false,
                                        error: error
                                    };

                                return (callback(error));
                            }

                            subjectJSON.open = {
                                    success: true,
                                    elapsed: Date.now() - monitorStart,
                                };

                            var closeStart = Date.now();

                            conn.close(function (error) {
                                    if (error != null) {
                                        subjectJSON.close = {
                                                success: false,
                                                error: error
                                            };

                                        return (callback(error));
                                    }

                                    subjectJSON.close = {
                                            success: true,
                                            elapsed: Date.now() - closeStart,
                                        };

                                    subjectJSON.elapsed = Date.now() -
                                        monitorStart;

                                    return (callback());
                                });
                        });
                });

            group.wait(function (error) {
                    json.elapsed = Date.now() - monitorStart;

                    return (callback(error, json));
                });
        });

    return (this);
}

StatusResponder.prototype.withCheckCustom = function (name, callback) {
    new StatusCheck(this, name, callback);

    return (this);
}

StatusResponder.prototype.withReportError = function (name, message, content) {
    new StatusCheck(this, name, function (callback) {
            callback(new Error(message), content);
        });

    return (this);
}

StatusResponder.prototype.withCrashError = function (name, message) {
    new StatusCheck(this, name, function () {
            throw new Error(message);
        });

    return (this);
}

StatusResponder.prototype.withCheckConfig = function () {
    new StatusCheck(this, "config", function (callback) {
            callback(null, {
                configured: (dinfra.config != null),
                infrastructure: dinfra.version,
                mode: dinfra.isProduction() ? "production" : "development",
                associativity: dtopic ? dtopic.getAssociativity() : null,
            });
        });

    return (this);
}

StatusResponder.prototype.withCheckRegos = function () {
    new StatusCheck(this, "registrations", function (callback) {
            var dservice = require('./dservice');
            var regos = dservice.getServiceRegos();

            if (regos.length == 0) {
                return (callback(null, { registrations: [] }));
            }

            var details = [];
            var badRegos = [];
            var error = null;
            var myIds = {};

            regos.forEach(function (rego) {
                    var detail = {
                            id: rego.id,
                            name: rego.name,
                            version: rego.version,
                            origin: rego.origin,
                            mode: rego.mode,
                            last: rego.last,
                            age: (Date.now() - rego.last) / 1000,
                        };

                    detail.state = rego.state || "ready";
                    detail.control = rego.control || "ready";

                    if (detail.state != "ready") {
                        badRegos.push(rego);
                    }

                    myIds[rego.id] = rego;

                    details.push(detail);
                });

            if (badRegos.length == details.length) {
                error = { status: "not-ready", count: badRegos.length };
            }

            var result = { registrations: details };
            var infos = require('./dservice').getServicesCache();

            details = [];

            infos.getAllServices().forEach(function (info) {
                    var detail = {
                            id: info.id,
                            name: info.name,
                            version: info.version,
                            mode: info.mode,
                            origin: info.origin,
                            last: info.last,
                            age: (Date.now() - info.last) / 1000,
                        };

                    // show state and control variables in the result
                    detail.state = info.state || "ready";
                    detail.control = info.control || "ready";

                    if (info.id in myIds) {
                        return;
                    }

                    details.push(detail);
                });

            result.peers = details;

            return (callback(error, result));
        });

    return (this);
}

StatusResponder.prototype.withDefaultChecks = function () {
    this.withCheckConfig();

    //withServerConfig(). // not quite relevant to express - @todo adjust

    if ((dinfra.config != null) && (dinfra.config.databases != null)) {
        this.withCheckDatabases();

        this.withCheckRegos();
    }

    return (this);
}

StatusResponder.prototype.withCacheFor = function (ms) {
    this.cacheMS = ms;
}

/**
 * Reports the configuration of the local HTTP server that this
 * status responder is bound to.
 */
StatusResponder.prototype.withServerConfig = function () {
    new StatusCheck(this, "server-config", function (callback) {
            var json = {
                    listeners: []
                };

            for (var i = 0; i < this.servers.length; i++) {
                var server = this.servers[i];
                var address = server.address();

                json.listeners.push({
                        family: address.family,
                        address: address.address,
                        port: address.port,
                    });
            }

            callback(null, json);
        }.bind(this));

    return (this);
}

exports.StatusResponder = StatusResponder;
