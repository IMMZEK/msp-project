// Copyright (C) 2015-2017 Texas Instruments Incorporated - http://www.ti.com/
/**
 * Cloud infrastructure abstraction layer for HTTP services.
 * This is used as the base of StatusResponder and ResourceService.
 * @module dinfra
 */
const Q = require('q'); // promise library
const url = require('url');
const denum = require('./denum');
const dhtml = require('./dhtml');
const logger = require('./dinfra').logger("dinfra/dadapter");

/**
 * Strip all segment parameters from each path segment in the path,
 * and store them in params (must be an Object).  This also converts
 * all of the elements within it from URI-encoded form, to unencoded
 * form. So the returned path is returned without encodings, as well
 * as all of the parameters and parameter names.  Note if params is an
 * array, then the results are a bit different: each segment will generate
 * an array item like this:
 *
 * {
 *    result: <result>
 *    params: <params>
 * }
 *
 * This later approach keeps the params associated with their path segment,
 * rather than jumbling them all together.
 *
 * Lastly, if params is null, then params are just stripped out and not
 * preserved in any way.
 */
function stripURIParamsPath(path, aParams) {
    var n;
    var escape = decodeURIComponent;

    if (path.length && (path[0] == "/")) {
        n = 1;
    }

    do {
        var i = n; // start of segment

        n = path.indexOf("/", i); // end of segment

        if (n < 0) {
            n = path.length;
        }

        var t = path.indexOf(";", i); // start of params

        if ((t < 0) || (t > n)) {
            t = n;
        }

        var params;

        if (aParams == null) {
            params = null;
            segment = null;
        }
        else if (aParams instanceof Array) {
            params = {};

            aParams.push({
                    result: escape(path.substring(0, t)),
                    params: params,
                });
        }
        else {
            params = aParams;
            segment = null;
        }

        if (params != null) {
            var u = t + 1;

            while (u < n) {
                var w = path.indexOf(";", u);

                if ((w < 0) || (w > n)) {
                    w = n;
                }

                var v = path.indexOf("=", u);

                if ((v < 0) || (v > w)) {
                    v = w;
                }

                var param = path.substring(u, v);
                var value;

                if (v < w) {
                    value = path.substring(v + 1, w);
                }
                else {
                    value = true;
                }

                params[escape(param)] = escape(value);

                u = w + 1;
            }
        }

        path = path.substring(0, t) + path.substring(n);

        n = t + 1;
    }
    while (n <= path.length);

    return (escape(path));
}

exports.stripURIParamsPath = stripURIParamsPath;



/**
 * Base class for HTTP-based service adapters.
 */
function ServiceAdapter(root) {
    this.servers = [];
    /**
     * This tells us where to find support files, such
     * as status.css and so forth: these are needed for
     * consistent branding and presentation.  By default
     * we just use the status responder in its standard
     * location for now and assume that it is at the top-level.
     * Implementors may override this, so long as they have
     * an application that can serve that data.
     */
    this.supportLocation = "/status/";
    /**
     * A map of millisecond timeouts to aggregated reporting
     * rate data (mostly used for error reporting).
     */
    this.reportingRates = {};
    /**
     * Use final handler to respond with a generic 404 message.
     * This should typically be added to your express chain
     * as the last handler for /.
     */
    this.finalHandler = function (request, response) {
            this.sendError(request, response, request.url, 404,
                "missing resource");
        }.bind(this);
}

ServiceAdapter.prototype.handle = function (request, response, prefix, path) {
    throw new Error("unimplemented handle method: " + path);
}

/**
 * Return the relative location from left to right using URL rules.
 */
ServiceAdapter.prototype.getRelativeLocation = function (left, right) {
    left = url.parse(left).pathname;
    right = url.parse(right).pathname;

    var limit = Math.min(left.length, right.length);
    var sep = "/"[0];
    var i = 0;
    var k = 0;

    while ((i < limit) && (left[i] == right[i])) {
        if (left[i] == sep) {
            k = i + 1;
        }

        i++;
    }

    if (k == 0) {
        return (right);
    }

    right = right.substr(k);
    limit = left.length;

    while (i < limit) {
        if (left[i] == sep) {
            right = "../" + right;
        }

        i++;
    }

    return (right);
}

/**
 * Return the location right resolved relative to left using URL rules.
 */
ServiceAdapter.prototype.getResolvedLocation = function (left, right) {
    return (url.resolve(left, right));
}

/**
 * Given a request and a support path (eg. status.css), return
 * the relative path from the request resource to get to that support path.
 * This is used primarily in error handling, and so forth, to ensure
 * proper branding and other presentation.
 */
ServiceAdapter.prototype.getSupportRelative = function (request, path) {
    if (!request.realUrl) {
        request.realUrl = request.originalUrl || request.url;
    }

    return (this.getRelativeLocation(request.realUrl,
        this.getResolvedLocation(this.supportLocation, path)));
}

