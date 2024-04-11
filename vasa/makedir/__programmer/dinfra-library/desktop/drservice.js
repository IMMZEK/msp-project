// Copyright (C) 2016-2017 Texas Instruments Incorporated - http://www.ti.com/
const npath = require('path');
const util = require('util');
const mod_stream = require('stream');
const dinfra = require('./dinfra');
const dhtml = require('./dhtml');
const denum = require('./denum');
const djson = require('./djson');
const dresource = require('./dresource');
const darchive = require('./darchive');
const dadapter = require('./dadapter');

/**
 * Encodes a MIME parameter key and value, with optional quoting
 * unless quote is true, which forces quoting.
 * If the value is null, only the key is encoded, and no value
 * is encoded.
 *
 * @todo note that we should be able to specify or detect UTF-8 encoding
 * and use RFC2231 to encode those in permitted circumstances.  Portability
 * of that is pretty narrow though.  There is also a trick to this:
 * the parameter separation syntax is DIFFERENT for extended parameters.
 * We will probably need a way of passing back that decision to the caller ...
 */
function encodeMIMEKeyValue(key, value, quote, comment) {
    if (key == null) {
        throw new RangeError("param key cannot be null");
    }

    if (typeof(key) != "string") {
        throw new RangeError("param key must be a string");
    }

    if (key.length == 0) {
        throw new RangeError("param key cannot be empty");
    }

    var result = key;

    if (value != null) {
        result += "=";

        // This test is actually more restrictive that it officially
        // needs to be - but that is to deal with some common, poor
        // implementations.  Can likely be broadened up a bit if
        // absolutely necessary, but check RFC822 and RFC2045 first.
        if (!quote && /^[-a-z0-9_]*$/.test(value)) {
            result += value;
        }
        else {
            result += "\"";

            var i = 0;
            var j = 0;

            while (i < value.length) {
                var code = value.charCodeAt(i);
                var c;

                if (code === 0x5c) {
                    c = "\\\\";
                }
                else if (code === 0x22) {
                    c = "\\\"";
                }
                else if (code < 32) {
                    // for now just skip it ... future RFC2231 above
                    c = ""; // this really should be percent encoded!!
                }
                else if (code > 127) {
                    // for now just skip it ... future RFC2231 above
                    c = ""; // this really should be percent encoded!!
                }
                else {
                    c = null; // just accumulate literal
                }

                if (c != null) {
                    if (j < i) {
                        result += value.substring(j, i);
                    }

                    j = i + 1;

                    result += c;
                }

                i++;
            }

            if (j < i) {
                result += value.substring(j, i);
            }

            result += "\"";
        }

        if (comment != null) {
            result += " (" + comment + ")";
        }
    }

    return (result);
}

/**
 * Encode a MIME Parameter key and value given a param object,
 * which must have a key string, an optional 'value',
 * optional 'quote' boolean and an optional 'comment'.
 * Beware of using force quoting and comments - many libraries
 * do not parse these properly under all circumstances.
 */
function encodeMIMEParam(param) {
    if (param == null) {
        throw new RangeError("param cannot be null");
    }

    return (encodeMIMEKeyValue(param.key, param.value, param.quote,
        param.comment));
}

/**
 * Encode MIME parameters and base value according to the passed object o.
 * o.value is the base value and must not be null.  o.params is an optional
 * parameter list or map.  If a list, each item is appended as per
 * encodeMIMEParam.  If a map, each item is appended as per encodeMIMEKeyValue.
 */
function encodeMIMEParams(o) {
    var s = o["value"];

    if (s == null) {
        throw new RangeError("object needs 'value' value");
    }

    if (o.params == null) {
        // ignore
    }
    else if (o.params instanceof Array) {
        o.params.forEach(function (param) {
                s += "; ";
                s += encodeMIMEParam(param);
            });
    }
    else {
        for (var name in o.params) {
            s += "; " + encodeMIMEKeyValue(name, o.params[name]);
        }
    }

    return (s);
}

util.inherits(ResourceService, dadapter.ServiceAdapter);

function ResourceService(root, opts) {
    dadapter.ServiceAdapter.call(this);

    // root must end in a slash (its used as a prefix)
    this.root = dresource.normalizeResourceName(root) + "/";

    this.opts = djson.simpleTreeCopy(opts);

    if (this.opts == null) {
        this.opts = {};
    }

    this.opts.json = !this.opts.sensitive;
}

ResourceService.prototype.addResourceHeaders = function (response, resource) {
    var headers = resource.getHeaders();

    for (var header in headers) {
        response.setHeader(header, headers[header]);
    }
}

