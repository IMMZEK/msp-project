"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var fs = require("fs");
var path = require("path");
var Q = require("q");
var _ = require("lodash");
var xml2js = require("xml2js");
var generateErrorHandler = require("../common/generate_error_handler");
var dinfraCommon = require("../common/dinfra_common");
var dinfra_common_1 = require("../common/dinfra_common");
var resources = require("../common/resources");
var meta = require("../common/meta");
var readIntoString = require("../common/read_to_string");
// Create CCXML from template
// Data Model :
// let data = {
// 	connection : {
// 		id : "My Connection",
// 		xmlFileName : "My Conneciton.xml"
// 	},
// 	device : {
// 		id : "My Device" ,
// 		xmlFileName : "My Device.xml"
// 	},
// 	driverInstances :
// 		[
// 			"driver1.xml",
// 			"driver2.xml"
// 		]
// overridesXML : <override properties xml>
// };
var tmplString = fs.readFileSync(path.join(__dirname, "ccxml.tmpl"), "utf8");
var compiledCCXMLTemplate = _.template(tmplString);
var builder = new xml2js.Builder({ headless: true });
function getConnectionInfo(version, resourcePath) {
    return dinfraCommon.getResource(version, resourcePath, true)
        .then(function (result) {
        return {
            id: result.meta.id,
            xmlFileName: path.basename(resourcePath),
            connectionType: result.meta.connectionType,
            properties: result.meta.properties,
            configurables: result.meta.configurables,
            content: result.content,
        };
    });
}
function getDefaultProperties(version, connectionResourcePath, deviceResourcePath) {
    var connectionDefaultPropsPath = connectionResourcePath.substring(0, connectionResourcePath.lastIndexOf("/") + 1) + "defaultProperties.dat";
    return getConnectionInfo(version, connectionDefaultPropsPath)
        .then(function (connectionDefaultProps) {
        return {
            connections: connectionDefaultProps,
            routers: null,
            cpus: null,
            _: { version: version, connectionResourcePath: connectionResourcePath, deviceResourcePath: deviceResourcePath },
        };
    });
}
function getDeviceInfo(version, resourcePath) {
    return dinfraCommon.getResource(version, resourcePath, true)
        .then(function (result) {
        return {
            id: result.meta.id,
            xmlFileName: path.basename(resourcePath),
            neededIsaTypes: result.meta.neededIsaTypes,
            overriddenConnectionProperties: result.meta.overriddenConnectionProperties,
            content: result.content,
        };
    });
}
function findDrivers(version, prefix, deviceInfo, connectionInfo) {
    var neededDrivers = [];
    var findDriversPromises = _.map(deviceInfo.neededIsaTypes, function (isaType) {
        return dinfra_common_1.dinfra.queryResources()
            .withNamePrefix(prefix)
            .withVersion(version)
            .withFieldValue("connectionTypes", connectionInfo.connectionType)
            .withFieldValue("isaTypes", isaType)
            .invoke()
            .progress(function (queryResult) {
            neededDrivers.push(path.basename(queryResult.name));
        });
    });
    // we just need the distinct drivers, the same driver may support multiple isas
    return Q.all(findDriversPromises).then(function () {
        return _.uniq(neededDrivers);
    });
}
function mergeChoices(origChoices, overrideChoices) {
    _.each(overrideChoices, function (override) {
        _.each(origChoices, function (config) {
            var overrideId = override.$.id ? override.$.id : override.$.Name;
            var configId = config.$.id ? config.$.id : config.$.Name;
            if (overrideId === configId) {
                if (override.property) {
                    mergeProperties(config.property, override.property);
                }
                _.merge(config.$, override.$);
            }
        });
    });
}
function mergeProperties(origProps, overrideProps) {
    _.each(overrideProps, function (override) {
        _.each(origProps, function (config) {
            var overrideId = override.$.id ? override.$.id : override.$.Name;
            var configId = config.$.id ? config.$.id : config.$.Name;
            if (overrideId === configId) {
                mergeProperty(config, override);
            }
        });
    });
}
function mergeProperty(orig, override) {
    if (override.choice && override.choice.length > 0) {
        mergeChoices(orig.choice, override.choice);
    }
    _.merge(orig.$, override.$);
}
function mergeOverrides(originalConfigs, overrideConfigs) {
    _.each(overrideConfigs, function (override) {
        _.each(originalConfigs, function (config) {
            var overrideId = override.property.$.id ? override.property.$.id : override.property.$.Name;
            var configId = config.property.$.id ? config.property.$.id : config.property.$.Name;
            if (overrideId === configId) {
                mergeProperty(config.property, override.property);
            }
        });
    });
}
function removeUnchangedProperties(overriddenProperties, origProperties) {
    if (overriddenProperties && overriddenProperties.length > 0) {
        _.remove(overriddenProperties, function (overridden) {
            return _.find(origProperties, function (orig) {
                var overrideId = overridden.$.id ? overridden.$.id : overridden.$.Name;
                var configId = orig.$.id ? orig.$.id : orig.$.Name;
                if (overrideId === configId) {
                    var ret = _.isEqual(orig, overridden);
                    // go in depth when it is not identical
                    if (!ret) {
                        removeUnchangedChoices(overridden.choice, orig.choice);
                    }
                    return ret;
                }
                return false;
            });
        });
    }
}
function removeUnchangedChoices(overriddenChoices, origChoices) {
    if (overriddenChoices && overriddenChoices.length > 0) {
        _.remove(overriddenChoices, function (overridden) {
            return _.find(origChoices, function (orig) {
                var overrideId = overridden.$.id ? overridden.$.id : overridden.$.Name;
                var configId = orig.$.id ? orig.$.id : orig.$.Name;
                if (overrideId === configId) {
                    var ret = _.isEqual(orig, overridden);
                    // go in depth when it is not identical
                    if (!ret) {
                        removeUnchangedProperties(overridden.property, orig.property);
                    }
                    return ret;
                }
                return false;
            });
        });
    }
}
function removeUnchangedNodes(curConfigurables, origConfigurables) {
    // remove unchanged config sections to make ccxml smaller
    _.remove(curConfigurables, function (overridden) {
        return _.find(origConfigurables, function (orig) {
            return _.isEqual(orig, overridden);
        });
    });
    _.each(curConfigurables, function (overridden) {
        var origConfig = _.find(origConfigurables, function (orig) {
            var overrideId = overridden.property.$.id ? overridden.property.$.id : overridden.property.$.Name;
            var configId = orig.property.$.id ? orig.property.$.id : orig.property.$.Name;
            return overrideId === configId;
        });
        if (origConfig) {
            removeUnchangedChoices(overridden.property.choice, origConfig.property.choice);
        }
    });
}
function generateDefaultOverridesXML(deviceInfo, origConfigurables) {
    // avoid properties under <jtag> missing in ccxml file
    var shouldNotRemove = [];
    _.each(deviceInfo.overriddenConnectionProperties, function (configSection) {
        if (configSection.property) {
            shouldNotRemove.push(configSection.property.$.id);
        }
    });
    var curConfigurables = _.cloneDeep(origConfigurables);
    mergeOverrides(curConfigurables, deviceInfo.overriddenConnectionProperties);
    removeUnchangedNodes(curConfigurables, origConfigurables);
    var overridesXml = [];
    _.each(curConfigurables, function (configSection) {
        var remainingProp = removeHiddenProps(configSection.property, shouldNotRemove);
        if (remainingProp) {
            var finalRet = new meta.ConfigurablesNode(remainingProp);
            var configSectionXml = builder.buildObject(finalRet);
            overridesXml.push(configSectionXml);
        }
    });
    return overridesXml;
}
function createTemplateDataObj(neededDrivers, overridesXML, connectionInfo, deviceInfo) {
    return {
        connection: connectionInfo,
        device: deviceInfo,
        driverInstances: neededDrivers,
        overridesXML: overridesXML,
    };
}
// This function recursively removes all hidden property node without
// removing any of the "marked" should-not-remove node
// for example, avoid properties under <jtag> missing in ccxml file
// when generating override XML
function removeHiddenProps(curNode, shouldNotRemove) {
    if (curNode.$ && curNode.$.Type && curNode.$.Type === "hiddenfield") {
        if (!_.includes(shouldNotRemove, curNode.$.id)) {
            return null;
        }
    }
    else if (curNode.choice && curNode.choice.length > 0) {
        _.each(curNode.choice, function (choice) {
            if (choice.property) {
                var listOfNode = _.map(choice.property, function (n) {
                    return removeHiddenProps(n, shouldNotRemove);
                });
                listOfNode = _.filter(listOfNode, function (node) {
                    return (node) ? true : false;
                });
                if (listOfNode === null) {
                    delete choice.property;
                }
                else {
                    choice.property = listOfNode;
                }
            }
        });
    }
    curNode = massageAttrIntoCcxmlCompatible(curNode);
    // returns modified self
    return curNode;
}
// This function is for making all nodes compatiable without removing any hiddenproperty node:
//  removing node that does not have any preperty, 
// and if node.$.ID exists, remove node.$.Name, meanwhile
// we should use the "Name" property as "id" if "id" isn't there
// Otherwise it will violates ccs rule: "Property node is not allowed to have 'Name' attribute"
function massageAttrIntoCcxmlCompatibleRecursively(curNode) {
    if (curNode.choice && curNode.choice.length > 0) {
        _.each(curNode.choice, function (choice) {
            if (choice.property) {
                var listOfNode = _.map(choice.property, function (n) {
                    return massageAttrIntoCcxmlCompatibleRecursively(n);
                });
                listOfNode = _.filter(listOfNode, function (node) {
                    return (node) ? true : false;
                });
                if (listOfNode === null) {
                    delete choice.property;
                }
                else {
                    choice.property = listOfNode;
                }
            }
        });
    }
    curNode = massageAttrIntoCcxmlCompatible(curNode);
    // returns modified self
    return curNode;
}
function massageAttrIntoCcxmlCompatible(curNode) {
    // massage attr into ccxml compatible format
    if (curNode.$) {
        if (curNode.$.XML_version) {
            delete curNode.$.XML_version;
        }
        if (curNode.$.ID) {
            delete curNode.$.ID;
        }
        if (curNode.$.id && (typeof curNode.$.Name !== "undefined")) {
            delete curNode.$.Name;
        }
        else if (!curNode.$.id && (typeof curNode.$.Name !== "undefined")) {
            curNode.$.id = curNode.$.Name;
            delete curNode.$.Name;
        }
    }
    return curNode;
}
function createCCXML(connectionXMLFile, deviceXMLFile, os, configurablesInfo) {
    var prefix = resources.getPrefix(os);
    var connectionResourcePath = prefix + "ccs_base/common/targetdb/connections/" + connectionXMLFile + ".xml";
    var deviceResourcePath = prefix + "ccs_base/common/targetdb/devices/" + deviceXMLFile + ".xml";
    var driversPrefix = prefix + "ccs_base/common/targetdb/drivers/";
    return resources.version.getCurrent().then(function (version) {
        return Q.all([
            getDeviceInfo(version, deviceResourcePath),
            getConnectionInfo(version, connectionResourcePath),
            getDefaultProperties(version, connectionResourcePath, deviceResourcePath)
        ])
            .spread(function (deviceInfo, connectionInfo, defaultProps) {
            var connectionConfigurables = constructConnectionConfigurables(deviceInfo, connectionInfo, defaultProps);
            var overridesXml = [];
            if (configurablesInfo && configurablesInfo.connections) {
                if (configurablesInfo.connections[0] &&
                    configurablesInfo.connections[0].configurables
                    && configurablesInfo.connections[0].configurables.length > 0) {
                    // TODO:only 1 connection for now:
                    var curConfigurables = configurablesInfo.connections[0].configurables;
                    removeUnchangedNodes(curConfigurables, connectionConfigurables.defaultConfigurables);
                    _.each(curConfigurables, function (configSection) {
                        var compatibleProp = massageAttrIntoCcxmlCompatibleRecursively(configSection.property);
                        if (compatibleProp) {
                            var finalRet = new meta.ConfigurablesNode(compatibleProp);
                            var configSectionXml = builder.buildObject(finalRet);
                            overridesXml.push(configSectionXml);
                        }
                    });
                }
            }
            else {
                overridesXml = generateDefaultOverridesXML(deviceInfo, connectionConfigurables.defaultConfigurables);
            }
            return [
                findDrivers(version, driversPrefix, deviceInfo, connectionInfo),
                overridesXml,
                connectionInfo,
                deviceInfo,
            ];
        })
            .spread(createTemplateDataObj)
            .then(compiledCCXMLTemplate);
    });
}
function generateConfig(connectionXMLFile, deviceXMLFile, os, res) {
    return generateConfigAdvancedImpl(connectionXMLFile, deviceXMLFile, os, null, res);
}
function generateConfigAdvanced(params, req, res) {
    return readIntoString(req)
        .then(function (jsonData) {
        return generateConfigAdvancedImpl(params.connectionID, params.deviceID, params.os, jsonData, res);
    })
        .catch(generateErrorHandler(res));
}
function generateConfigAdvancedImpl(connectionXMLFile, deviceXMLFile, os, configurablesJson, res) {
    var configurablesObjs = JSON.parse(configurablesJson);
    return createCCXML(connectionXMLFile, deviceXMLFile, os, configurablesObjs)
        .then(function (ccxmlString) {
        // If this is a http response, write back a success code and headers
        if (res.writeHead) {
            res.writeHead(200, {
                "content-type": "application/xml",
                "content-disposition": "attachment; filename=target.ccxml",
            });
        }
        // Write the ccxml data back
        res.end(ccxmlString);
    })
        .catch(generateErrorHandler(res))
        .done();
}
// pod structs for the configurables
// main obj that includes everything
var ConfigurablesInfo = (function () {
    function ConfigurablesInfo() {
        this.connections = [];
    }
    return ConfigurablesInfo;
}());
// base obj
var Configurables = (function () {
    function Configurables(ID) {
        this.id = ID;
        this.configurables = [];
        this.overrides = [];
    }
    return Configurables;
}());
var ConnectionConfigurable = (function (_super) {
    __extends(ConnectionConfigurable, _super);
    function ConnectionConfigurable(ID) {
        var _this = _super.call(this, ID) || this;
        _this.devices = [];
        return _this;
    }
    return ConnectionConfigurable;
}(Configurables));
var DeviceConfigurable = (function (_super) {
    __extends(DeviceConfigurable, _super);
    function DeviceConfigurable(ID) {
        var _this = _super.call(this, ID) || this;
        _this.routers = [];
        return _this;
    }
    return DeviceConfigurable;
}(Configurables));
var RouterConfigurables = (function (_super) {
    __extends(RouterConfigurables, _super);
    function RouterConfigurables(ID) {
        var _this = _super.call(this, ID) || this;
        _this.subpaths = [];
        return _this;
    }
    return RouterConfigurables;
}(Configurables));
var SubPathConfigurables = (function (_super) {
    __extends(SubPathConfigurables, _super);
    function SubPathConfigurables(ID) {
        var _this = _super.call(this, ID) || this;
        _this.cpus = [];
        return _this;
    }
    return SubPathConfigurables;
}(Configurables));
function constructConnectionConfigurables(deviceInfo, connectionInfo, defaultProps) {
    var defaultPropsConfigs = (defaultProps.connections.configurables) ?
        _.cloneDeep(defaultProps.connections.configurables) : [];
    var connectionConfigurables = (connectionInfo.configurables) ? _.cloneDeep(connectionInfo.configurables) : [];
    var deviceXMLOverrides = deviceInfo.overriddenConnectionProperties;
    var connConfig = new ConnectionConfigurable(connectionInfo.id);
    // override prop in the connection xml to override the prop defined in connections/defaultProperties.dat
    var defaultConnectionOverrideProp = _.remove(connectionConfigurables, function (config) {
        var curProp = config.property;
        return (curProp && curProp.$ && curProp.$.id && curProp.$.id === "dataFileRequired");
    });
    connConfig.defaultConfigurables = defaultPropsConfigs;
    connConfig.defaultConfigurables = connConfig.defaultConfigurables.concat(connectionConfigurables);
    // getting the defaultProperties.dat override from properties field
    // const defaultConnectionOverrideProp = _.find(connectionConfigurables, (prop: meta.ConfigurablesNode) => {
    // 	const p = prop.property;
    // 	return (p && p.$ && p.$.id && p.$.id === "dataFileRequired");
    // });
    if (defaultConnectionOverrideProp && defaultConnectionOverrideProp.length > 0) {
        connConfig.overrides = connConfig.overrides.concat(defaultConnectionOverrideProp);
    }
    _.each(deviceXMLOverrides, function (override) {
        connConfig.overrides.push(override);
    });
    connConfig.configurables = _.cloneDeep(connConfig.defaultConfigurables);
    mergeOverrides(connConfig.configurables, connConfig.overrides);
    return connConfig;
}
function generateConfigurables(connectionXMLFile, deviceXMLFile, os, res) {
    var prefix = resources.getPrefix(os);
    var connectionResourcePath = prefix + "ccs_base/common/targetdb/connections/" + connectionXMLFile + ".xml";
    var deviceResourcePath = prefix + "ccs_base/common/targetdb/devices/" + deviceXMLFile + ".xml";
    return resources.version.getCurrent().then(function (version) {
        return Q.all([
            getDeviceInfo(version, deviceResourcePath),
            getConnectionInfo(version, connectionResourcePath),
            getDefaultProperties(version, connectionResourcePath, deviceResourcePath),
        ])
            .spread(function (deviceInfo, connectionInfo, defaultProps) {
            var ret = new ConfigurablesInfo();
            // only do 1 connection for now
            var connConfig = constructConnectionConfigurables(deviceInfo, connectionInfo, defaultProps);
            ret.connections.push(connConfig);
            // let ret = defaultProps.connections.configurables.concat( connectionInfo.configurables );
            return JSON.stringify(ret);
        });
    })
        .then(function (data) {
        // If this is a http response, write back a success code and headers
        if (res.writeHead) {
            res.writeHead(200, {
                "content-type": "application/text",
            });
        }
        // Write the ccxml data back
        res.end(data);
    })
        .catch(generateErrorHandler(res))
        .done();
}
module.exports = {
    default: generateConfig,
    advanced: generateConfigAdvanced,
    getConfigurables: generateConfigurables,
    generateDefaultOverridesXML: generateDefaultOverridesXML,
};