ServiceAdapter.prototype.sendHeadElements = function (request, writer, title) {
    writer.
        sendElement("title", {}, title).
        sendUnclosedElement("link", {
            type: "text/css",
            rel: "stylesheet",
            href: this.getSupportRelative(request, "status.css") });
}

ServiceAdapter.prototype.sendBannerElements = function (request, writer,
        title) {
    writer.
        /* plain text
        sendElement("div", { class: 'banner', },
            "Texas Instruments").
        */
        sendElement("div", { class: 'ic-logo', }).
        sendElement("h1", { class: 'summary' }, title);
}

ServiceAdapter.prototype.sendStandardStart = function (request, writer,
        title) {
    writer.beginElement("html").
        beginElement("head");

    this.sendHeadElements(request, writer, title);

    writer.
        endElement().
        beginElement("body");

    this.sendBannerElements(request, writer, title);
}

ServiceAdapter.prototype.sendStandardFinish = function (request, writer) {
    writer.
            endElement("body").
        endElement("html").
        end(); // @todo could add callback here ...
}

ServiceAdapter.prototype.sendRedirect = function (request, response, path,
        code, url) {
    if (code == null) {
        code = 302;
    }

    response.statusCode = code;

    response.statusMessage = "redirecting";

    response.setHeader("Content-Type", "text/html; charset=UTF-8");
    response.setHeader("Location", url);

    try {
        var writer = new dhtml.HTMLWriter(response);
        var title = "Redirect " + code;

        this.sendStandardStart(request, writer, title);

        writer.
            beginElement("div", { class: 'content summary' }).
                sendElement("div", { class: 'path' }, path).
                sendElement("div", { class: 'url' }, url).
            endElement("div");

        this.sendStandardFinish(request, writer);
    }
    catch (e) {
        logger.warning("status responder", {
                message: "during redirect handler",
                path: path,
                error: e
            });
        response.end();
    }
}

ServiceAdapter.prototype.sendError = function (request, response, path,
        code, message, suppress) {
    if (typeof(path) == "number") {
        supress = message;
        message = code;
        code = path;
        path = null;
    }

    if (path == null) {
        path = request.url;
    }

    if (path.indexOf("?") >= 0) {
        path = path.substr(0, path.indexOf("?")); // strip any parameters
    }

    if (typeof(code) == "string") {
        suppress = message;
        message = code;
        code = null;
    }

    if (typeof(code) != "number") {
        code = 500;
    }

    var group = Math.floor(code / 100);
    var intro;

    if (group == 1) {
        intro = "Continue";
    }
    else if (group == 2) {
        intro = "Status";
    }
    else if (group == 3) {
        intro = "Redirect";
    }
    else if (group == 4) {
        intro = "Client Error";
    }
    else {
        intro = "Service Error";
        logger.warning(message, {
                code: code,
                request: "" + request.url,
                "status-path": path,
            });
    }

    if (typeof(suppress) === "boolean") {
        if (suppress) {
            suppress = 0; // always suppress these
        }
        else {
            suppress = 1000; // maximum reporting rate in ms
        }
    }
    else if (typeof(suppress) === "number") {
        // keep it - assume it is valid
    }
    else if ((group >= 1) && (group < 4)) {
        suppress = 0; // by default never report 100, 200, 300 series
    }
    else {
        // otherwise report these errors, but no more frequently than
        // every second (aggregate reports).
        suppress = 1000; // maximum reporting rate in ms
    }

    response.statusCode = code;

    if (message != null) {
        // @todo what is this about ???
        response.statusMessage = "unsupported mode";
    }

    if (suppress === 0) {
        // never report these messages
    }
    else {
        var rate;

        if (suppress < 0) {
            // don't insert this in the reporting rates list
            // don't manage timeouts either
            rate = {
                    responses: [],
                    count: 0,
                };
        }
        else {
            var key = "" + suppress;
            var report = false;

            rate = this.reportingRates[key];

            if (rate == null) {
                rate = {
                        responses: [],
                        total: 0,
                        skipped: 0,
                    };

                this.reportingRates[key] = rate;

                report = true;
            }

            if (rate.timeout == null) {
                var timeout = function () {
                        rate.timeout = null;

                        if (rate.total == 0) {
                            // nothing further since
                            delete this.reportingRates[key];
                            return;
                        }

                        logger.warning("service adapter", {
                                message: "recorded http responses",
                                responses: rate.responses,
                                total: rate.total,
                                skipped: rate.skipped,
                                rate: suppress,
                            });

                        // reset count and paths
                        rate.total = 0;
                        rate.skipped = 0;
                        rate.responses = [];
                        rate.timeout = setTimeout(timeout, suppress)
                    }.bind(this);

                rate.timeout = setTimeout(timeout, suppress);
            }
        }

        var item = rate.responses.filter(function (item) {
                return ((item.path == path) && (item.code == code));
            }).shift();

        if (item == null) {
            rate.responses.push(item = {
                    path: path,
                    code: code,
                    count: 0,
                });

            if (rate.responses.length > 10) {
                var ritem = rate.responses.shift();

                rate.skipped += ritem.count;
            }
        }

        item.count++;
        rate.total++;

        if (report) {
            logger.warning("service adapter", {
                    message: "recorded http responses",
                    responses: rate.responses,
                    total: rate.total,
                    skipped: rate.skipped,
                    rate: suppress,
                });

            // there is always a timeout at this point,
            // so let it deal with the rest of the reportingRates maintenance. 

            rate.total = 0;
            rate.skipped = 0;
            rate.responses = [];
            rate.report = false;
        }
    }

    response.setHeader("Content-Type", "text/html; charset=UTF-8");

    try {
        var writer = new dhtml.HTMLWriter(
            new denum.BufferTransform(response));
        var title = intro + " " + code;

        this.sendStandardStart(request, writer, title);

        writer.
                beginElement("div", { class: 'content summary' }).
                    sendElement("div", { class: 'path' }, path).
                    sendElement("div", { class: 'message' }, message).
                    sendElement("div", { class: 'application' }, this.name).
                    sendElement("div", { class: 'version' }, this.version).
                endElement("div");

        this.sendStandardFinish(request, writer);
    }
    catch (e) {
        logger.warning("service adapter", {
                message: "during error handler",
                path: path,
                error: e
            });
        response.end();
    }
}