ResourceService.prototype.sendResourceContent = function (response, resource,
        callback) {
    callback = denum.singleCallback(callback);

    var headers = resource.getMeta("headers");

    for (var name in headers) {
        response.setHeader(name, headers[name]);
    }

    resource.openReadable().
        on('error', callback).
        pipe(response).
        on('error', callback).
        on('finish', callback);
}

ResourceService.prototype.sendResourceJSON = function (response, resource,
        json, callback) {
    callback = denum.singleCallback(callback);

    response.setHeader("Content-Type", "application/json");

    response.
        on('error', callback).
        on('finish', callback).
        end(djson.stringify(json, null, 4), "UTF-8");
}

ResourceService.prototype.sendResourceMeta = function (response, resource,
        sub, callback) {
    var meta;

    if ((sub == null) || (sub === "true")) {
        meta = resource.meta;
    }
    else {
        meta = resource.getMeta(sub);
    }

    if (meta == null) {
        meta = {};
    }

    this.sendResourceJSON(response, resource, meta, callback);
}

ResourceService.prototype.newQueryResources = function (rpath, params) {
    var query = dinfra.queryResources();

    if (params.filter) {
        /*
            Must concatenate the escape rpath here, since we
            don't want to match the rpath with the filter,
            and we have to do the work of withNamePrefix.
        */
        query.withNamePattern(new RegExp("^" +
            denum.escapeRegExp(rpath) + ".*" + params.filter)); // as well
    }
    else {
        // simpler approach ...
        query.withNamePrefix(rpath);
    }

    return (query);
}

ResourceService.prototype.sendResourceListing = function (response,
        prefix, path, rpath, params, callback) {
    response.
        on('error', callback).
        on('finish', callback).
        setHeader("Content-Type", "application/json");

    var stream = new denum.BufferTransform(response);

    stream.on('error', callback).write("[", "UTF-8");

    var sep = "";

    var query = this.newQueryResources(rpath, params).
        withAllVersions().
        withTerminations().
        invoke(function (error, result) {
            if (error != null) {
                callback(error);
                return (true); // stop sending results
            }

            if (result == null) {
                stream.end("]", "UTF-8");
                return;
            }

            stream.write(sep + JSON.stringify(result), "UTF-8");
            sep = ",\n";

            return (false);
        }.bind(this));
}

