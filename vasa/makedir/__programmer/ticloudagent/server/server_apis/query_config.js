"use strict";
var _ = require("lodash");
var xpath = require("xpath");
var xmldom_1 = require("xmldom");
var dinfraCommon = require("../common/dinfra_common");
var resources = require("../common/resources");
var generateErrorHandler = require("../common/generate_error_handler");
var readIntoString = require("../common/read_to_string");
var logger = dinfraCommon.dinfra.logger("cloud-agent-server");
function queryConfig(params, req, res) {
    readIntoString(req)
        .then(function (ccxmlData) {
        return getConfigJson(ccxmlData, params.os);
    })
        .then(function (responseJson) {
        // Send json data back to client
        var body = JSON.stringify(responseJson);
        if (res.writeHead) {
            res.writeHead(200, {
                "content-type": "application/json",
            });
        }
        res.end(body);
    })
        .catch(generateErrorHandler(res))
        .done();
}
function getConnectionInfo(version, connectionXMLFile) {
    return dinfraCommon.getResource(version, connectionXMLFile)
        .then(function (meta) {
        return {
            connectionProperties: meta.properties,
        };
    });
}
function getDeviceInfo(version, deviceXMLFile) {
    return dinfraCommon.getResource(version, deviceXMLFile)
        .then(function (meta) {
        var cores = meta.cores;
        var deviceProperties = meta.properties;
        var partnum = meta.partnum;
        return {
            cores: cores,
            deviceProperties: deviceProperties,
            partnum: partnum,
        };
    });
}
function getInfo(version, parsedCCXML) {
    var deviceXMLFile = parsedCCXML.deviceXMLFile;
    var connectionXMLFile = parsedCCXML.connectionXMLFile;
    var connectionID = parsedCCXML.connectionID;
    return getConnectionInfo(version, connectionXMLFile)
        .then(function (connectionInfo) {
        return getDeviceInfo(version, deviceXMLFile)
            .then(function (deviceInfo) {
            var cores = _.map(deviceInfo.cores, function (core) {
                // adapt cores
                var coreName = core.desc || core.id;
                var adaptedCore = {
                    name: coreName,
                    pathName: connectionID + "/" + coreName,
                    isa: core.isa,
                };
                return adaptedCore;
            });
            return _.merge(deviceInfo, _.merge(connectionInfo, { cores: cores }));
        });
    });
}
function getConfigJson(ccxmlData, os) {
    var parsedCCXML = parseCCXMLFile(ccxmlData, os);
    if (!parsedCCXML.deviceXMLFile || !parsedCCXML.connectionXMLFile) {
        throw new Error("Invalid CCXML File. No devices/drivers found!");
    }
    return resources.version.getCurrent()
        .then(function (version) {
        return getInfo(version, parsedCCXML);
    })
        .then(function (ret) {
        return _.merge(ret, {
            deviceXMLFile: parsedCCXML.deviceXMLFile,
            connectionXMLFile: parsedCCXML.connectionXMLFile,
        });
    });
}
function parseCCXMLFile(ccxmlContents, os) {
    var prefix = resources.getPrefix(os);
    var devicesPrefix = prefix + "ccs_base/common/targetdb/devices/";
    var connectionsPrefix = prefix + "ccs_base/common/targetdb/connections/";
    // condense the error messages by using generic msg for all.
    function xmlParserErrorHandler(level, msg) {
        logger.error("parseCCXMLFile parseFromString()", level, msg);
    }
    var xmlDoc = new xmldom_1.DOMParser({
        locator: {},
        errorHandler: xmlParserErrorHandler,
    }).parseFromString(ccxmlContents);
    var deviceXMLFile = devicesPrefix + xpath.select("//instance[@xmlpath='devices']/@xml", xmlDoc)[0].nodeValue;
    var connectionXMLFile = connectionsPrefix +
        xpath.select("//instance[@xmlpath='connections']/@xml", xmlDoc)[0].nodeValue;
    var connectionID = xpath.select("//instance[@xmlpath='connections']/@id", xmlDoc)[0].nodeValue;
    return {
        deviceXMLFile: deviceXMLFile,
        connectionXMLFile: connectionXMLFile,
        connectionID: connectionID,
    };
}
module.exports = queryConfig;
