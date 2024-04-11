/* Used to create JSON data with list of connections -> to devices supported by the resources in the db */
"use strict";
var _ = require("lodash");
var path = require("path");
var Q = require("q");
var dinfra_common_1 = require("../common/dinfra_common");
var resources = require("../common/resources");
var meta = require("../common/meta");
function getISAsForConnectionTypeFromDrivers(version, driversPrefix, connectionType) {
    var supportedISAs = [];
    return dinfra_common_1.dinfra.queryResources()
        .withNamePrefix(driversPrefix)
        .withVersion(version)
        .withFieldValue("connectionTypes", connectionType)
        .invoke()
        .progress(function (queryResult) {
        _.each(meta.getMeta(queryResult).isaTypes, function (isaTypesObj) {
            supportedISAs.push(isaTypesObj.isaTypes);
        });
    }).then(function () {
        return supportedISAs;
    });
}
function getISAsForConnectionType(version, connectionsPrefix, driversPrefix) {
    var getISAsForConnectionTypePromises = [];
    var connections = [];
    var isasForConnectionByIndex = [];
    return dinfra_common_1.dinfra.queryResources()
        .withNamePrefix(connectionsPrefix)
        .withVersion(version)
        .withFieldValue("connectionType")
        .invoke()
        .progress(function (queryResult) {
        getISAsForConnectionTypePromises.push(getISAsForConnectionTypeFromDrivers(version, driversPrefix, queryResult.meta.TICloudAgent.connectionType)
            .then(function (isaTypes) {
            var metaData = meta.getMeta(queryResult);
            connections.push({
                connectionType: metaData.connectionType,
                id: metaData.id,
                xmlFile: path.basename(queryResult.name, ".xml"),
            });
            isasForConnectionByIndex.push(isaTypes);
        }));
    })
        .then(function () {
        return Q.all(getISAsForConnectionTypePromises);
    }).then(function () {
        return { connections: connections, isasForConnectionByIndex: isasForConnectionByIndex };
    });
}
function getConnectionTypesForDevice(neededIsaTypes, isasForConnectionByIndex) {
    var numNeededIsa = neededIsaTypes.length;
    var matchingConnectionIndices = [];
    _.each(isasForConnectionByIndex, function (isasSupported, index) {
        var numFoundISAs = _.intersection(isasSupported, neededIsaTypes).length;
        if (numNeededIsa === numFoundISAs) {
            matchingConnectionIndices.push(index);
        }
    });
    return matchingConnectionIndices;
}
function getNeededISAsForDevice(version, devicesPrefix, boardsPrefix, connections, isasForConnectionByIndex) {
    var queryForPrefix = function (prefix) {
        var invalidDevices = [];
        var devices = [];
        return dinfra_common_1.dinfra.queryResources()
            .withNamePrefix(prefix)
            .withVersion(version)
            .withFieldValue("neededIsaTypes")
            .invoke()
            .progress(function (queryResult) {
            var connectionIndices = getConnectionTypesForDevice(queryResult.meta.TICloudAgent.neededIsaTypes, isasForConnectionByIndex);
            if (_.isEmpty(connectionIndices)) {
                invalidDevices.push(queryResult.name);
            }
            var device = {
                id: meta.getMeta(queryResult).id,
                description: meta.getMeta(queryResult).description,
                xmlFile: path.basename(queryResult.name, ".xml"),
                connectionIndices: connectionIndices,
            };
            var properties = queryResult.meta.TICloudAgent.properties;
            if (properties && properties.DefaultConnection) {
                device.defaultConnectionIndex = _.findIndex(connections, {
                    xmlFile: path.basename(properties.DefaultConnection.Value, ".xml"),
                });
            }
            devices.push(device);
        }).then(function () {
            // Should be 'as const', but old typescript doesn't support it
            return [devices, invalidDevices];
        });
    };
    return Q.all([queryForPrefix(devicesPrefix), queryForPrefix(boardsPrefix)])
        .then(function (_a) {
        var _b = _a[0], devices = _b[0], invalidDevices = _b[1], _c = _a[1], boards = _c[0], invalidBoards = _c[1];
        var invalid = _.concat(invalidDevices, invalidBoards);
        if (_.isEmpty(invalid)) {
            return { devices: devices, boards: boards, connections: connections };
        }
        else {
            throw new Error("The following device or board xml files can never be used: " + invalid.join(","));
        }
    });
}
function generateTargetSetupInfo(version, os) {
    var prefix = resources.getPrefix(os);
    var boardsPrefix = prefix + "ccs_base/common/targetdb/boards";
    var connectionsPrefix = prefix + "ccs_base/common/targetdb/connections/";
    var devicesPrefix = prefix + "ccs_base/common/targetdb/devices";
    var driversPrefix = prefix + "ccs_base/common/targetdb/drivers";
    return getISAsForConnectionType(version, connectionsPrefix, driversPrefix)
        .then(function (result) {
        return getNeededISAsForDevice(version, devicesPrefix, boardsPrefix, result.connections, result.isasForConnectionByIndex);
    });
}
module.exports = generateTargetSetupInfo;