ResourceService.prototype.sendResourceArchive = function (response,
        prefix, path, rpath, params, callback) {
    var archiveName = rpath.replace(/\/+$/, "").replace(/.*\//, "");

    callback = denum.singleCallback(callback);

    if (archiveName.length == 0) {
        archiveName = "archive";
    }

    if (this.opts.version != null) {
        archiveName = "-v" + this.opts.version;
    }

    archiveName += ".zip";

    response.
        on('error', callback).
        on('finish', callback).
        setHeader("Content-Type", "application/zip");

    response.setHeader("Content-Disposition",
        encodeMIMEParams({ value: "attachment",
            params: [
                {
                    key: "filename",
                    value: archiveName,
                    quote: true,
                }
            ]
        }));

    var strip = rpath;

    if (!/\/$/.test(strip)) {
        strip += "/";
    }

    var output = new denum.BufferTransform(response).
        on('error', callback);
    var archive = new darchive.ZIPArchiveOut(output);
    var query = this.newQueryResources(rpath, params);

    return (query.
        on('error', callback).
        on('result', function (result) {
            if (result.name.indexOf(strip) != 0) {
                return (query.next()); // ignore
            }

            if (result.type == dresource.RTYPE.DIR) {
                return (query.next()); // ignore
            }

            if (result.type != dresource.RTYPE.FILE) {
                return (query.next()); // ignore
            }

            var name = result.name.substr(strip.length);

            dinfra.openResource(result.name, {
                    version: result.version,
                },
                function (error, resource) {
                    if (error != null) {
                        return (callback(error));
                    }

                    var entry = archive.newEntry(name);

                    entry.on('error', callback).
                        on('finish', query.next.bind(query));

                    return (resource.openReadable().
                        on('error', callback).
                        pipe(entry));
                }.bind(this));
        }.bind(this)).
        on('end', function () {
            // note that an archive.close() does not end()
            // the underlying stream by default ...
            return (archive.close(function (error) {
                    if (error != null) {
                        return (callback(error));
                    }

                    return (output.end());
                }));
        }.bind(this)).
        next());
}

ResourceService.prototype.sendResourceDirectory = function (request, response,
        resource, prefix, path, rpath, params, callback) {
    response.
        on('error', callback).
        on('finish', callback).
        setHeader("Content-Type", "text/html; charset=UTF-8");

    var writer = new dhtml.HTMLWriter(new denum.BufferTransform(response));
    var title = "List " + resource.getSegment();
    var relative;
    var basename;

    if (path.lastIndexOf("/") == path.length - 1) {
        relative = "";
        basename = "";
    }
    else {
        relative = resource.getSegment() + "/";
        basename = resource.getSegment();
    }

    this.sendStandardStart(request, writer, title);

    writer.
        beginElement("div", { class: 'content summary' });

    if (this.opts.json) {
        writer.
           sendElement("a",
           { href: basename + ";list" },
           "as JSON (deep)").
           sendContent(" ");
    }

    if (this.opts.archive) {
        writer.
           sendElement("a",
               { href: basename + ";archive=zip" },
               "as ZIP Archive (deep)").
           sendContent(" ");
    }

    writer.
        endElement().
        beginElement("div", { class: 'content' }).
            beginElement("table", { class: 'pretty' }).
                beginElement("tr", { class: 'resource' }).
                    beginElement("th", { class: 'resource-name' }).
                       sendContent("Name").
                    endElement().
                    beginElement("th", { class: 'resource-version' }).
                       sendContent("Version").
                    endElement().
                    beginElement("th", { class: 'resource-size' }).
                       sendContent("Size").
                    endElement().
                    beginElement("th", { class: 'resource-modified' }).
                       sendContent("Last Modified").
                    endElement().
                    beginElement("th", { class: 'resource-type' }).
                       sendContent("Content Type").
                    endElement().
                endElement();

    var query = dinfra.queryResources();

    query.
        withNoAssumptions().
        withParentName(resource.name).
        withOrderBySegment(true).
        on('error', callback).
        on('result', function (info) {
            info.segment = info.name.substr(resource.name.length + 1);

            var contentType = (info.meta && info.meta.headers &&
                info.meta.headers["content-type"]) || "";

            writer.
                beginElement("tr", { class: 'resource' }).
                    beginElement("td", { class: 'resource-name' }).
                       sendElement("a", { href: relative + info.segment },
                       info.segment).
                    endElement().
                    beginElement("td", { class: 'resource-version' }).
                       sendContent(info.version || "").
                    endElement().
                    beginElement("td", { class: 'resource-size' }).
                       sendContent(info.type == dresource.RTYPE.DIR ?
                       "" : "" + info.size).
                    endElement().
                    beginElement("td", { class: 'resource-modified' }).
                       sendContent(new Date(info.modified).toISOString()).
                    endElement().
                    beginElement("td", { class: 'resource-type' }).
                       sendContent(contentType).
                    endElement().
                endElement();

            query.next();
        }.bind(this)).
        on('end', function () {
            writer.
                    endElement("table").
                endElement("div");

            // sends response.end
            return (this.sendStandardFinish(request, writer));
        }.bind(this)).
        next();
}

ResourceService.prototype.sendResourceVersions = function (response, resource,
        versions, // note ignored for now - assume JSON
        callback) {
    var map = resource.mapVersions();

    return (this.sendResourceJSON(response, resource, map, callback));
}

ResourceService.prototype.handleResource = function (request, response,
        prefix, path, rpath, params, resource, callback) {
    if (params.meta) {
        this.sendResourceMeta(response, resource, params.meta,
            callback);
    }
    else if (params.versions) {
        this.sendResourceVersions(response, resource, params.versions,
            callback);
    }
    else if (params.list) {
        this.sendResourceListing(response, prefix, path, rpath, params,
            callback);
    }
    else if (params.archive) {
        this.sendResourceArchive(response, prefix, path, rpath, params,
            callback);
    }
    else if (resource.type == dresource.RTYPE.DIR) {
        this.sendResourceDirectory(request,
            response, resource, prefix, path, rpath, params,
            callback);
    }
    else {
        this.addResourceHeaders(response, resource);
        this.sendResourceContent(response, resource, callback);
    }
}

ResourceService.prototype.handle = function (request, response, prefix, path) {
    var params = {};
    var rpath = dresource.normalizeResourceName(this.root +
        this.stripParamsPath(path, params));
    var openOpts = {
            termination: (params.meta ||
                params.version ||
                params.versions),
            version: params.version
        };

    dinfra.openResource(rpath, openOpts,
        function (error, resource) {
            if (error != null) {
                this.sendError(request, response, path, 500,
                    "could not load resource " + rpath);
            }
            else if (resource == null) {
                this.sendError(request, response, path, 404,
                    "could not find resource " + rpath);
            }
            else {
                var callback = function (error) {
                        if (error != null) {
                            this.sendError(request, response, path, 500,
                                "service error on resource " + rpath);
                        }
                    };

                this.handleResource(request, response, prefix, path, rpath,
                    params, resource,
                    denum.chainWrapper(resource.close.bind(resource),
                    callback));
            }
        }.bind(this));
}

exports.ResourceService = ResourceService;