/**
 * A more appropriate name for sendError, since it can also send
 * legitimate status responses that are not errors (100, 200, 300 series
 * status codes).
 */
ServiceAdapter.prototype.sendStatus = ServiceAdapter.prototype.sendError;

/**
 * Register both this adapter at path and
 * the final handler for an express app.
 */
ServiceAdapter.prototype.withExpressFinal = function (app, path) {
    this.withExpressHandler(app, path);

    app.use("/", this.finalHandler);

    return (this);
}

ServiceAdapter.prototype.withExpressHandler = function (app, path) {
    if (path == null) {
        path = this.supportLocation;
    }

    app.use(path, function (request, response, next) {
        // https://nodejs.org/api/http.html#http_message_url
        // All express versions use 'url' as request extends node's 
        // IncommingMessage.  Also, a lot of middleware will alter only 'url',
        // so that's what we have to use
            
        var rPath = request.url;

        if ((rPath.indexOf("/") == 0) &&
                (path.lastIndexOf("/") == path.length - 1)) {
            request.realUrl = path + rPath.substr(1);
        }
        else {
            request.realUrl = path + rPath;
        }
        
        if(request.originalUrl && 
            request.baseUrl && 
            request.originalUrl.substring(request.baseUrl.length) == "") {
            // Express 4 case - redirect from /status to /status/
            // Allows the html to reference stuff like /status/status.css

            this.sendRedirect(
                request, response, "", 302, request.originalUrl.substr(1) + "/");
        }
        else if (rPath.indexOf("/") == 0) {
            // we expect it to always begin with a leading slash
            rPath = rPath.substring(1);

            this.handle(request, response, path, rPath);
        }
        else {
            this.sendError(request, response, rPath, 404,
                "unknown resource");
        }
    }.bind(this));

    return (this);
}

/**
 * Create a new server listener for the adapter with the given path.
 * Anything that misses the path will be forwarded to the optional chain.
 * Both chain and the returned function take (request, response) parameters.
 * Path may be either a string prefix or a regular expression.
 */
ServiceAdapter.prototype.newServerListener = function (path, chain) {
    if (path instanceof RegExp) {
        // stays the same
    }
    else if (typeof(path) == "string") {
        path = new RegExp("^" + denum.escapeRegExp(path));
    }
    else {
        throw new RangeError("path must be a string");
    }

    return (function (request, response) {
            var urlPath = url.parse(request.url).path;

            if (urlPath == null) {
                return;
            }

            request.realUrl = request.url;

            var match = urlPath.match(path);

            if (match == null) {
                if (chain == null) {
                    return;
                }

                return (chain(request, response));
            }

            this.handle(request, response, path,
                urlPath.substring(match[0].length));
        }.bind(this));

    return (this);
}

ServiceAdapter.prototype.withServerListener = function (httpServer, path) {
    this.servers.push(httpServer);

    httpServer.on('request', this.newServerListener(path));

    return (this);
}

/**
 * This is retained locally in case of external use.
 */
ServiceAdapter.prototype.stripParamsPath = stripURIParamsPath;

exports.ServiceAdapter = ServiceAdapter;

